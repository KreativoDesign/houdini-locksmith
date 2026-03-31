import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  getClientById,
  getClientPortalToken,
  getClientPortalTokenByJobCard,
  getJobCardById,
  getSignatureByJobCard,
  listJobDocuments,
  listJobItems,
  getJobPricingByJobCard,
  getUserById,
  getSlotById,
  upsertClientPortalToken,
} from "../db";
import { managerProcedure } from "./middleware";
import { publicProcedure, router } from "../_core/trpc";

export const clientPortalRouter = router({
  /**
   * Generate (or refresh) a shareable client portal link for a job card.
   * Protected — only managers and admins can generate links.
   */
  generateLink: managerProcedure
    .input(
      z.object({
        jobCardId: z.number().int().positive(),
        /** Optional: pass window.location.origin so we can return a full URL */
        origin: z.string().url().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const job = await getJobCardById(input.jobCardId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job card not found" });
      const token = await upsertClientPortalToken(input.jobCardId);
      const path = `/portal/${token}`;
      const url = input.origin ? `${input.origin}${path}` : path;
      return { token, url };
    }),

  /**
   * Get the existing portal token for a job card (without regenerating).
   * Protected — managers and admins only.
   */
  getLink: managerProcedure
    .input(z.object({ jobCardId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const row = await getClientPortalTokenByJobCard(input.jobCardId);
      return row ? { token: row.token } : null;
    }),

  /**
   * Public procedure — returns read-only job status for the client portal.
   * Accessed via /portal/:token with no authentication required.
   */
  getJobStatus: publicProcedure
    .input(z.object({ token: z.string().length(64) }))
    .query(async ({ input }) => {
      const portalToken = await getClientPortalToken(input.token);
      if (!portalToken) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "This link is invalid or has expired.",
        });
      }

      const job = await getJobCardById(portalToken.jobCardId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      const [client, technician, signature, documents, items, pricing, slot] = await Promise.all([
        job.clientId ? getClientById(job.clientId) : Promise.resolve(undefined),
        job.assignedTechnicianId ? getUserById(job.assignedTechnicianId) : Promise.resolve(undefined),
        getSignatureByJobCard(job.id),
        listJobDocuments(job.id),
        listJobItems(job.id),
        getJobPricingByJobCard(job.id),
        job.scheduledTimeSlotId ? getSlotById(job.scheduledTimeSlotId) : Promise.resolve(undefined),
      ]);

      // Status timeline steps
      const STATUS_ORDER = [
        "pending",
        "assigned",
        "in_progress",
        "completed",
        "invoiced",
        "closed",
      ] as const;
      const currentStatusIndex = STATUS_ORDER.indexOf(job.status as typeof STATUS_ORDER[number]);

      return {
        jobNumber: job.jobNumber,
        status: job.status,
        description: job.description,
        priority: job.priority,
        scheduledDate: job.scheduledDate,
        scheduledSlot: slot
          ? {
              startTime: slot.startTime,
              endTime: slot.endTime,
              slotDate: slot.slotDate,
            }
          : null,
        client: client
          ? {
              firstName: client.firstName,
              lastName: client.lastName,
            }
          : null,
        technician: technician
          ? { name: technician.name }
          : null,
        signature: signature
          ? {
              signatureUrl: signature.signatureUrl,
              signerName: signature.signerName,
              capturedAt: signature.signedAt,
            }
          : null,
        // Only expose photo/document URLs (not internal notes)
        photos: documents
          .filter((d) => d.category === "photo" || d.category === "before_image" || d.category === "after_image")
          .map((d) => ({ url: d.fileUrl, category: d.category, fileName: d.fileName, uploadedAt: d.createdAt })),
        // Pricing summary (totals only, not line items)
        pricingSummary: pricing
          ? {
              subtotal: pricing.subtotal,
              vatAmount: pricing.vatAmount,
              total: pricing.total,
              currency: pricing.currency,
              status: pricing.status,
            }
          : null,
        // Job items (visible to client)
        items: items.map((i) => ({
          name: i.name,
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          type: i.type,
        })),
        statusTimeline: STATUS_ORDER.map((s, idx) => ({
          status: s,
          label: STATUS_LABELS[s],
          completed: idx <= currentStatusIndex,
          current: s === job.status,
        })),
        isSigned: job.isSigned,
        requiresSignature: job.requiresSignature,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      };
    }),
});

const STATUS_LABELS: Record<string, string> = {
  pending: "Received",
  assigned: "Technician Assigned",
  in_progress: "In Progress",
  completed: "Work Completed",
  invoiced: "Invoice Sent",
  closed: "Closed",
};
