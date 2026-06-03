import { describe, it, expect } from "vitest";
import { appRouter } from "../routers";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "../_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(role: "admin" | "manager" | "technician" = "admin"): TrpcContext {
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

describe("quotes.getClientQuotes", () => {
  it("should return quotes for a specific client", async () => {
    const ctx = createContext("admin");
    const caller = appRouter.createCaller(ctx);

    // Call the procedure
    const result = await caller.quotes.getClientQuotes({ clientId: 1 });

    // Should return an array
    expect(Array.isArray(result)).toBe(true);

    // Each quote should have the expected structure
    result.forEach((quote) => {
      expect(quote).toHaveProperty("id");
      expect(quote).toHaveProperty("quoteNumber");
      expect(quote).toHaveProperty("clientId");
      expect(quote).toHaveProperty("status");
      expect(quote).toHaveProperty("client");
    });
  });

  it("should throw FORBIDDEN error for non-admin/manager users", async () => {
    const ctx = createContext("technician");
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.quotes.getClientQuotes({ clientId: 1 });
      expect.fail("Should have thrown FORBIDDEN error");
    } catch (error) {
      if (error instanceof TRPCError) {
        expect(error.code).toBe("FORBIDDEN");
      } else {
        throw error;
      }
    }
  });

  it("should filter quotes by clientId", async () => {
    const ctx = createContext("admin");
    const caller = appRouter.createCaller(ctx);

    // Get quotes for client 1
    const result = await caller.quotes.getClientQuotes({ clientId: 1 });

    // All quotes should have clientId = 1
    result.forEach((quote) => {
      expect(quote.clientId).toBe(1);
    });
  });

  it("should return empty array for client with no quotes", async () => {
    const ctx = createContext("admin");
    const caller = appRouter.createCaller(ctx);

    // Try a client ID that likely has no quotes
    const result = await caller.quotes.getClientQuotes({ clientId: 999999 });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("should include client information in the response", async () => {
    const ctx = createContext("admin");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.quotes.getClientQuotes({ clientId: 1 });

    // If there are quotes, check that client info is included
    if (result.length > 0) {
      const quote = result[0];
      expect(quote.client).toBeDefined();
      if (quote.client) {
        expect(quote.client).toHaveProperty("id");
        expect(quote.client).toHaveProperty("firstName");
        expect(quote.client).toHaveProperty("lastName");
        expect(quote.client).toHaveProperty("email");
        expect(quote.client).toHaveProperty("phone");
      }
    }
  });
});
