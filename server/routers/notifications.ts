import { z } from "zod";
import {
  createNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../db";
import { adminProcedure, technicianProcedure } from "./middleware";
import { router } from "../_core/trpc";

export const notificationsRouter = router({
  /** List notifications for the current user */
  list: technicianProcedure
    .input(
      z.object({
        unreadOnly: z.boolean().default(false),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      return listNotifications(ctx.user.id, input?.unreadOnly ?? false);
    }),

  /** Admin: list all system notifications */
  listAll: adminProcedure
    .input(
      z.object({
        unreadOnly: z.boolean().default(false),
      }).optional()
    )
    .query(async ({ input }) => {
      return listNotifications(undefined, input?.unreadOnly ?? false);
    }),

  markRead: technicianProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await markNotificationRead(input.id);
      return { success: true };
    }),

  markAllRead: technicianProcedure.mutation(async ({ ctx }) => {
    await markAllNotificationsRead(ctx.user.id);
    return { success: true };
  }),

  /** Admin: create a manual notification for a specific user */
  send: adminProcedure
    .input(
      z.object({
        userId: z.number().int().positive().optional(),
        title: z.string().min(1).max(255),
        message: z.string().min(1),
        type: z
          .enum([
            "new_enquiry",
            "enquiry_assigned",
            "job_created",
            "job_assigned",
            "job_urgent",
            "job_started",
            "job_completed",
            "job_awaiting_pricing",
            "pricing_approved",
            "signature_captured",
            "general",
          ])
          .default("general"),
        entityType: z.string().optional(),
        entityId: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createNotification({
        userId: input.userId ?? null,
        type: input.type,
        title: input.title,
        message: input.message,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      });
      return { id };
    }),
});
