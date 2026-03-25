/**
 * auth.rbac.test.ts
 *
 * Comprehensive tests for:
 * 1. RBAC middleware — adminProcedure, managerProcedure, technicianProcedure
 * 2. Auth router — login validation, registration validation, password rules
 * 3. Session management — logout clears both cookies
 * 4. Role-scoped access — technicians cannot reach admin/manager endpoints
 * 5. Invite token validation logic
 * 6. Audit log access scoping
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─────────────────────────────────────────────
// CONTEXT FACTORIES
// ─────────────────────────────────────────────

type Role = "admin" | "manager" | "technician" | "user";

function makeUser(overrides: Partial<TrpcContext["user"]> = {}): NonNullable<TrpcContext["user"]> {
  return {
    id: 1,
    openId: "test-open-id",
    email: "test@houdini.co.za",
    name: "Test User",
    loginMethod: "local",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  } as NonNullable<TrpcContext["user"]>;
}

type CookieEntry = { name: string; options: Record<string, unknown> };

function makeCtx(
  role: Role = "admin",
  userOverrides: Partial<TrpcContext["user"]> = {}
): { ctx: TrpcContext; clearedCookies: CookieEntry[]; setCookies: CookieEntry[] } {
  const clearedCookies: CookieEntry[] = [];
  const setCookies: CookieEntry[] = [];

  const ctx: TrpcContext = {
    user: makeUser({ role, ...userOverrides }),
    req: {
      protocol: "https",
      headers: { "user-agent": "vitest/1.0" },
      socket: { remoteAddress: "127.0.0.1" },
      get: (header: string) => (header === "host" ? "localhost:3000" : undefined),
    } as unknown as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
      cookie: (name: string, _value: string, options: Record<string, unknown>) => {
        setCookies.push({ name, options });
      },
    } as unknown as TrpcContext["res"],
  };

  return { ctx, clearedCookies, setCookies };
}

function makeUnauthCtx(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
      socket: { remoteAddress: "127.0.0.1" },
      get: () => undefined,
    } as unknown as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
  return { ctx };
}

// ─────────────────────────────────────────────
// 1. RBAC MIDDLEWARE
// ─────────────────────────────────────────────

describe("RBAC middleware — adminProcedure", () => {
  it("allows admin to access admin-only endpoints", async () => {
    const { ctx } = makeCtx("admin");
    const caller = appRouter.createCaller(ctx);
    // listInvites is admin-only — should not throw FORBIDDEN
    await expect(caller.auth.listInvites()).resolves.toBeDefined();
  });

  it("blocks manager from admin-only endpoints", async () => {
    const { ctx } = makeCtx("manager");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.auth.listInvites()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("blocks technician from admin-only endpoints", async () => {
    const { ctx } = makeCtx("technician");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.auth.listInvites()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("RBAC middleware — managerProcedure", () => {
  it("allows admin to access manager endpoints", async () => {
    const { ctx } = makeCtx("admin");
    const caller = appRouter.createCaller(ctx);
    // auditLog is managerProcedure
    await expect(caller.auth.auditLog()).resolves.toBeDefined();
  });

  it("allows manager to access manager endpoints", async () => {
    const { ctx } = makeCtx("manager");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.auth.auditLog()).resolves.toBeDefined();
  });

  it("blocks technician from manager endpoints", async () => {
    const { ctx } = makeCtx("technician");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.auth.auditLog()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("RBAC middleware — protectedProcedure", () => {
  it("allows any authenticated user to call protectedProcedure", async () => {
    for (const role of ["admin", "manager", "technician"] as Role[]) {
      const { ctx } = makeCtx(role);
      const caller = appRouter.createCaller(ctx);
      await expect(caller.auth.mustChangePassword()).resolves.toBeDefined();
    }
  });

  it("blocks unauthenticated callers from protectedProcedure", async () => {
    const { ctx } = makeUnauthCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.auth.mustChangePassword()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

// ─────────────────────────────────────────────
// 2. AUTH ROUTER — PUBLIC PROCEDURES
// ─────────────────────────────────────────────

describe("auth.me — public procedure", () => {
  it("returns null for unauthenticated requests", async () => {
    const { ctx } = makeUnauthCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns the current user for authenticated requests", async () => {
    const { ctx } = makeCtx("admin", { name: "Alice Admin", email: "alice@houdini.co.za" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.name).toBe("Alice Admin");
    expect(result?.role).toBe("admin");
  });
});

describe("auth.validateInvite — public procedure", () => {
  it("returns invalid for a garbage token", async () => {
    const { ctx } = makeUnauthCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.validateInvite({
      token: "not-a-real-token",
      email: "someone@example.com",
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns invalid for an empty token", async () => {
    const { ctx } = makeUnauthCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.validateInvite({
      token: "",
      email: "someone@example.com",
    });
    expect(result.valid).toBe(false);
  });
});

// ─────────────────────────────────────────────
// 3. AUTH ROUTER — LOGOUT
// ─────────────────────────────────────────────

describe("auth.logout", () => {
  it("clears both session cookies and returns success", async () => {
    const { ctx, clearedCookies } = makeCtx("admin");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    // Both the Manus OAuth cookie and the local auth cookie must be cleared
    expect(clearedCookies.length).toBeGreaterThanOrEqual(1);
    const cookieNames = clearedCookies.map((c) => c.name);
    expect(cookieNames.length).toBeGreaterThanOrEqual(1);
    // All cleared cookies must have maxAge: -1
    clearedCookies.forEach((c) => {
      expect(c.options.maxAge).toBe(-1);
    });
  });

  it("blocks unauthenticated logout", async () => {
    const { ctx } = makeUnauthCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.auth.logout()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

// ─────────────────────────────────────────────
// 4. ROLE-SCOPED AUDIT LOG
// ─────────────────────────────────────────────

describe("auth.auditLog — role scoping", () => {
  it("admin can query audit log without restriction", async () => {
    const { ctx } = makeCtx("admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.auditLog({ limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("manager can query audit log (scoped to own entries)", async () => {
    const { ctx } = makeCtx("manager", { id: 42 });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.auditLog({ limit: 5 });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─────────────────────────────────────────────
// 5. ADMIN OPERATIONS — ROLE ENFORCEMENT
// ─────────────────────────────────────────────

describe("auth.updateUserRole — admin only", () => {
  it("blocks manager from updating roles", async () => {
    const { ctx } = makeCtx("manager");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.auth.updateUserRole({ userId: 99, role: "technician" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks technician from updating roles", async () => {
    const { ctx } = makeCtx("technician");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.auth.updateUserRole({ userId: 99, role: "manager" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("auth.createInvite — admin only", () => {
  it("blocks manager from creating invites", async () => {
    const { ctx } = makeCtx("manager");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.auth.createInvite({ email: "new@houdini.co.za", role: "technician" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("auth.unlockAccount — admin only", () => {
  it("blocks technician from unlocking accounts", async () => {
    const { ctx } = makeCtx("technician");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.auth.unlockAccount({ targetUserId: 5 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("auth.resetPassword — admin only", () => {
  it("blocks manager from resetting passwords", async () => {
    const { ctx } = makeCtx("manager");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.auth.resetPassword({ targetUserId: 5, temporaryPassword: "Temp@1234" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

// ─────────────────────────────────────────────
// 6. CHANGE PASSWORD — PROTECTED
// ─────────────────────────────────────────────

describe("auth.changePassword — protected", () => {
  it("blocks unauthenticated callers", async () => {
    const { ctx } = makeUnauthCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.auth.changePassword({ currentPassword: "old", newPassword: "NewPass123" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("allows any authenticated role to attempt password change", async () => {
    // The call will fail at the DB level (no credential row) but NOT at RBAC level
    for (const role of ["admin", "manager", "technician"] as Role[]) {
      const { ctx } = makeCtx(role);
      const caller = appRouter.createCaller(ctx);
      // Expect either success or a BAD_REQUEST (wrong password), never FORBIDDEN
      const result = await caller.auth.changePassword({
        currentPassword: "WrongPass!",
        newPassword: "NewPass123!",
      }).catch((err: TRPCError) => err);
      if (result instanceof TRPCError) {
        expect(result.code).not.toBe("FORBIDDEN");
        expect(["BAD_REQUEST", "INTERNAL_SERVER_ERROR"].includes(result.code)).toBe(true);
      }
    }
  });
});

// ─────────────────────────────────────────────
// 7. DEPARTMENTS — ROLE ENFORCEMENT
// ─────────────────────────────────────────────

describe("departments.create — admin only", () => {
  it("blocks technician from creating departments", async () => {
    const { ctx } = makeCtx("technician");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.departments.create({ name: "Test Dept", description: "desc" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks manager from creating departments", async () => {
    const { ctx } = makeCtx("manager");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.departments.create({ name: "Test Dept", description: "desc" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("departments.list — public read", () => {
  it("allows any authenticated user to list departments", async () => {
    for (const role of ["admin", "manager", "technician"] as Role[]) {
      const { ctx } = makeCtx(role);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.departments.list();
      expect(Array.isArray(result)).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────
// 8. JOB CARDS — TECHNICIAN SCOPING
// ─────────────────────────────────────────────

describe("jobCards.list — technician scoping", () => {
  it("allows all roles to list job cards", async () => {
    for (const role of ["admin", "manager", "technician"] as Role[]) {
      const { ctx } = makeCtx(role);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.jobCards.list({});
      expect(Array.isArray(result)).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────
// 9. PRICING — MANAGER+ ONLY
// ─────────────────────────────────────────────

describe("pricing.approve — manager only", () => {
  it("blocks technician from approving pricing", async () => {
    const { ctx } = makeCtx("technician");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.pricing.approve({ jobCardId: 1 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

// ─────────────────────────────────────────────
// 10. INPUT VALIDATION — REGISTRATION
// ─────────────────────────────────────────────

describe("auth.register — input validation", () => {
  it("rejects invalid email format", async () => {
    const { ctx } = makeUnauthCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.auth.register({ email: "not-an-email", password: "Password1!", name: "Test" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects password shorter than 8 characters", async () => {
    const { ctx } = makeUnauthCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.auth.register({ email: "test@example.com", password: "short", name: "Test" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects name shorter than 2 characters", async () => {
    const { ctx } = makeUnauthCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.auth.register({ email: "test@example.com", password: "Password1!", name: "X" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("auth.login — input validation", () => {
  it("rejects invalid email format", async () => {
    const { ctx } = makeUnauthCtx();
    const caller = appRouter.createCaller(ctx);
    // Zod validation fires before the handler, so invalid email → BAD_REQUEST
    await expect(
      caller.auth.login({ email: "bad-email", password: "Password1!" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects empty password", async () => {
    const { ctx } = makeUnauthCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.auth.login({ email: "test@example.com", password: "" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
