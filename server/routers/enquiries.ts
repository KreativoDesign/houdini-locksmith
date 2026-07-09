import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  countEnquiries,
  createEnquiry,
  createJobCard,
  getClientById,
  getDepartmentById,
  getEnquiryById,
  getEnquiryWithDetails,
  getUserById,
  generateJobNumber,
  listEnquiries,
  updateEnquiry,
  updateJobCard,
} from "../db";
import { managerProcedure, technicianProcedure, emitNotification } from "./middleware";
import { router } from "../_core/trpc";

export const enquiriesRouter = router({
  list: technicianProcedure
    .input(
      z.object({
        status: z.enum(["new", "in_review", "converted", "closed"]).optional(),
        clientId: z.number().int().positive().optional(),
        departmentId: z.number().int().positive().optional(),
        assignedToId: z.number().int().positive().optional(),
        serviceType: z.enum(["locksmithing", "security", "diagnostics", "workshop", "other"]).optional(),
        search: z.string().optional(),
        limit: z.number().int().positive().max(200).default(50),
        offset: z.number().int().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const [rows, total] = await Promise.all([
        listEnquiries(input),
        countEnquiries(input),
      ]);
      return { rows, total };
    }),

  get: technicianProcedure
    .input(z.object({ id: z.number().int().positive(), withDetails: z.boolean().optional() }))
    .query(async ({ input }) => {
      if (input.withDetails) {
        const enquiry = await getEnquiryWithDetails(input.id);
        if (!enquiry) throw new TRPCError({ code: "NOT_FOUND", message: "Enquiry not found" });
        return enquiry;
      }
      const enquiry = await getEnquiryById(input.id);
      if (!enquiry) throw new TRPCError({ code: "NOT_FOUND", message: "Enquiry not found" });
      return enquiry;
    }),

  create: technicianProcedure
    .input(
      z.object({
        clientId: z.number().int().positive(),
        departmentId: z.number().int().positive().optional(),
        subject: z.string().min(1).max(255),
        description: z.string().min(1),
        serviceType: z.enum(["locksmithing", "security", "diagnostics", "workshop", "other"]).default("other"),
        priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
        source: z.enum(["phone", "email", "walk_in", "online", "referral"]).default("phone"),
        notes: z.string().optional(),
        assignedToId: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const client = await getClientById(input.clientId);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });

      // Use provided assignedToId or default to current user
      const assignedToId = input.assignedToId ?? ctx.user.id;
      const id = await createEnquiry({ ...input, status: "new", assignedToId, createdById: ctx.user.id } as any);

      // Notify owner and assigned employee of new enquiry
      await emitNotification({
        type: "new_enquiry",
        title: "New Enquiry Received",
        message: `New ${input.priority} priority enquiry from ${client.firstName} ${client.lastName}: "${input.subject}"`,
        entityType: "enquiry",
        entityId: id,
        notifyOwnerPush: true,
      });

      // Notify assigned employee if different from current user
      if (assignedToId !== ctx.user.id) {
        await emitNotification({
          type: "enquiry_assigned",
          title: "Enquiry Assigned to You",
          message: `Enquiry from ${client.firstName} ${client.lastName}: "${input.subject}"`,
          entityType: "enquiry",
          entityId: id,
          userId: assignedToId,
        });
      }

      return { id };
    }),

  update: technicianProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        subject: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        serviceType: z.enum(["locksmithing", "security", "diagnostics", "workshop", "other"]).optional(),
        status: z.enum(["new", "in_review", "converted", "closed"]).optional(),
        priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
        source: z.enum(["phone", "email", "walk_in", "online", "referral"]).optional(),
        departmentId: z.number().int().positive().nullable().optional(),
        assignedToId: z.number().int().positive().nullable().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const existing = await getEnquiryById(id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Enquiry not found" });
      if (existing.status === "converted") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot update a converted enquiry" });
      }
      await updateEnquiry(id, data);
      return { success: true };
    }),

  /** Assign an enquiry to a staff member for review */
  assign: managerProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        assignedToId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input }) => {
      const enquiry = await getEnquiryById(input.id);
      if (!enquiry) throw new TRPCError({ code: "NOT_FOUND", message: "Enquiry not found" });
      const assignee = await getUserById(input.assignedToId);
      if (!assignee) throw new TRPCError({ code: "NOT_FOUND", message: "Assignee not found" });

      await updateEnquiry(input.id, { assignedToId: input.assignedToId, status: "in_review" });

      await emitNotification({
        type: "enquiry_assigned",
        title: "Enquiry Assigned to You",
        message: `Enquiry #${input.id} "${enquiry.subject}" has been assigned to you for review.`,
        entityType: "enquiry",
        entityId: input.id,
        userId: input.assignedToId,
      });

      return { success: true };
    }),

  /**
   * Convert an enquiry into a job card.
   * This is the core workflow transition: enquiry → job card.
   */
  convertToJobCard: managerProcedure
    .input(
      z.object({
        enquiryId: z.number().int().positive(),
        departmentId: z.number().int().positive(),
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
        assignedTechnicianId: z.number().int().positive().optional(),
        scheduledDate: z.string().datetime().optional(), // ISO string
        requiresSignature: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const enquiry = await getEnquiryById(input.enquiryId);
      if (!enquiry) throw new TRPCError({ code: "NOT_FOUND", message: "Enquiry not found" });
      if (enquiry.status === "converted") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Enquiry has already been converted" });
      }
      if (enquiry.status === "closed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot convert a closed enquiry" });
      }

      const dept = await getDepartmentById(input.departmentId);
      if (!dept) throw new TRPCError({ code: "NOT_FOUND", message: "Department not found" });

      if (input.assignedTechnicianId) {
        const tech = await getUserById(input.assignedTechnicianId);
        if (!tech) throw new TRPCError({ code: "NOT_FOUND", message: "Technician not found" });
      }

      const jobNumber = await generateJobNumber();
      const jobCardId = await createJobCard({
        jobNumber,
        clientId: enquiry.clientId,
        enquiryId: enquiry.id,
        departmentId: input.departmentId,
        assignedTechnicianId: input.assignedTechnicianId ?? null,
        assignedManagerId: ctx.user.id,
        title: input.title,
        description: input.description ?? enquiry.description,
        status: input.assignedTechnicianId ? "assigned" : "pending",
        priority: input.priority,
        scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : null,
        requiresSignature: input.requiresSignature,
      });

      // Mark enquiry as converted, link to job card, and archive it
      await updateEnquiry(input.enquiryId, {
        status: "converted",
        convertedToJobCardId: jobCardId,
        archived: true,
      });

      // Notify owner
      await emitNotification({
        type: "job_created",
        title: "Job Card Created",
        message: `Job card ${jobNumber} created from enquiry #${input.enquiryId}. Department: ${dept.name}.`,
        entityType: "job_card",
        entityId: jobCardId,
        notifyOwnerPush: true,
      });

      // Notify technician if assigned
      if (input.assignedTechnicianId) {
        await emitNotification({
          type: "job_assigned",
          title: "New Job Assigned to You",
          message: `Job card ${jobNumber} has been assigned to you. Priority: ${input.priority}.`,
          entityType: "job_card",
          entityId: jobCardId,
          userId: input.assignedTechnicianId,
        });
      }

      return { jobCardId, jobNumber };
    }),

  close: managerProcedure
    .input(z.object({ id: z.number().int().positive(), reason: z.string().optional() }))
    .mutation(async ({ input }) => {
      const enquiry = await getEnquiryById(input.id);
      if (!enquiry) throw new TRPCError({ code: "NOT_FOUND", message: "Enquiry not found" });
      if (enquiry.status === "converted") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot close a converted enquiry" });
      }
      await updateEnquiry(input.id, { status: "closed", notes: input.reason });
      return { success: true };
    }),
});
