import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createJobPricing,
  getJobCardById,
  getJobPricingByJobCard,
  listJobItems,
  updateJobCard,
  updateJobPricing,
} from "../db";
import { adminProcedure, managerProcedure, technicianProcedure, emitNotification } from "./middleware";
import { router } from "../_core/trpc";

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
        vatPct: z.number().min(0).max(100).default(15),
        currency: z.string().length(3).default("ZAR"),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const job = await getJobCardById(input.jobCardId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job card not found" });

      if (!["completed", "awaiting_pricing"].includes(job.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Pricing can only be created for completed or awaiting-pricing jobs",
        });
      }

      // Check no pricing exists yet
      const existing = await getJobPricingByJobCard(input.jobCardId);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Pricing already exists for this job card. Use update instead." });
      }

      // Auto-calculate parts cost from job items if not provided
      let partsCost = input.partsCost;
      if (partsCost === undefined) {
        const items = await listJobItems(input.jobCardId);
        partsCost = items
          .filter((i) => i.type === "part")
          .reduce((sum, i) => sum + Number(i.lineTotal), 0);
      }

      const { subtotal, vatAmount, total } = computeTotals(
        input.labourCost,
        partsCost,
        input.additionalFees,
        input.discountAmount,
        input.vatPct
      );

      const id = await createJobPricing({
        jobCardId: input.jobCardId,
        labourCost: String(input.labourCost),
        partsCost: String(partsCost),
        additionalFees: String(input.additionalFees),
        discountAmount: String(input.discountAmount),
        subtotal,
        vatPct: String(input.vatPct),
        vatAmount,
        total,
        currency: input.currency,
        status: "draft",
        notes: input.notes ?? null,
        createdById: ctx.user.id,
      });

      return { id, subtotal, vatAmount, total };
    }),

  /** Update an existing pricing record (only in draft/pending_approval status) */
  update: managerProcedure
    .input(
      z.object({
        jobCardId: z.number().int().positive(),
        labourCost: z.number().nonnegative().optional(),
        partsCost: z.number().nonnegative().optional(),
        additionalFees: z.number().nonnegative().optional(),
        discountAmount: z.number().nonnegative().optional(),
        vatPct: z.number().min(0).max(100).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const pricing = await getJobPricingByJobCard(input.jobCardId);
      if (!pricing) throw new TRPCError({ code: "NOT_FOUND", message: "No pricing found for this job card" });

      if (["approved", "invoiced"].includes(pricing.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot update an approved or invoiced pricing record" });
      }

      const labour = input.labourCost ?? Number(pricing.labourCost);
      const parts = input.partsCost ?? Number(pricing.partsCost);
      const fees = input.additionalFees ?? Number(pricing.additionalFees);
      const discount = input.discountAmount ?? Number(pricing.discountAmount);
      const vat = input.vatPct ?? Number(pricing.vatPct);

      const { subtotal, vatAmount, total } = computeTotals(labour, parts, fees, discount, vat);

      await updateJobPricing(pricing.id, {
        labourCost: String(labour),
        partsCost: String(parts),
        additionalFees: String(fees),
        discountAmount: String(discount),
        vatPct: String(vat),
        subtotal,
        vatAmount,
        total,
        notes: input.notes,
      });

      return { success: true, subtotal, vatAmount, total };
    }),

  /** Submit pricing for approval */
  submitForApproval: managerProcedure
    .input(z.object({ jobCardId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const pricing = await getJobPricingByJobCard(input.jobCardId);
      if (!pricing) throw new TRPCError({ code: "NOT_FOUND", message: "No pricing found" });
      if (pricing.status !== "draft") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only draft pricing can be submitted for approval" });
      }

      await updateJobPricing(pricing.id, { status: "pending_approval" });

      const job = await getJobCardById(input.jobCardId);
      await emitNotification({
        type: "job_awaiting_pricing",
        title: "Pricing Submitted for Approval",
        message: `Pricing for job card ${job?.jobNumber ?? input.jobCardId} has been submitted for approval. Total: ${pricing.currency} ${pricing.total}.`,
        entityType: "job_card",
        entityId: input.jobCardId,
        notifyOwnerPush: true,
      });

      return { success: true };
    }),

  /** Approve pricing (admin or manager) */
  approve: managerProcedure
    .input(z.object({ jobCardId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const pricing = await getJobPricingByJobCard(input.jobCardId);
      if (!pricing) throw new TRPCError({ code: "NOT_FOUND", message: "No pricing found" });
      if (pricing.status !== "pending_approval") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only pending-approval pricing can be approved" });
      }

      await updateJobPricing(pricing.id, {
        status: "approved",
        approvedById: ctx.user.id,
        approvedAt: new Date(),
      });

      // Transition job card to priced
      await updateJobCard(input.jobCardId, { status: "priced" });

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
});
