import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../_core/trpc";
import { notifyOwner } from "../_core/notification";
import { createNotification } from "../db";
import type { Notification } from "../../drizzle/schema";

// ─────────────────────────────────────────────
// ROLE-BASED PROCEDURE FACTORIES
// ─────────────────────────────────────────────

/** Only Admin users */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

/** Admin OR Manager */
export const managerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Manager or Admin access required" });
  }
  return next({ ctx });
});

/** Any authenticated user (admin, manager, technician) */
export const technicianProcedure = protectedProcedure;

// ─────────────────────────────────────────────
// NOTIFICATION HELPER
// ─────────────────────────────────────────────

interface NotifyOptions {
  type: Notification["type"];
  title: string;
  message: string;
  entityType?: string;
  entityId?: number;
  userId?: number;
  /** Whether to also send an owner push notification */
  notifyOwnerPush?: boolean;
}

export async function emitNotification(opts: NotifyOptions): Promise<void> {
  try {
    await createNotification({
      userId: opts.userId ?? null,
      type: opts.type,
      title: opts.title,
      message: opts.message,
      entityType: opts.entityType ?? null,
      entityId: opts.entityId ?? null,
      isRead: false,
      ownerNotified: opts.notifyOwnerPush ?? false,
    });

    if (opts.notifyOwnerPush) {
      await notifyOwner({ title: opts.title, content: opts.message });
    }
  } catch (err) {
    // Notification failures must never break the main flow
    console.error("[Notification] Failed to emit:", err);
  }
}
