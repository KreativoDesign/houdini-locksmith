import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { upsertPushSubscription, deletePushSubscription, getPushSubscriptionsForUser } from "../db";

export const pushRouter = router({
  /**
   * Subscribe the current user to push notifications
   */
  subscribe: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().url(),
        keys: z.object({
          p256dh: z.string(),
          auth: z.string(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await upsertPushSubscription(ctx.user.id, input);
      return { success: true };
    }),

  /**
   * Unsubscribe the current user from push notifications
   */
  unsubscribe: protectedProcedure
    .input(z.object({ endpoint: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      await deletePushSubscription(ctx.user.id, input.endpoint);
      return { success: true };
    }),

  /**
   * Get the public VAPID key for the frontend to use
   */
  getPublicKey: publicProcedure.query(() => {
    return { publicKey: process.env.VITE_VAPID_PUBLIC_KEY || "" };
  }),

  /**
   * List current user's push subscriptions (for debugging/management)
   */
  listSubscriptions: protectedProcedure.query(async ({ ctx }) => {
    const subs = await getPushSubscriptionsForUser(ctx.user.id);
    return subs.map((s) => ({
      id: s.id,
      endpoint: s.endpoint,
      createdAt: s.createdAt,
    }));
  }),
});
