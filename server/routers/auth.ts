/**
 * auth.ts — Authentication tRPC router
 *
 * Endpoints:
 *   auth.login            — email + password login (public)
 *   auth.register         — new account registration (public, invite-optional)
 *   auth.logout           — clear session cookie (protected)
 *   auth.me               — current user profile (public, returns null if unauthed)
 *   auth.changePassword   — self-service password change (protected)
 *   auth.mustChangePassword — check if user must change password (protected)
 *
 * Admin-only:
 *   auth.createInvite     — generate a signed invite link
 *   auth.listInvites      — list all invites
 *   auth.resetPassword    — admin-initiated password reset
 *   auth.unlockAccount    — unlock a locked account
 *   auth.auditLog         — view auth audit log
 *   auth.updateUserRole   — change a user's role
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { adminProcedure, managerProcedure } from "./middleware";
import { getSessionCookieOptions } from "../_core/cookies";
import { COOKIE_NAME } from "@shared/const";
import { getDb } from "../db";
import { users, localCredentials, inviteTokens } from "../../drizzle/schema";
import {
  loginUser,
  registerUser,
  changePassword,
  adminResetPassword,
  unlockAccount,
  createInviteToken,
  validateInviteToken,
  getAuditLog,
  createSessionToken,
  AUTH_COOKIE_NAME,
  SESSION_EXPIRY_MS,
} from "../authService";
import { writeAuditLog } from "../authService";
import { sendInviteEmail } from "../_core/email";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function getClientIp(req: any): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
    req.socket?.remoteAddress ??
    "unknown"
  );
}

function getClientUserAgent(req: any): string {
  return (req.headers["user-agent"] as string) ?? "unknown";
}

// ─────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────

export const localAuthRouter = router({
  // ── PUBLIC ──────────────────────────────────

  /** Email + password login */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(1, "Password is required"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { user, sessionToken } = await loginUser({
          email: input.email,
          password: input.password,
          ctx: {
            ipAddress: getClientIp(ctx.req),
            userAgent: getClientUserAgent(ctx.req),
          },
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(AUTH_COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: SESSION_EXPIRY_MS,
        });

        return {
          success: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            departmentId: user.departmentId,
          },
        };
      } catch (err) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: err instanceof Error ? err.message : "Login failed",
        });
      }
    }),

  /** Register a new account (optionally with an invite token) */
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(12, "Password must be at least 12 characters"),
        name: z.string().min(2, "Name must be at least 2 characters").max(100),
        inviteToken: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { user, sessionToken } = await registerUser({
          email: input.email,
          password: input.password,
          name: input.name,
          inviteToken: input.inviteToken,
          ctx: {
            ipAddress: getClientIp(ctx.req),
            userAgent: getClientUserAgent(ctx.req),
          },
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(AUTH_COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: SESSION_EXPIRY_MS,
        });

        return {
          success: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            departmentId: user.departmentId,
          },
        };
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "Registration failed",
        });
      }
    }),

  /** Check if there are no users in the system yet (first-run setup) */
  isFirstUser: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return false;
    const [row] = await db.select({ id: users.id }).from(users).limit(1);
    return !row;
  }),

  /** Validate an invite token (used on the registration page to pre-fill email/role) */
  validateInvite: publicProcedure
    .input(
      z.object({
        token: z.string(),
        email: z.string().email(),
      })
    )
    .query(async ({ input }) => {
      try {
        const result = await validateInviteToken(input.token, input.email);
        return { valid: true, ...result };
      } catch (err) {
        return {
          valid: false,
          role: null,
          departmentId: null,
          error: err instanceof Error ? err.message : "Invalid invite",
        };
      }
    }),

  // ── PROTECTED ───────────────────────────────

  /** Get the current authenticated user's full profile */
  me: publicProcedure.query((opts) => opts.ctx.user),

  /** Sign out — clear session cookie */
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    await writeAuditLog({
      userId: ctx.user.id,
      action: "logout",
      email: ctx.user.email ?? undefined,
      ipAddress: getClientIp(ctx.req),
      userAgent: getClientUserAgent(ctx.req),
    });

    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    ctx.res.clearCookie(AUTH_COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),

  /** Self-service password change */
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(12, "New password must be at least 12 characters"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await changePassword(
          ctx.user.id,
          input.currentPassword,
          input.newPassword,
          {
            ipAddress: getClientIp(ctx.req),
            userAgent: getClientUserAgent(ctx.req),
          }
        );
        return { success: true };
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "Password change failed",
        });
      }
    }),

  /** Check if the current user must change their password */
  mustChangePassword: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return false;
    const [cred] = await db
      .select({ mustChangePassword: localCredentials.mustChangePassword })
      .from(localCredentials)
      .where(eq(localCredentials.userId, ctx.user.id))
      .limit(1);
    return cred?.mustChangePassword ?? false;
  }),

  /** Check if user has a local credential (password set) */
  hasLocalCredential: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return false;
    const [cred] = await db
      .select({ id: localCredentials.id })
      .from(localCredentials)
      .where(eq(localCredentials.userId, ctx.user.id))
      .limit(1);
    return !!cred;
  }),

  // ── ADMIN ───────────────────────────────────

  /** Create an invite link for a new user and optionally email it */
  createInvite: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        role: z.enum(["admin", "manager", "technician"]),
        departmentId: z.number().int().positive().optional(),
        /** Frontend origin so the invite URL points to the correct domain */
        origin: z.string().url().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const token = await createInviteToken(
          ctx.user.id,
          input.email,
          input.role,
          input.departmentId,
          {
            ipAddress: getClientIp(ctx.req),
            userAgent: getClientUserAgent(ctx.req),
          }
        );
        // Use the frontend origin if provided, otherwise fall back to the request host
        const base = input.origin ?? `${ctx.req.protocol}://${ctx.req.get("host")}`;
        const inviteUrl = `${base}/register?invite=${token}`;

        // Send invite email via Resend (non-fatal if it fails)
        const emailSent = await sendInviteEmail({
          to: input.email,
          role: input.role,
          inviteUrl,
          invitedByName: ctx.user.name ?? "Houdini Locksmith Admin",
        });

        return { token, inviteUrl, emailSent };
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "Failed to create invite",
        });
      }
    }),

  /** List all invite tokens */
  listInvites: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(inviteTokens)
      .orderBy(inviteTokens.createdAt)
      .limit(100);
  }),

  /** Admin-initiated password reset */
  resetPassword: adminProcedure
    .input(
      z.object({
        targetUserId: z.number().int().positive(),
        temporaryPassword: z.string().min(12),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await adminResetPassword(
          input.targetUserId,
          input.temporaryPassword,
          ctx.user.id,
          {
            ipAddress: getClientIp(ctx.req),
            userAgent: getClientUserAgent(ctx.req),
          }
        );
        return { success: true };
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "Password reset failed",
        });
      }
    }),

  /** Unlock a locked account */
  unlockAccount: adminProcedure
    .input(z.object({ targetUserId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await unlockAccount(input.targetUserId, ctx.user.id, {
          ipAddress: getClientIp(ctx.req),
          userAgent: getClientUserAgent(ctx.req),
        });
        return { success: true };
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "Unlock failed",
        });
      }
    }),

  /** View auth audit log (admin sees all, manager sees own) */
  auditLog: managerProcedure
    .input(
      z.object({
        userId: z.number().int().positive().optional(),
        limit: z.number().int().min(1).max(200).default(50),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      // Managers can only see their own audit log
      const targetUserId =
        ctx.user.role === "admin" ? input?.userId : ctx.user.id;
      return getAuditLog(targetUserId, input?.limit ?? 50);
    }),

  /** Update a user's role (admin only) */
  updateUserRole: adminProcedure
    .input(
      z.object({
        userId: z.number().int().positive(),
        role: z.enum(["admin", "manager", "technician"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [target] = await db
        .select({ id: users.id, role: users.role, email: users.email })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      await db
        .update(users)
        .set({ role: input.role })
        .where(eq(users.id, input.userId));

      await writeAuditLog({
        userId: input.userId,
        action: "role_changed",
        email: target.email ?? undefined,
        metadata: JSON.stringify({
          previousRole: target.role,
          newRole: input.role,
          changedByAdminId: ctx.user.id,
        }),
      });

      return { success: true };
    }),

  /** List users with their credential status (admin/manager) */
  listUsersWithCredentials: managerProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const allUsers = await db.select().from(users).orderBy(users.createdAt);
    const allCreds = await db
      .select({
        userId: localCredentials.userId,
        mustChangePassword: localCredentials.mustChangePassword,
        failedAttempts: localCredentials.failedAttempts,
        lockedUntil: localCredentials.lockedUntil,
        lastPasswordChangedAt: localCredentials.lastPasswordChangedAt,
      })
      .from(localCredentials);

    const credMap = new Map(allCreds.map((c) => [c.userId, c]));

    return allUsers.map((u) => ({
      ...u,
      credential: credMap.get(u.id) ?? null,
    }));
  }),
});
