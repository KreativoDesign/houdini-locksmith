import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  bookTimeSlot,
  createTimeSlotsForDay,
  deleteAvailability,
  getAvailabilityByUserAndDate,
  getAvailableSlots,
  getBookedSlotsForDate,
  getJobCardById,
  getSlotsByTechnicianAndDate,
  getUserById,
  listAvailability,
  releaseTimeSlot,
  setAvailability,
  updateAvailability,
  updateJobCard,
} from "../db";
import { managerProcedure, technicianProcedure } from "./middleware";
import { router } from "../_core/trpc";

export const schedulingRouter = router({
  // ─────────────────────────────────────────────
  // TIME SLOTS
  // ─────────────────────────────────────────────

  /**
   * Generate 45-minute time slots for a technician on a given date.
   * Idempotent — safe to call multiple times.
   */
  generateSlots: managerProcedure
    .input(
      z.object({
        technicianId: z.number().int().positive(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
      })
    )
    .mutation(async ({ input }) => {
      const tech = await getUserById(input.technicianId);
      if (!tech) throw new TRPCError({ code: "NOT_FOUND", message: "Technician not found" });
      await createTimeSlotsForDay(input.date, input.technicianId);
      return { success: true };
    }),

  /** Get all slots (booked + available) for a technician on a date */
  getSlots: technicianProcedure
    .input(
      z.object({
        technicianId: z.number().int().positive(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
      })
    )
    .query(async ({ input }) => {
      return getSlotsByTechnicianAndDate(input.technicianId, input.date);
    }),

  /** Get all booked slots for a list of technicians across a date range (weekly calendar) */
  getWeeklyBookings: technicianProcedure
    .input(
      z.object({
        technicianIds: z.array(z.number().int().positive()).min(1).max(50),
        fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
        toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
      })
    )
    .query(async ({ input }) => {
      // Build list of dates in range
      const dates: string[] = [];
      const start = new Date(input.fromDate);
      const end = new Date(input.toDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().slice(0, 10));
      }
      // Fetch booked slots for each technician × each date in parallel
      const results = await Promise.all(
        input.technicianIds.flatMap((techId) =>
          dates.map(async (date) => {
            const slots = await getBookedSlotsForDate(techId, date);
            return slots.map((s) => ({ ...s, technicianId: techId, date }));
          })
        )
      );
      return results.flat();
    }),

  /** Get booked slots for a technician on a date — used for conflict detection in the slot picker */
  getBookingsForDate: technicianProcedure
    .input(
      z.object({
        technicianId: z.number().int().positive(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
      })
    )
    .query(async ({ input }) => {
      return getBookedSlotsForDate(input.technicianId, input.date);
    }),

  /** Get only available (unbooked) slots for a technician on a date */
  getAvailableSlots: technicianProcedure
    .input(
      z.object({
        technicianId: z.number().int().positive(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
      })
    )
    .query(async ({ input }) => {
      // Auto-generate slots if they don't exist yet
      await createTimeSlotsForDay(input.date, input.technicianId);
      return getAvailableSlots(input.technicianId, input.date);
    }),

  /** Book a time slot for a job card */
  bookSlot: managerProcedure
    .input(
      z.object({
        slotId: z.number().int().positive(),
        jobCardId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input }) => {
      const job = await getJobCardById(input.jobCardId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job card not found" });
      if (["completed", "priced", "cancelled"].includes(job.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot book a slot for a closed job" });
      }

      try {
        await bookTimeSlot(input.slotId, input.jobCardId);
        // Update job card's scheduled slot reference
        await updateJobCard(input.jobCardId, { scheduledTimeSlotId: input.slotId });
      } catch (err) {
        if (err instanceof Error && err.message === "Time slot is already booked") {
          throw new TRPCError({ code: "CONFLICT", message: "This time slot is already booked" });
        }
        throw err;
      }

      return { success: true };
    }),

  /** Release a booked time slot */
  releaseSlot: managerProcedure
    .input(z.object({ slotId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await releaseTimeSlot(input.slotId);
      return { success: true };
    }),

  // ─────────────────────────────────────────────
  // EMPLOYEE AVAILABILITY
  // ─────────────────────────────────────────────

  /** Set or update a technician's availability for a date range */
  setAvailability: technicianProcedure
    .input(
      z.object({
        userId: z.number().int().positive().optional(), // if omitted, uses current user
        availableDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        startTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM"),
        endTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM"),
        isAvailable: z.boolean().default(true),
        reason: z.string().max(255).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = input.userId ?? ctx.user.id;
      // Technicians can only set their own availability
      if (ctx.user.role === "technician" && userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only set your own availability" });
      }
      const id = await setAvailability({
        userId,
        availableDate: input.availableDate,
        startTime: input.startTime,
        endTime: input.endTime,
        isAvailable: input.isAvailable,
        reason: input.reason ?? null,
      });
      return { id };
    }),

  getAvailability: technicianProcedure
    .input(
      z.object({
        userId: z.number().int().positive().optional(),
        fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const userId = input?.userId ?? ctx.user.id;
      if (ctx.user.role === "technician" && userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only view your own availability" });
      }
      return listAvailability(userId, input?.fromDate, input?.toDate);
    }),

  updateAvailability: technicianProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        isAvailable: z.boolean().optional(),
        reason: z.string().max(255).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateAvailability(id, data);
      return { success: true };
    }),

  deleteAvailability: technicianProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const records = await listAvailability(ctx.user.id);
      const record = records.find((r) => r.id === input.id);
      if (!record && ctx.user.role === "technician") {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only delete your own availability" });
      }
      await deleteAvailability(input.id);
      return { success: true };
    }),
});
