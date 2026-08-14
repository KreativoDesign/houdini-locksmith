import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createSignature,
  deleteSignatureByJobCard,
  getClientById,
  getJobCardById,
  getSignatureByJobCard,
  updateJobCard,
} from "../db";
import { managerProcedure, technicianProcedure, emitNotification } from "./middleware";
import { router } from "../_core/trpc";
import { storagePut } from "../storage";
import { sendSignatureConfirmationEmail } from "../_core/email";

const MAX_SIGNATURE_SIZE = 2 * 1024 * 1024;
const MAX_SIGNATURE_DATA_URL_LENGTH = 3 * 1024 * 1024;

/** Convert a base64 data URL to a Buffer */
function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; mimeType: string } {
  const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("Invalid data URL format");
  }
  return {
    mimeType: matches[1]!,
    buffer: Buffer.from(matches[2]!, "base64"),
  };
}

export const signaturesRouter = router({
  /** Get the signature for a job card */
  getByJobCard: technicianProcedure
    .input(z.object({ jobCardId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return getSignatureByJobCard(input.jobCardId);
    }),

  /**
   * Capture and store a digital signature for a job card.
   * Accepts a base64-encoded PNG data URL from the frontend canvas.
   * Uploads to S3 under jobs/{jobCardId}/signatures/ and marks the job as signed.
   */
  capture: technicianProcedure
    .input(
      z.object({
        jobCardId: z.number().int().positive(),
        /** Base64 data URL, e.g. "data:image/png;base64,iVBOR..." */
        signatureDataUrl: z.string().min(10).max(MAX_SIGNATURE_DATA_URL_LENGTH),
        signerName: z.string().min(1).max(200),
        signerRole: z.string().max(100).optional(),
        ipAddress: z.string().max(45).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const job = await getJobCardById(input.jobCardId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job card not found" });

      // Only the assigned technician, manager, or admin can capture a signature
      if (ctx.user.role === "technician" && job.assignedTechnicianId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not assigned to this job" });
      }

      if (["priced", "cancelled"].includes(job.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot add signature to a closed job" });
      }

      // Check for existing signature
      const existing = await getSignatureByJobCard(input.jobCardId);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "A signature already exists for this job card" });
      }

      // Upload to S3
      let signatureUrl: string;
      let signatureKey: string;
      try {
        const { buffer, mimeType: detectedMimeType } = dataUrlToBuffer(input.signatureDataUrl);
        const mimeType = detectedMimeType.toLowerCase().split(";")[0] ?? "";
        if (mimeType !== "image/png" || buffer.length > MAX_SIGNATURE_SIZE) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Signature must be a PNG image no larger than 2 MB.",
          });
        }
        const timestamp = Date.now();
        signatureKey = `jobs/${input.jobCardId}/signatures/sig-${timestamp}.png`;
        const result = await storagePut(signatureKey, buffer, mimeType);
        signatureUrl = result.url;
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upload signature: " + (err instanceof Error ? err.message : "Unknown error"),
        });
      }

      const signedAt = new Date();

      // Save signature record
      const id = await createSignature({
        jobCardId: input.jobCardId,
        signatureUrl,
        signatureKey,
        signerName: input.signerName,
        signerRole: input.signerRole ?? null,
        ipAddress: input.ipAddress ?? null,
        capturedById: ctx.user.id,
        signedAt,
      });

      // Mark job card as signed
      await updateJobCard(input.jobCardId, { isSigned: true });

      await emitNotification({
        type: "signature_captured",
        title: "Signature Captured",
        message: `Signature captured for job card ${job.jobNumber} by ${input.signerName}.`,
        entityType: "job_card",
        entityId: input.jobCardId,
      });

      // ── Send confirmation email to client (non-fatal) ──────────────────────
      try {
        const client = job.clientId ? await getClientById(job.clientId) : null;
        if (client?.email) {
          const clientName = `${client.firstName} ${client.lastName}`.trim();
          await sendSignatureConfirmationEmail({
            to: client.email,
            clientName,
            jobNumber: job.jobNumber,
            jobTitle: job.title,
            signerName: input.signerName,
            signerRole: input.signerRole ?? null,
            signedAt,
            signatureUrl,
            technicianName: ctx.user.name ?? "Houdini Technician",
          });
        } else {
          console.warn(
            `[Signatures] Client for job ${job.jobNumber} has no email — confirmation email skipped.`
          );
        }
      } catch (emailErr) {
        // Never let an email failure roll back the signature capture
        console.warn("[Signatures] Failed to send confirmation email:", emailErr);
      }

      return { id, signatureUrl };
    }),

  /**
   * Replace an existing signature (admin/manager only).
   * Deletes the old record, uploads the new signature, and re-marks the job as signed.
   */
  replace: managerProcedure
    .input(
      z.object({
        jobCardId: z.number().int().positive(),
        signatureDataUrl: z.string().min(10).max(MAX_SIGNATURE_DATA_URL_LENGTH),
        signerName: z.string().min(1).max(200),
        signerRole: z.string().max(100).optional(),
        ipAddress: z.string().max(45).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const job = await getJobCardById(input.jobCardId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job card not found" });
      if (["priced", "cancelled"].includes(job.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot replace signature on a closed job" });
      }

      // Delete existing signature record
      await deleteSignatureByJobCard(input.jobCardId);

      // Upload new signature to S3
      let signatureUrl: string;
      let signatureKey: string;
      try {
        const { buffer, mimeType: detectedMimeType } = dataUrlToBuffer(input.signatureDataUrl);
        const mimeType = detectedMimeType.toLowerCase().split(";")[0] ?? "";
        if (mimeType !== "image/png" || buffer.length > MAX_SIGNATURE_SIZE) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Signature must be a PNG image no larger than 2 MB.",
          });
        }
        const timestamp = Date.now();
        signatureKey = `jobs/${input.jobCardId}/signatures/sig-${timestamp}.png`;
        const result = await storagePut(signatureKey, buffer, mimeType);
        signatureUrl = result.url;
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upload replacement signature: " + (err instanceof Error ? err.message : "Unknown error"),
        });
      }

      const signedAt = new Date();

      const id = await createSignature({
        jobCardId: input.jobCardId,
        signatureUrl,
        signatureKey,
        signerName: input.signerName,
        signerRole: input.signerRole ?? null,
        ipAddress: input.ipAddress ?? null,
        capturedById: ctx.user.id,
        signedAt,
      });

      await updateJobCard(input.jobCardId, { isSigned: true });

      await emitNotification({
        type: "signature_captured",
        title: "Signature Replaced",
        message: `Signature replaced for job card ${job.jobNumber} by ${input.signerName} (${ctx.user.name ?? ctx.user.email}).`,
        entityType: "job_card",
        entityId: input.jobCardId,
      });

      return { id, signatureUrl };
    }),
});
