import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createJobCard,
  generateJobNumber,
  getClientById,
  getDepartmentById,
  getJobCardById,
  getSignatureByJobCard,
  getUserById,
  listJobCards,
  updateJobCard,
} from "../db";
import { adminProcedure, managerProcedure, technicianProcedure, emitNotification } from "./middleware";
import { router } from "../_core/trpc";

// Valid status transitions
const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["assigned", "cancelled"],
  assigned: ["in_progress", "on_hold", "cancelled"],
  in_progress: ["on_hold", "completed", "cancelled"],
  on_hold: ["in_progress", "cancelled"],
  completed: ["awaiting_pricing"],
  awaiting_pricing: ["priced"],
  priced: [],
  cancelled: [],
};

export const jobCardsRouter = router({
  list: technicianProcedure
    .input(
      z.object({
        status: z
          .enum(["pending", "assigned", "in_progress", "on_hold", "completed", "awaiting_pricing", "priced", "cancelled"])
          .optional(),
        departmentId: z.number().int().positive().optional(),
        assignedTechnicianId: z.number().int().positive().optional(),
        clientId: z.number().int().positive().optional(),
        priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
        dateFrom: z.string().datetime().optional(),
        dateTo: z.string().datetime().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      // Technicians only see their own jobs unless they are manager/admin
      const filters = { ...input } as Parameters<typeof listJobCards>[0];
      if (ctx.user.role === "technician") {
        filters!.assignedTechnicianId = ctx.user.id;
      }
      if (input?.dateFrom) filters!.dateFrom = new Date(input.dateFrom);
      if (input?.dateTo) filters!.dateTo = new Date(input.dateTo);
      return listJobCards(filters);
    }),

  get: technicianProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const job = await getJobCardById(input.id);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job card not found" });
      // Technicians can only view their own jobs
      if (ctx.user.role === "technician" && job.assignedTechnicianId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not assigned to this job" });
      }
      return job;
    }),

  /** Create a job card directly (without going through an enquiry) */
  create: managerProcedure
    .input(
      z.object({
        clientId: z.number().int().positive(),
        departmentId: z.number().int().positive(),
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
        assignedTechnicianId: z.number().int().positive().optional(),
        scheduledDate: z.string().datetime().optional(),
        requiresSignature: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const client = await getClientById(input.clientId);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      const dept = await getDepartmentById(input.departmentId);
      if (!dept) throw new TRPCError({ code: "NOT_FOUND", message: "Department not found" });

      const jobNumber = await generateJobNumber();
      const id = await createJobCard({
        jobNumber,
        clientId: input.clientId,
        enquiryId: null,
        departmentId: input.departmentId,
        assignedTechnicianId: input.assignedTechnicianId ?? null,
        assignedManagerId: ctx.user.id,
        title: input.title,
        description: input.description ?? null,
        status: input.assignedTechnicianId ? "assigned" : "pending",
        priority: input.priority,
        scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : null,
        requiresSignature: input.requiresSignature,
      });

      await emitNotification({
        type: "job_created",
        title: "Job Card Created",
        message: `Job card ${jobNumber} created for ${client.firstName} ${client.lastName}. Department: ${dept.name}.`,
        entityType: "job_card",
        entityId: id,
        notifyOwnerPush: input.priority === "urgent",
      });

      if (input.assignedTechnicianId) {
        await emitNotification({
          type: "job_assigned",
          title: "New Job Assigned to You",
          message: `Job card ${jobNumber} has been assigned to you. Priority: ${input.priority}.`,
          entityType: "job_card",
          entityId: id,
          userId: input.assignedTechnicianId,
        });
      }

      return { id, jobNumber };
    }),

  /** Assign or reassign a technician to a job card */
  assign: managerProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        technicianId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input }) => {
      const job = await getJobCardById(input.id);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job card not found" });
      if (["completed", "priced", "cancelled"].includes(job.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot assign a ${job.status} job` });
      }
      const tech = await getUserById(input.technicianId);
      if (!tech) throw new TRPCError({ code: "NOT_FOUND", message: "Technician not found" });

      await updateJobCard(input.id, {
        assignedTechnicianId: input.technicianId,
        status: "assigned",
      });

      await emitNotification({
        type: "job_assigned",
        title: "Job Card Assigned",
        message: `Job card ${job.jobNumber} has been assigned to you.`,
        entityType: "job_card",
        entityId: input.id,
        userId: input.technicianId,
      });

      return { success: true };
    }),

  /** Transition job card status */
  updateStatus: technicianProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: z.enum([
          "pending", "assigned", "in_progress", "on_hold",
          "completed", "awaiting_pricing", "priced", "cancelled",
        ]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const job = await getJobCardById(input.id);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job card not found" });

      // Technicians can only update their own jobs
      if (ctx.user.role === "technician" && job.assignedTechnicianId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not assigned to this job" });
      }

      // Validate transition
      const allowed = STATUS_TRANSITIONS[job.status] ?? [];
      if (!allowed.includes(input.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot transition from '${job.status}' to '${input.status}'`,
        });
      }

      // Completion requires signature if configured
      if (input.status === "completed" && job.requiresSignature) {
        const sig = await getSignatureByJobCard(input.id);
        if (!sig) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A signature is required before marking this job as completed",
          });
        }
      }

      const updateData: Parameters<typeof updateJobCard>[1] = { status: input.status };
      if (input.notes) {
        updateData.technicianNotes = input.notes;
      }
      if (input.status === "in_progress" && !job.startedAt) {
        updateData.startedAt = new Date();
      }
      if (input.status === "completed") {
        updateData.completedAt = new Date();
      }

      await updateJobCard(input.id, updateData);

      // Emit notifications for key transitions
      if (input.status === "completed") {
        await emitNotification({
          type: "job_completed",
          title: "Job Completed",
          message: `Job card ${job.jobNumber} has been marked as completed and is awaiting pricing.`,
          entityType: "job_card",
          entityId: input.id,
          notifyOwnerPush: true,
        });
        // Auto-transition to awaiting_pricing
        await updateJobCard(input.id, { status: "awaiting_pricing" });
        await emitNotification({
          type: "job_awaiting_pricing",
          title: "Job Awaiting Pricing Approval",
          message: `Job card ${job.jobNumber} is completed and awaiting pricing approval.`,
          entityType: "job_card",
          entityId: input.id,
          notifyOwnerPush: true,
        });
      }

      if (input.status === "cancelled") {
        await emitNotification({
          type: "general",
          title: "Job Card Cancelled",
          message: `Job card ${job.jobNumber} has been cancelled.`,
          entityType: "job_card",
          entityId: input.id,
        });
      }

      // Notify owner for urgent jobs going in-progress
      if (input.status === "in_progress" && job.priority === "urgent") {
        await emitNotification({
          type: "job_urgent",
          title: "Urgent Job Started",
          message: `Urgent job card ${job.jobNumber} is now in progress.`,
          entityType: "job_card",
          entityId: input.id,
          notifyOwnerPush: true,
        });
      }

      return { success: true };
    }),

  /** Update job card details (title, description, priority, schedule) */
  update: managerProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
        departmentId: z.number().int().positive().optional(),
        scheduledDate: z.string().datetime().nullable().optional(),
        managerNotes: z.string().optional(),
        requiresSignature: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, scheduledDate, ...rest } = input;
      const job = await getJobCardById(id);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job card not found" });

      const updateData: Parameters<typeof updateJobCard>[1] = { ...rest };
      if (scheduledDate !== undefined) {
        updateData.scheduledDate = scheduledDate ? new Date(scheduledDate) : null;
      }

      // Notify owner if priority escalated to urgent
      if (input.priority === "urgent" && job.priority !== "urgent") {
        await emitNotification({
          type: "job_urgent",
          title: "Job Marked Urgent",
          message: `Job card ${job.jobNumber} has been escalated to URGENT priority.`,
          entityType: "job_card",
          entityId: id,
          notifyOwnerPush: true,
        });
      }

      await updateJobCard(id, updateData);
      return { success: true };
    }),

  /** Schedule a job card to a specific date */
  schedule: managerProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        scheduledDate: z.string().datetime(),
        timeSlotId: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const job = await getJobCardById(input.id);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job card not found" });

      await updateJobCard(input.id, {
        scheduledDate: new Date(input.scheduledDate),
        scheduledTimeSlotId: input.timeSlotId ?? null,
      });

      return { success: true };
    }),
});
