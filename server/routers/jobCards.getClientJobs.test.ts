import { describe, it, expect } from "vitest";
import { appRouter } from "../routers";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "../_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(role: "admin" | "manager" | "technician" = "manager"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "test",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("jobCards.getClientJobs", () => {
  it("should return jobs for a specific client", async () => {
    const ctx = createContext("manager");
    const caller = appRouter.createCaller(ctx);

    // Call the procedure
    const result = await caller.jobCards.getClientJobs({ clientId: 1 });

    // Should return an array
    expect(Array.isArray(result)).toBe(true);

    // Each job should have the expected structure
    result.forEach((job) => {
      expect(job).toHaveProperty("id");
      expect(job).toHaveProperty("jobNumber");
      expect(job).toHaveProperty("clientId");
      expect(job).toHaveProperty("status");
      expect(job).toHaveProperty("title");
    });
  });

  it("should throw FORBIDDEN error for non-manager/admin users", async () => {
    const ctx = createContext("technician");
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.jobCards.getClientJobs({ clientId: 1 });
      expect.fail("Should have thrown FORBIDDEN error");
    } catch (error) {
      if (error instanceof TRPCError) {
        expect(error.code).toBe("FORBIDDEN");
      } else {
        throw error;
      }
    }
  });

  it("should filter jobs by clientId", async () => {
    const ctx = createContext("manager");
    const caller = appRouter.createCaller(ctx);

    // Get jobs for client 1
    const result = await caller.jobCards.getClientJobs({ clientId: 1 });

    // All jobs should have clientId = 1
    result.forEach((job) => {
      expect(job.clientId).toBe(1);
    });
  });

  it("should return empty array for client with no jobs", async () => {
    const ctx = createContext("manager");
    const caller = appRouter.createCaller(ctx);

    // Try a client ID that likely has no jobs
    const result = await caller.jobCards.getClientJobs({ clientId: 999999 });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("should work for admin users as well", async () => {
    const ctx = createContext("admin");
    const caller = appRouter.createCaller(ctx);

    // Admin should also be able to call this
    const result = await caller.jobCards.getClientJobs({ clientId: 1 });

    expect(Array.isArray(result)).toBe(true);
  });
});
