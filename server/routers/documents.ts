import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createJobDocument,
  deleteJobDocument,
  getJobCardById,
  getJobDocumentById,
  listJobDocuments,
} from "../db";
import { managerProcedure, technicianProcedure } from "./middleware";
import { router } from "../_core/trpc";
import { storagePut } from "../storage";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_DATA_URL_LENGTH = 16 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

/** Convert a base64 data URL to Buffer */
function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; mimeType: string } {
  const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!matches || matches.length !== 3) throw new Error("Invalid data URL format");
  return { mimeType: matches[1]!, buffer: Buffer.from(matches[2]!, "base64") };
}

export const documentsRouter = router({
  /** List all documents for a job card, optionally filtered by category */
  list: technicianProcedure
    .input(
      z.object({
        jobCardId: z.number().int().positive(),
        category: z
          .enum(["photo", "document", "before_image", "after_image", "signature", "other"])
          .optional(),
      })
    )
    .query(async ({ input }) => {
      const docs = await listJobDocuments(input.jobCardId);
      if (input.category) {
        return docs.filter((d) => d.category === input.category);
      }
      return docs;
    }),

  /**
   * Upload a document or image for a job card.
   * Accepts a base64 data URL. Files are stored in S3 under:
   *   jobs/{jobCardId}/{category}/{timestamp}-{fileName}
   */
  upload: technicianProcedure
    .input(
      z.object({
        jobCardId: z.number().int().positive(),
        category: z
          .enum(["photo", "document", "before_image", "after_image", "signature", "other"])
          .default("photo"),
        fileName: z.string().trim().min(1).max(255),
        /** Base64 data URL */
        fileDataUrl: z.string().min(10).max(MAX_DATA_URL_LENGTH),
        description: z.string().trim().max(1000).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const job = await getJobCardById(input.jobCardId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job card not found" });

      if (ctx.user.role === "technician" && job.assignedTechnicianId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not assigned to this job" });
      }

      let fileUrl: string;
      let fileKey: string;
      let fileSize: number;
      let mimeType: string;

      try {
        const { buffer, mimeType: detectedMime } = dataUrlToBuffer(input.fileDataUrl);
        mimeType = detectedMime.toLowerCase().split(";")[0] ?? "";
        if (!ALLOWED_MIME_TYPES.has(mimeType)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Unsupported file type. Upload an image, PDF, or supported video file.",
          });
        }
        fileSize = buffer.length;

        if (fileSize > MAX_FILE_SIZE) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `File size ${(fileSize / 1024 / 1024).toFixed(1)} MB exceeds the 10 MB limit`,
          });
        }

        const timestamp = Date.now();
        const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        fileKey = `jobs/${input.jobCardId}/${input.category}/${timestamp}-${safeFileName}`;
        const result = await storagePut(fileKey, buffer, mimeType);
        fileUrl = result.url;
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upload file: " + (err instanceof Error ? err.message : "Unknown error"),
        });
      }

      const id = await createJobDocument({
        jobCardId: input.jobCardId,
        category: input.category,
        fileName: input.fileName,
        mimeType,
        fileSize,
        fileUrl,
        fileKey,
        description: input.description ?? null,
        uploadedById: ctx.user.id,
      });

      return { id, fileUrl, fileKey };
    }),

  /** Delete a document (manager or admin only, or the uploader) */
  delete: managerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const doc = await getJobDocumentById(input.id);
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });

      // Note: S3 object deletion is not performed here to preserve audit trail.
      // The fileKey is retained in the DB for manual cleanup if needed.
      await deleteJobDocument(input.id);
      return { success: true };
    }),
});
