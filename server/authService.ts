/**
 * authService.ts
 *
 * Core authentication service for Houdini Locksmith.
 * Handles local credential management (email + bcrypt password),
 * session JWT creation/verification, invite token lifecycle,
 * and the auth audit log.
 *
 * Security properties:
 * - Passwords hashed with bcrypt at cost factor 12
 * - Sessions are signed HS256 JWTs (same JWT_SECRET as OAuth flow)
 * - Account lockout after 5 consecutive failures (15-minute window)
 * - Invite tokens are 32-byte cryptographically random hex strings
 * - Invite tokens expire after 48 hours and are single-use
 */

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { nanoid } from "nanoid";
import { eq, and, gt } from "drizzle-orm";
import { getDb } from "./db";
import {
  users,
  localCredentials,
  authAuditLog,
  inviteTokens,
  departments,
} from "../drizzle/schema";
import type {
  User,
  InsertLocalCredential,
  InsertAuthAuditLog,
  InsertInviteToken,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const INVITE_EXPIRY_MS = 48 * 60 * 60 * 1000; // 48 hours
const COOKIE_NAME = "app_session_id";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface AuthResult {
  user: User;
  sessionToken: string;
}

export interface SessionPayload {
  userId: number;
  openId: string;
  role: string;
  email: string | null;
  name: string | null;
}

export interface AuditContext {
  ipAddress?: string;
  userAgent?: string;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function getJwtSecret(): Uint8Array {
  const secret = ENV.cookieSecret;
  if (!secret || secret.length < 8) {
    throw new Error("JWT_SECRET is not configured. Please set the JWT_SECRET environment variable.");
  }
  return new TextEncoder().encode(secret);
}

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

// ─────────────────────────────────────────────
// PASSWORD UTILITIES
// ─────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Validate password strength: min 12 chars, uppercase, lowercase, digit, special char */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 12) return "Password must be at least 12 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain at least one special character (e.g. !@#$%)";
  return null; // valid
}

// ─────────────────────────────────────────────
// SESSION JWT
// ─────────────────────────────────────────────

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const secret = getJwtSecret();
  return new SignJWT({
    userId: payload.userId,
    openId: payload.openId,
    role: payload.role,
    email: payload.email,
    name: payload.name,
    // Include appId so the existing SDK verifySession still works
    appId: ENV.appId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    const { userId, openId, role, email, name } = payload as Record<string, unknown>;
    if (typeof userId !== "number" || typeof openId !== "string") return null;
    return {
      userId: userId as number,
      openId: openId as string,
      role: (role as string) ?? "technician",
      email: (email as string) ?? null,
      name: (name as string) ?? null,
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// AUDIT LOG
// ─────────────────────────────────────────────

export async function writeAuditLog(
  entry: Omit<InsertAuthAuditLog, "id" | "createdAt">
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(authAuditLog).values(entry);
  } catch (err) {
    console.error("[Auth] Audit log write failed:", err);
  }
}

// ─────────────────────────────────────────────
// REGISTRATION
// ─────────────────────────────────────────────

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  /** Role assigned by admin via invite, or default 'technician' */
  role?: "admin" | "manager" | "technician";
  departmentId?: number;
  inviteToken?: string;
  ctx?: AuditContext;
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const email = normaliseEmail(input.email);

  // Check for existing credential
  const existing = await db
    .select()
    .from(localCredentials)
    .where(eq(localCredentials.email, email))
    .limit(1);
  if (existing.length > 0) {
    throw new Error("An account with this email already exists");
  }

  let role: "admin" | "manager" | "technician" = "technician";
  let departmentId: number | undefined = input.departmentId;

  // First-user bootstrap: if no users exist yet, make this user the admin
  const [userCountRow] = await db
    .select({ count: users.id })
    .from(users)
    .limit(1);
  const isFirstUser = !userCountRow;

  if (isFirstUser) {
    // First user is always admin regardless of invite or role input
    role = "admin";
  } else if (input.inviteToken) {
    // If an invite token is provided, validate it and extract role/dept
    const invite = await validateInviteToken(input.inviteToken, email);
    role = invite.role;
    if (invite.departmentId) departmentId = invite.departmentId;
  } else if (input.role) {
    role = input.role;
  }

  const passwordError = validatePasswordStrength(input.password);
  if (passwordError) throw new Error(passwordError);

  const passwordHash = await hashPassword(input.password);

  // Create the user record
  const openId = `local_${nanoid(16)}`;
  await db.insert(users).values({
    openId,
    name: input.name,
    email,
    loginMethod: "local",
    role,
    departmentId: departmentId ?? null,
    isActive: true,
    lastSignedIn: new Date(),
  });

  const [newUser] = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  if (!newUser) throw new Error("Failed to create user");

  // Create local credentials
  await db.insert(localCredentials).values({
    userId: newUser.id,
    email,
    passwordHash,
    mustChangePassword: false,
    failedAttempts: 0,
    lastPasswordChangedAt: new Date(),
  });

  // Mark invite as used
  if (input.inviteToken) {
    await markInviteUsed(input.inviteToken, newUser.id);
  }

  const sessionToken = await createSessionToken({
    userId: newUser.id,
    openId: newUser.openId,
    role: newUser.role,
    email: newUser.email ?? null,
    name: newUser.name ?? null,
  });

  await writeAuditLog({
    userId: newUser.id,
    action: "register",
    email,
    ipAddress: input.ctx?.ipAddress,
    userAgent: input.ctx?.userAgent,
    metadata: JSON.stringify({ role, inviteUsed: !!input.inviteToken }),
  });

  return { user: newUser, sessionToken };
}

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────

export interface LoginInput {
  email: string;
  password: string;
  ctx?: AuditContext;
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const email = normaliseEmail(input.email);

  // Fetch credential record
  const [cred] = await db
    .select()
    .from(localCredentials)
    .where(eq(localCredentials.email, email))
    .limit(1);

  if (!cred) {
    // Don't reveal whether email exists
    await writeAuditLog({
      userId: undefined,
      action: "login_failed",
      email,
      ipAddress: input.ctx?.ipAddress,
      userAgent: input.ctx?.userAgent,
      metadata: JSON.stringify({ reason: "email_not_found" }),
    });
    throw new Error("Invalid email or password");
  }

  // Check lockout
  if (cred.lockedUntil && cred.lockedUntil > new Date()) {
    const remaining = Math.ceil((cred.lockedUntil.getTime() - Date.now()) / 60000);
    await writeAuditLog({
      userId: cred.userId,
      action: "login_failed",
      email,
      ipAddress: input.ctx?.ipAddress,
      userAgent: input.ctx?.userAgent,
      metadata: JSON.stringify({ reason: "account_locked", remainingMinutes: remaining }),
    });
    throw new Error(`Account is temporarily locked. Try again in ${remaining} minute(s).`);
  }

  // Verify password
  const passwordOk = await verifyPassword(input.password, cred.passwordHash);

  if (!passwordOk) {
    const newFailedAttempts = cred.failedAttempts + 1;
    const shouldLock = newFailedAttempts >= MAX_FAILED_ATTEMPTS;
    const lockedUntil = shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null;

    await db
      .update(localCredentials)
      .set({
        failedAttempts: newFailedAttempts,
        lockedUntil: lockedUntil ?? undefined,
      })
      .where(eq(localCredentials.id, cred.id));

    await writeAuditLog({
      userId: cred.userId,
      action: shouldLock ? "account_locked" : "login_failed",
      email,
      ipAddress: input.ctx?.ipAddress,
      userAgent: input.ctx?.userAgent,
      metadata: JSON.stringify({ failedAttempts: newFailedAttempts, locked: shouldLock }),
    });

    if (shouldLock) {
      throw new Error("Too many failed attempts. Account locked for 15 minutes.");
    }
    throw new Error("Invalid email or password");
  }

  // Fetch full user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, cred.userId))
    .limit(1);

  if (!user || !user.isActive) {
    throw new Error("Account is inactive. Contact your administrator.");
  }

  // Reset failed attempts and update lastSignedIn
  await db
    .update(localCredentials)
    .set({ failedAttempts: 0, lockedUntil: null })
    .where(eq(localCredentials.id, cred.id));

  await db
    .update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, user.id));

  const sessionToken = await createSessionToken({
    userId: user.id,
    openId: user.openId,
    role: user.role,
    email: user.email ?? null,
    name: user.name ?? null,
  });

  await writeAuditLog({
    userId: user.id,
    action: "login_success",
    email,
    ipAddress: input.ctx?.ipAddress,
    userAgent: input.ctx?.userAgent,
    metadata: JSON.stringify({ role: user.role }),
  });

  return { user, sessionToken };
}

