import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createJobPricing,
  getJobCardById,
  getJobPricingByJobCard,
  getClientById,
  listJobItems,
  updateJobCard,
  updateJobPricing,
} from "../db";
import { adminProcedure, managerProcedure, technicianProcedure, emitNotification } from "./middleware";
import { router } from "../_core/trpc";
import { sendInvoiceEmail } from "../_core/email";

/** Compute pricing totals */
function computeTotals(
  labourCost: number,
  partsCost: number,
  additionalFees: number,
  discountAmount: number,
  vatPct: number
) {
  const subtotal = labourCost + partsCost + additionalFees - discountAmount;
  const vatAmount = subtotal * (vatPct / 100);
  const total = subtotal + vatAmount;
  return {
    subtotal: subtotal.toFixed(2),
    vatAmount: vatAmount.toFixed(2),
    total: total.toFixed(2),
  };
}

export const pricingRouter = router({
  /** Get pricing for a job card */
  getByJobCard: technicianProcedure
    .input(z.object({ jobCardId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return getJobPricingByJobCard(input.jobCardId);
    }),

  /**
   * Create a pricing record for a completed job.
   * Only available when job status is 'awaiting_pricing' or 'completed'.
   * Optionally auto-populates parts cost from job items.
   */
  create: managerProcedure
    .input(
      z.object({
        jobCardId: z.number().int().positive(),
        labourCost: z.number().nonnegative().default(0),
        partsCost: z.number().nonnegative().optional(), // if omitted, auto-calculated from job items
        additionalFees: z.number().nonnegative().default(0),
        discountAmount: z.number().nonnegative().default(0),
        discountReason: z.string().optional(),
        notes: z.string().optional(),
        vatPercentage: z.number().nonnegative().default(15),
        currency: z.string().default("ZAR"),
      })
    )
    .mutation(async ({ input }) => {
      const job = await getJobCardById(input.jobCardId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job card not found" });

      // Auto-calculate parts cost from job items if not provided
      let partsCost = input.partsCost ?? 0;
      if (input.partsCost === undefined) {
        const items = await listJobItems(input.jobCardId);
        partsCost = items.reduce((sum, item) => sum + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0), 0);
      }

      const { subtotal, vatAmount, total } = computeTotals(
        input.labourCost,
        partsCost,
        input.additionalFees,
        input.discountAmount,
        input.vatPercentage
      );

      const pricing = await createJobPricing({
        jobCardId: input.jobCardId,
        labourCost: input.labourCost.toString(),
        partsCost: partsCost.toString(),
        additionalFees: input.additionalFees.toString(),
        discountAmount: input.discountAmount.toString(),
        subtotal,
        vatPct: input.vatPercentage.toString(),
        vatAmount,
        total,
        currency: input.currency,
        status: "draft",
        notes: input.notes,
      });

      return pricing;
    }),

  /** Request approval for pricing */
  requestApproval: managerProcedure
    .input(z.object({ jobCardId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const pricing = await getJobPricingByJobCard(input.jobCardId);
      if (!pricing) throw new TRPCError({ code: "NOT_FOUND", message: "No pricing found" });
      if (pricing.status !== "draft") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only draft pricing can be submitted for approval" });
      }
      await updateJobPricing(pricing.id, { status: "pending_approval" });
      return { success: true };
    }),

  /** Approve pricing */
  approve: adminProcedure
    .input(
      z.object({
        jobCardId: z.number().int().positive(),
        approvalNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const pricing = await getJobPricingByJobCard(input.jobCardId);
      if (!pricing) throw new TRPCError({ code: "NOT_FOUND", message: "No pricing found" });
      if (pricing.status !== "pending_approval") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only pending_approval pricing can be approved" });
      }

      await updateJobPricing(pricing.id, { status: "approved" });

      const job = await getJobCardById(input.jobCardId);
      await emitNotification({
        type: "pricing_approved",
        title: "Job Pricing Approved",
        message: `Pricing for job card ${job?.jobNumber ?? input.jobCardId} has been approved. Total: ${pricing.currency} ${pricing.total}.`,
        entityType: "job_card",
        entityId: input.jobCardId,
        notifyOwnerPush: true,
      });

      return { success: true };
    }),

  /** Mark as invoiced */
  markInvoiced: adminProcedure
    .input(z.object({ jobCardId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const pricing = await getJobPricingByJobCard(input.jobCardId);
      if (!pricing) throw new TRPCError({ code: "NOT_FOUND", message: "No pricing found" });
      if (pricing.status !== "approved") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only approved pricing can be invoiced" });
      }
      await updateJobPricing(pricing.id, { status: "invoiced" });
      return { success: true };
    }),

  /** Generate and send invoice email to client */
  generateAndSendInvoice: managerProcedure
    .input(
      z.object({
        jobCardId: z.number().int().positive(),
        portalUrl: z.string().url(),
        paymentTerms: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const job = await getJobCardById(input.jobCardId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job card not found" });

      const pricing = await getJobPricingByJobCard(input.jobCardId);
      if (!pricing) throw new TRPCError({ code: "NOT_FOUND", message: "No pricing found for this job" });
      if (pricing.status !== "approved") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only approved pricing can be invoiced" });
      }

      const client = job.clientId ? await getClientById(job.clientId) : null;
      if (!client || !client.email) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Client email not found" });
      }

      const clientName = `${client.firstName} ${client.lastName}`.trim();
      const totalAmount = parseFloat(pricing.total as any);

      // Send invoice email
      const emailSent = await sendInvoiceEmail({
        to: client.email,
        clientName,
        jobNumber: job.jobNumber,
        jobTitle: job.title,
        totalAmount,
        portalUrl: input.portalUrl,
        invoiceDate: new Date(),
        paymentTerms: input.paymentTerms || "Due upon receipt",
      });

      if (!emailSent) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to send invoice email" });
      }

      // Mark as invoiced
      await updateJobPricing(pricing.id, { status: "invoiced" });

      // Emit notification
      await emitNotification({
        type: "pricing_approved",
        title: "Invoice Sent",
        message: `Invoice for job ${job.jobNumber} has been sent to ${client.email}. Total: ${pricing.currency} ${pricing.total}.`,
        entityType: "job_card",
        entityId: input.jobCardId,
        notifyOwnerPush: true,
      });

      return { success: true, emailSent: true };
    }),
});
