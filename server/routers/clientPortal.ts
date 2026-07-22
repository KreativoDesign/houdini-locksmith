import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
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
import { sendClientPortalEmail } from "../_core/email";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert expiryDays (number | null) to a Date or null */
function calcExpiresAt(expiryDays: number | null): Date | null {
  if (!expiryDays) return null;
  const d = new Date();
  d.setDate(d.getDate() + expiryDays);
  return d;
}

/** Format a Date to a human-readable label, e.g. "30 Apr 2026" */
function formatExpiryLabel(d: Date): string {
  return d.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Johannesburg",
  });
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Received",
  assigned: "Technician Assigned",
  in_progress: "In Progress",
  completed: "Work Completed",
  invoiced: "Invoice Sent",
  closed: "Closed",
};

// ─── Router ───────────────────────────────────────────────────────────────────

export const clientPortalRouter = router({
  /**
   * Generate (or refresh) a shareable client portal link for a job card.
   * Protected — only managers and admins can generate links.
   * Automatically emails the client if they have an email address on file.
   */
  generateLink: managerProcedure
    .input(
      z.object({
        jobCardId: z.number().int().positive(),
        /** Pass window.location.origin so we can return a full URL */
        origin: z.string().url().optional(),
        /**
         * Optional expiry in days. null / undefined = never expires.
         * Accepted values: 7, 14, 30, or null.
         */
        expiryDays: z.number().int().positive().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const job = await getJobCardById(input.jobCardId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job card not found" });

      const expiresAt = calcExpiresAt(input.expiryDays ?? null);
      const tokenRecord = await getClientPortalTokenByJobCard(input.jobCardId);
      
      // Generate a new token if one doesn't exist
      let token = tokenRecord?.token;
      if (!token) {
        // Generate a 64-character hex token
        token = randomBytes(32).toString('hex');
      }
      
      // Save/update the token in the database
      await upsertClientPortalToken({
        jobCardId: input.jobCardId,
        token,
        expiresAt,
      });
      
      const path = `/portal/${token}`;
      const url = input.origin ? `${input.origin}${path}` : path;

      // Auto-email the client if they have an email address
      let emailSent = false;
      if (job.clientId) {
        const client = await getClientById(job.clientId);
        if (client?.email) {
          const expiresLabel = expiresAt ? formatExpiryLabel(expiresAt) : undefined;
          emailSent = await sendClientPortalEmail({
            to: client.email,
            clientFirstName: client.firstName,
            jobNumber: job.jobNumber ?? "N/A",
            jobTitle: job.description ?? "Locksmith service",
            portalUrl: url,
            expiresLabel,
          });
        }
      }

      return {
        token,
        url,
        expiresAt,
        emailSent,
      };
    }),

  /**
   * Get the existing portal token for a job card (without regenerating).
   * Protected — managers and admins only.
   */
  getLink: managerProcedure
    .input(z.object({ jobCardId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const row = await getClientPortalTokenByJobCard(input.jobCardId);
      return row ? { token: row.token, expiresAt: row.expiresAt } : null;
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
        /** Token expiry — null means the link never expires */
        expiresAt: portalToken.expiresAt,
        /** Job card ID needed by the client for PDF download */
        jobCardId: job.id,
      };
    }),

  /**
   * Get a quote by public token (public access)
   */
  getQuoteByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const { getQuoteTokenByToken, getQuoteById, getQuoteItemsByQuoteId } = await import("../db");
      
      const quoteToken = await getQuoteTokenByToken(input.token);
      if (!quoteToken) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "This quote link is invalid or has expired.",
        });
      }

      const quote = await getQuoteById(quoteToken.quoteId);
      if (!quote) throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found" });

      const items = await getQuoteItemsByQuoteId(quote.id);

      return { quote, items };
    }),

  /**
   * Accept a quote (public access)
   */
  acceptQuote: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const { getQuoteTokenByToken, getQuoteById, updateQuote } = await import("../db");
      
      const quoteToken = await getQuoteTokenByToken(input.token);
      if (!quoteToken) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "This quote link is invalid or has expired.",
        });
      }

      const quote = await getQuoteById(quoteToken.quoteId);
      if (!quote) throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found" });

      if (quote.status === "accepted") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Quote already accepted" });
      }

      if (quote.status === "rejected") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Quote has been rejected" });
      }

      await updateQuote(quote.id, {
        status: "accepted",
        acceptedAt: new Date(),
      });

      return { success: true };
    }),

  /**
   * Reject a quote (public access)
   */
  rejectQuote: publicProcedure
    .input(z.object({ token: z.string(), reason: z.string().optional() }))
    .mutation(async ({ input }) => {
      const { getQuoteTokenByToken, getQuoteById, updateQuote } = await import("../db");
      
      const quoteToken = await getQuoteTokenByToken(input.token);
      if (!quoteToken) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "This quote link is invalid or has expired.",
        });
      }

      const quote = await getQuoteById(quoteToken.quoteId);
      if (!quote) throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found" });

      if (quote.status === "accepted") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Quote already accepted" });
      }

      if (quote.status === "rejected") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Quote already rejected" });
      }

      await updateQuote(quote.id, {
        status: "rejected",
        rejectedAt: new Date(),
        rejectionReason: input.reason || null,
      });

      return { success: true };
    }),
});
