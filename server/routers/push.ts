import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { upsertPushSubscription, deletePushSubscription, getPushSubscriptionsForUser, getDb } from "../db";
import { pushSubscriptions } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

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
      await upsertPushSubscription({ userId: ctx.user.id, ...input } as any);
      return { success: true };
    }),

  /**
   * Unsubscribe the current user from push notifications
   */
  unsubscribe: protectedProcedure
    .input(z.object({ endpoint: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      // Find the subscription by endpoint and delete it
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const sub = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, input.endpoint)).limit(1);
      if (sub.length > 0) {
        await deletePushSubscription(sub[0].id);
      }
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
