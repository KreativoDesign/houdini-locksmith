import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createJobItem,
  deleteJobItem,
  getJobCardById,
  getJobItemById,
  listJobItems,
  updateJobItem,
} from "../db";
import { managerProcedure, technicianProcedure } from "./middleware";
import { router } from "../_core/trpc";

/** Compute line total: qty * unitPrice * (1 - discountPct/100) */
function computeLineTotal(quantity: number, unitPrice: number, discountPct: number): string {
  const total = quantity * unitPrice * (1 - discountPct / 100);
  return total.toFixed(2);
}

export const jobItemsRouter = router({
  list: technicianProcedure
    .input(z.object({ jobCardId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return listJobItems(input.jobCardId);
    }),

  create: technicianProcedure
    .input(
      z.object({
        jobCardId: z.number().int().positive(),
        type: z.enum(["part", "service", "labour", "other"]).default("part"),
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        quantity: z.number().positive().default(1),
        unitPrice: z.number().nonnegative(),
        discountPct: z.number().min(0).max(100).default(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const job = await getJobCardById(input.jobCardId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job card not found" });
      if (ctx.user.role === "technician" && job.assignedTechnicianId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not assigned to this job" });
      }
      if (["priced", "cancelled"].includes(job.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot add items to a closed job" });
      }

      const lineTotal = computeLineTotal(input.quantity, input.unitPrice, input.discountPct);

      const id = await createJobItem({
        jobCardId: input.jobCardId,
        type: input.type,
        name: input.name,
        description: input.description ?? null,
        quantity: String(input.quantity),
        unitPrice: String(input.unitPrice),
        discountPct: String(input.discountPct),
        lineTotal,
        addedById: ctx.user.id,
      });

      return { id, lineTotal };
    }),

  update: technicianProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        quantity: z.number().positive().optional(),
        unitPrice: z.number().nonnegative().optional(),
        discountPct: z.number().min(0).max(100).optional(),
        type: z.enum(["part", "service", "labour", "other"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const item = await getJobItemById(input.id);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Job item not found" });

      const job = await getJobCardById(item.jobCardId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job card not found" });
      if (ctx.user.role === "technician" && job.assignedTechnicianId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not assigned to this job" });
      }

      const qty = input.quantity ?? Number(item.quantity);
      const price = input.unitPrice ?? Number(item.unitPrice);
      const disc = input.discountPct ?? Number(item.discountPct ?? 0);
      const lineTotal = computeLineTotal(qty, price, disc);

      const { id, ...rest } = input;
      await updateJobItem(id, {
        ...rest,
        quantity: String(qty),
        unitPrice: String(price),
        discountPct: String(disc),
        lineTotal,
      });

      return { success: true, lineTotal };
    }),

  delete: technicianProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const item = await getJobItemById(input.id);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Job item not found" });

      const job = await getJobCardById(item.jobCardId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job card not found" });
      if (ctx.user.role === "technician" && job.assignedTechnicianId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not assigned to this job" });
      }
      if (["priced", "cancelled"].includes(job.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot remove items from a closed job" });
      }

      await deleteJobItem(input.id);
      return { success: true };
    }),

  /** Get total cost summary for a job card */
  summary: technicianProcedure
    .input(z.object({ jobCardId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const items = await listJobItems(input.jobCardId);
      const subtotal = items.reduce((sum, item) => sum + Number(item.lineTotal), 0);
      const partsCost = items
        .filter((i) => i.type === "part")
        .reduce((sum, i) => sum + Number(i.lineTotal), 0);
      const labourCost = items
        .filter((i) => i.type === "labour")
        .reduce((sum, i) => sum + Number(i.lineTotal), 0);
      const servicesCost = items
        .filter((i) => i.type === "service")
        .reduce((sum, i) => sum + Number(i.lineTotal), 0);
      return {
        itemCount: items.length,
        subtotal: subtotal.toFixed(2),
        partsCost: partsCost.toFixed(2),
        labourCost: labourCost.toFixed(2),
        servicesCost: servicesCost.toFixed(2),
      };
    }),
});