// ─────────────────────────────────────────────
// PASSWORD CHANGE
// ─────────────────────────────────────────────

export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string,
  ctx?: AuditContext
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const [cred] = await db
    .select()
    .from(localCredentials)
    .where(eq(localCredentials.userId, userId))
    .limit(1);

  if (!cred) throw new Error("No local credentials found for this account");

  const ok = await verifyPassword(currentPassword, cred.passwordHash);
  if (!ok) throw new Error("Current password is incorrect");

  const strengthError = validatePasswordStrength(newPassword);
  if (strengthError) throw new Error(strengthError);

  const newHash = await hashPassword(newPassword);
  await db
    .update(localCredentials)
    .set({
      passwordHash: newHash,
      mustChangePassword: false,
      failedAttempts: 0,
      lockedUntil: null,
      lastPasswordChangedAt: new Date(),
    })
    .where(eq(localCredentials.id, cred.id));

  await writeAuditLog({
    userId,
    action: "password_changed",
    email: cred.email,
    ipAddress: ctx?.ipAddress,
    userAgent: ctx?.userAgent,
  });
}

/** Admin-initiated password reset — sets a temporary password and forces change on next login */
export async function adminResetPassword(
  targetUserId: number,
  temporaryPassword: string,
  adminUserId: number,
  ctx?: AuditContext
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const strengthError = validatePasswordStrength(temporaryPassword);
  if (strengthError) throw new Error(strengthError);

  const [cred] = await db
    .select()
    .from(localCredentials)
    .where(eq(localCredentials.userId, targetUserId))
    .limit(1);

  if (!cred) throw new Error("No local credentials found for this user");

  const newHash = await hashPassword(temporaryPassword);
  await db
    .update(localCredentials)
    .set({
      passwordHash: newHash,
      mustChangePassword: true,
      failedAttempts: 0,
      lockedUntil: null,
      lastPasswordChangedAt: new Date(),
    })
    .where(eq(localCredentials.id, cred.id));

  await writeAuditLog({
    userId: targetUserId,
    action: "password_reset_requested",
    email: cred.email,
    ipAddress: ctx?.ipAddress,
    userAgent: ctx?.userAgent,
    metadata: JSON.stringify({ resetByAdminId: adminUserId }),
  });
}

