import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { sendPushToUser } from "../_core/push";
import {
  createJobCard,
  createSignature,
  generateJobNumber,
  getClientById,
  getDepartmentById,
  getJobCardById,
  getSignatureByJobCard,
  getUserById,
  listJobCards,
  listJobCardsWithDetails,
  listJobItems,
  listJobDocuments,
  updateJobCard,
} from "../db";
import { adminProcedure, managerProcedure, technicianProcedure, emitNotification } from "./middleware";
import { router } from "../_core/trpc";
import { generateJobCardPdf } from "../pdfGenerator";
import { storagePut } from "../storage";

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
      const filters = { ...input } as Parameters<typeof listJobCardsWithDetails>[0];
      if (ctx.user.role === "technician") {
        filters!.assignedTechnicianId = ctx.user.id;
      }
      if (input?.dateFrom) filters!.dateFrom = new Date(input.dateFrom);
      if (input?.dateTo) filters!.dateTo = new Date(input.dateTo);
      return listJobCardsWithDetails(filters);
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
      // Enrich with client, department, and user details in parallel
      const [client, dept, tech, manager] = await Promise.all([
        job.clientId ? getClientById(job.clientId) : null,
        getDepartmentById(job.departmentId),
        job.assignedTechnicianId ? getUserById(job.assignedTechnicianId) : null,
        job.assignedManagerId ? getUserById(job.assignedManagerId) : null,
      ]);
      return {
        ...job,
        clientName: client ? `${client.firstName} ${client.lastName}`.trim() : null,
        clientEmail: client?.email ?? null,
        clientPhone: client?.phone ?? null,
        clientAlternatePhone: client?.alternatePhone ?? null,
        clientAddress: client?.address ?? null,
        clientCity: client?.city ?? null,
        clientPostalCode: client?.postalCode ?? null,
        departmentName: dept?.name ?? null,
        technicianName: tech ? (tech.name ?? tech.email) : null,
        managerName: manager ? (manager.name ?? manager.email) : null,
      };
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

      // Only transition to "assigned" if the job is still pending.
      // Jobs already in progress / on hold keep their current status.
      const newStatus = job.status === "pending" ? "assigned" : job.status;
      await updateJobCard(input.id, {
        assignedTechnicianId: input.technicianId,
        status: newStatus,
      });

      await emitNotification({
        type: "job_assigned",
        title: "Job Card Assigned",
        message: `Job card ${job.jobNumber} has been assigned to you.`,
        entityType: "job_card",
        entityId: input.id,
        userId: input.technicianId,
      });

      // Send push notification to the assigned technician
      await sendPushToUser(input.technicianId, {
        title: "New Job Assigned",
        body: `Job ${job.jobNumber} has been assigned to you.`,
        icon: "/icon-192x192.png",
        badge: "/icon-192x192.png",
        tag: `job-${input.id}`,
        data: {
          jobId: input.id.toString(),
          jobNumber: job.jobNumber,
          url: `/jobs/${input.id}`,
        },
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

  /**
   * Update technician or manager notes independently of status changes.
   * Technicians can update technicianNotes; managers/admins can update both.
   */
  updateNotes: technicianProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        technicianNotes: z.string().optional(),
        managerNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const job = await getJobCardById(input.id);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job card not found" });
      if (ctx.user.role === "technician" && job.assignedTechnicianId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not assigned to this job" });
      }
      if (["priced", "cancelled"].includes(job.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot update notes on a closed job" });
      }
      // Technicians cannot update manager notes
      if (ctx.user.role === "technician" && input.managerNotes !== undefined) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Technicians cannot update manager notes" });
      }
      const updateData: Parameters<typeof updateJobCard>[1] = {};
      if (input.technicianNotes !== undefined) updateData.technicianNotes = input.technicianNotes;
      if (input.managerNotes !== undefined) updateData.managerNotes = input.managerNotes;
      if (Object.keys(updateData).length === 0) return { success: true };
      await updateJobCard(input.id, updateData);
      return { success: true };
    }),

  /**
   * Generate a PDF of the job card, upload it to S3, and return a public URL.
   */
  generatePdf: technicianProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const job = await getJobCardById(input.id);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job card not found" });
      if (ctx.user.role === "technician" && job.assignedTechnicianId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not assigned to this job" });
      }

      const [client, dept, tech, manager, items, documents, signature] = await Promise.all([
        job.clientId ? getClientById(job.clientId) : null,
        getDepartmentById(job.departmentId),
        job.assignedTechnicianId ? getUserById(job.assignedTechnicianId) : null,
        job.assignedManagerId ? getUserById(job.assignedManagerId) : null,
        listJobItems(job.id),
        listJobDocuments(job.id),
        getSignatureByJobCard(job.id),
      ]);

      const photos = documents.filter(
        (d) => ["photo", "before_image", "after_image"].includes(d.category) && d.mimeType.startsWith("image/")
      );

      const pdfBuffer = await generateJobCardPdf({
        jobNumber: job.jobNumber,
        title: job.title,
        description: job.description,
        status: job.status,
        priority: job.priority,
        scheduledDate: job.scheduledDate,
        createdAt: job.createdAt,
        clientName: client ? `${client.firstName} ${client.lastName}`.trim() : null,
        clientEmail: client?.email ?? null,
        clientPhone: client?.phone ?? null,
        clientAlternatePhone: client?.alternatePhone ?? null,
        clientAddress: client?.address ?? null,
        clientCity: client?.city ?? null,
        clientPostalCode: client?.postalCode ?? null,
        technicianName: tech ? (tech.name ?? tech.email) : null,
        managerName: manager ? (manager.name ?? manager.email) : null,
        departmentName: dept?.name ?? null,
        technicianNotes: job.technicianNotes,
        managerNotes: job.managerNotes,
        items: items.map((i) => ({
          name: i.name,
          type: i.type,
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discountPct: i.discountPct,
          lineTotal: i.lineTotal,
        })),
        photos: photos.map((p) => ({
          fileUrl: p.fileUrl,
          fileName: p.fileName,
          category: p.category,
          mimeType: p.mimeType,
        })),
        signatureUrl: signature?.signatureUrl ?? null,
        signerName: signature?.signerName ?? null,
        signerRole: signature?.signerRole ?? null,
        signedAt: signature?.createdAt ?? null,
      });

      const fileKey = `jobs/${job.id}/pdf/${job.jobNumber}-${Date.now()}.pdf`;
      const { url } = await storagePut(fileKey, pdfBuffer, "application/pdf");
      return { url, jobNumber: job.jobNumber };
    }),

  /**
   * Accept a job assignment as a technician.
   * Transitions from 'assigned' to 'in_progress' and sets startedAt timestamp.
   */
  acceptJob: technicianProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const job = await getJobCardById(input.id);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job card not found" });
      
      // Only technicians can accept their own jobs
      if (job.assignedTechnicianId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not assigned to this job" });
      }
      
      // Job must be in 'assigned' status to accept
      if (job.status !== "assigned") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot accept a job with status '${job.status}'. Job must be in 'assigned' status.`,
        });
      }
      
      // Update job status to in_progress and set startedAt
      await updateJobCard(input.id, {
        status: "in_progress",
        startedAt: new Date(),
      });
      
      // Emit notification to manager/owner
      await emitNotification({
        type: "job_started",
        title: "Job Accepted",
        message: `Job card ${job.jobNumber} has been accepted and is now in progress.`,
        entityType: "job_card",
        entityId: input.id,
        notifyOwnerPush: true,
      });
      
      return { success: true, id: input.id, jobNumber: job.jobNumber };
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

  /**
   * Get jobs for a specific client (admin/manager only, for testing/viewing)
   */
  getClientJobs: managerProcedure
    .input(z.object({ clientId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const jobs = await listJobCards({ clientId: input.clientId });
      return jobs;
    }),

  /**
   * Capture signature for a job card
   */
  captureSignature: technicianProcedure
    .input(
      z.object({
        jobId: z.number().int().positive(),
        signatureData: z.string(),
        signedBy: z.enum(["technician", "client"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const job = await getJobCardById(input.jobId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job card not found" });

      if (ctx.user.role !== "admin" && ctx.user.id !== job.assignedTechnicianId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to sign this job" });
      }

      const fileName = `signatures/job-${input.jobId}-${input.signedBy}-${Date.now()}.png`;
      const buffer = Buffer.from(input.signatureData.split(",")[1] || input.signatureData, "base64");
      const { url } = await storagePut(fileName, buffer, "image/png");

      // Persist signature to database using existing createSignature function
      const signedAt = new Date();
      const signatureId = await createSignature({
        jobCardId: input.jobId,
        signatureData: url, // Store the S3 URL
        signatureUrl: url,
        signedAt,
      });

      return {
        success: true,
        signatureId: signatureId || 0,
        signatureUrl: url,
        signedAt,
        signedBy: input.signedBy,
      };
    }),

  /**
   * Get signatures for a job card
   */
  getSignatures: technicianProcedure
    .input(z.object({ jobId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const signature = await getSignatureByJobCard(input.jobId);
      return signature ? [signature] : [];
    }),
});