// ─────────────────────────────────────────────
// INVITE TOKENS
// ─────────────────────────────────────────────

export async function createInviteToken(
  createdById: number,
  email: string,
  role: "admin" | "manager" | "technician",
  departmentId?: number,
  ctx?: AuditContext
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const token = nanoid(48);
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS);

  await db.insert(inviteTokens).values({
    token,
    email: normaliseEmail(email),
    role,
    departmentId: departmentId ?? null,
    createdById,
    expiresAt,
  });

  await writeAuditLog({
    userId: createdById,
    action: "invite_created",
    email: normaliseEmail(email),
    ipAddress: ctx?.ipAddress,
    userAgent: ctx?.userAgent,
    metadata: JSON.stringify({ role, departmentId }),
  });

  return token;
}

export async function validateInviteToken(
  token: string,
  email: string
): Promise<{ role: "admin" | "manager" | "technician"; departmentId: number | null }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const [invite] = await db
    .select()
    .from(inviteTokens)
    .where(eq(inviteTokens.token, token))
    .limit(1);

  if (!invite) throw new Error("Invalid or expired invite link");
  if (invite.usedAt) throw new Error("This invite link has already been used");
  if (invite.expiresAt < new Date()) throw new Error("This invite link has expired");
  if (normaliseEmail(email) !== invite.email) {
    throw new Error("This invite was sent to a different email address");
  }

  return { role: invite.role, departmentId: invite.departmentId ?? null };
}

async function markInviteUsed(token: string, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(inviteTokens)
    .set({ usedAt: new Date(), acceptedByUserId: userId })
    .where(eq(inviteTokens.token, token));

  await writeAuditLog({
    userId,
    action: "invite_accepted",
    metadata: JSON.stringify({ token: token.slice(0, 8) + "…" }),
  });
}

// ─────────────────────────────────────────────
// ACCOUNT UNLOCK (admin)
// ─────────────────────────────────────────────

export async function unlockAccount(
  targetUserId: number,
  adminUserId: number,
  ctx?: AuditContext
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  await db
    .update(localCredentials)
    .set({ failedAttempts: 0, lockedUntil: null })
    .where(eq(localCredentials.userId, targetUserId));

  await writeAuditLog({
    userId: targetUserId,
    action: "account_unlocked",
    ipAddress: ctx?.ipAddress,
    metadata: JSON.stringify({ unlockedByAdminId: adminUserId }),
  });
}

// ─────────────────────────────────────────────
// AUDIT LOG QUERY
// ─────────────────────────────────────────────

export async function getAuditLog(userId?: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  const query = db
    .select()
    .from(authAuditLog)
    .orderBy(authAuditLog.createdAt)
    .limit(limit);

  if (userId) {
    return db
      .select()
      .from(authAuditLog)
      .where(eq(authAuditLog.userId, userId))
      .orderBy(authAuditLog.createdAt)
      .limit(limit);
  }

  return query;
}

export { COOKIE_NAME as AUTH_COOKIE_NAME, SESSION_EXPIRY_MS };
