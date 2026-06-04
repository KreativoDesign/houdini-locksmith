import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

/**
 * ClientDashboard Tests
 * 
 * Tests for the tRPC procedures that power the Client Dashboard:
 * - quotes.getClientQuotes() - Fetch quotes for a specific client
 * - jobCards.getClientJobs() - Fetch jobs for a specific client
 * - quotes.markAsPaid() - Accept a quote (client action)
 */

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createMockContext(role: "admin" | "manager" | "technician" | "user", userId: number): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `Test ${role}`,
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("ClientDashboard Procedures", () => {
  let adminCaller: ReturnType<typeof appRouter.createCaller>;
  let technicianCaller: ReturnType<typeof appRouter.createCaller>;

  // Test data
  const TEST_CLIENT_ID = 1;
  const TEST_ADMIN_USER_ID = 1;
  const TEST_TECHNICIAN_USER_ID = 391241;

  beforeAll(() => {
    // Create admin caller
    const adminContext = createMockContext("admin", TEST_ADMIN_USER_ID);
    adminCaller = appRouter.createCaller(adminContext);

    // Create technician caller
    const technicianContext = createMockContext("technician", TEST_TECHNICIAN_USER_ID);
    technicianCaller = appRouter.createCaller(technicianContext);
  });

  describe("quotes.getClientQuotes", () => {
    it("should return quotes for a specific client (admin access)", async () => {
      const quotes = await adminCaller.quotes.getClientQuotes({ clientId: TEST_CLIENT_ID });
      
      expect(Array.isArray(quotes)).toBe(true);
      
      // If quotes exist, verify structure
      if (quotes.length > 0) {
        const quote = quotes[0];
        expect(quote).toHaveProperty("id");
        expect(quote).toHaveProperty("quoteNumber");
        expect(quote).toHaveProperty("status");
        expect(quote).toHaveProperty("grandTotal");
        expect(quote).toHaveProperty("createdAt");
        expect(quote).toHaveProperty("expiresAt");
        expect(quote).toHaveProperty("description");
        
        // Verify quote status is one of the valid values
        expect(["draft", "sent", "accepted", "rejected", "expired"]).toContain(quote.status);
      }
    });

    it("should filter quotes by clientId", async () => {
      const quotes = await adminCaller.quotes.getClientQuotes({ clientId: TEST_CLIENT_ID });
      
      // All quotes should belong to the specified client
      quotes.forEach((quote) => {
        expect(quote.clientId).toBe(TEST_CLIENT_ID);
      });
    });

    it("should return empty array for client with no quotes", async () => {
      // Use a non-existent client ID
      const quotes = await adminCaller.quotes.getClientQuotes({ clientId: 999999 });
      
      expect(Array.isArray(quotes)).toBe(true);
      expect(quotes.length).toBe(0);
    });

    it("should throw FORBIDDEN error for technician access", async () => {
      try {
        await technicianCaller.quotes.getClientQuotes({ clientId: TEST_CLIENT_ID });
        expect.fail("Should have thrown FORBIDDEN error");
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
      }
    });

    it("should include client information in response", async () => {
      const quotes = await adminCaller.quotes.getClientQuotes({ clientId: TEST_CLIENT_ID });
      
      if (quotes.length > 0) {
        const quote = quotes[0];
        expect(quote).toHaveProperty("client");
        if (quote.client) {
          expect(quote.client).toHaveProperty("firstName");
          expect(quote.client).toHaveProperty("lastName");
          expect(quote.client).toHaveProperty("email");
        }
      }
    });
  });

  describe("jobCards.getClientJobs", () => {
    it("should return jobs for a specific client (admin access)", async () => {
      const jobs = await adminCaller.jobCards.getClientJobs({ clientId: TEST_CLIENT_ID });
      
      expect(Array.isArray(jobs)).toBe(true);
      
      // If jobs exist, verify structure
      if (jobs.length > 0) {
        const job = jobs[0];
        expect(job).toHaveProperty("id");
        expect(job).toHaveProperty("jobNumber");
        expect(job).toHaveProperty("status");
        expect(job).toHaveProperty("title");
        expect(job).toHaveProperty("createdAt");
        expect(job).toHaveProperty("scheduledDate");
        
        // Verify job status is one of the valid values
        expect(["pending", "assigned", "in_progress", "completed", "cancelled"]).toContain(job.status);
      }
    });

    it("should filter jobs by clientId", async () => {
      const jobs = await adminCaller.jobCards.getClientJobs({ clientId: TEST_CLIENT_ID });
      
      // All jobs should belong to the specified client
      jobs.forEach((job) => {
        expect(job.clientId).toBe(TEST_CLIENT_ID);
      });
    });

    it("should return empty array for client with no jobs", async () => {
      // Use a non-existent client ID
      const jobs = await adminCaller.jobCards.getClientJobs({ clientId: 999999 });
      
      expect(Array.isArray(jobs)).toBe(true);
      expect(jobs.length).toBe(0);
    });

    it("should throw FORBIDDEN error for technician access", async () => {
      try {
        await technicianCaller.jobCards.getClientJobs({ clientId: TEST_CLIENT_ID });
        expect.fail("Should have thrown FORBIDDEN error");
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
      }
    });

    it("should include job details in response", async () => {
      const jobs = await adminCaller.jobCards.getClientJobs({ clientId: TEST_CLIENT_ID });
      
      if (jobs.length > 0) {
        const job = jobs[0];
        expect(job).toHaveProperty("description");
        expect(job).toHaveProperty("priority");
        expect(job).toHaveProperty("assignedTechnicianId");
      }
    });
  });

  describe("quotes.markAsPaid (Accept Quote)", () => {
    it("should mark a sent quote as accepted", async () => {
      // First, get a sent quote
      const quotes = await adminCaller.quotes.getClientQuotes({ clientId: TEST_CLIENT_ID });
      const sentQuote = quotes.find((q) => q.status === "sent");
      
      if (!sentQuote) {
        // Skip test if no sent quote available
        console.log("No sent quote available for testing");
        return;
      }
      
      const result = await adminCaller.quotes.markAsPaid({ id: sentQuote.id });
      
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("status");
      expect(result.status).toBe("accepted");
      expect(result).toHaveProperty("acceptedAt");
      expect(result.acceptedAt).toBeDefined();
    });

    it("should throw error when accepting non-sent quote", async () => {
      // Get a quote that's not in 'sent' status
      const quotes = await adminCaller.quotes.getClientQuotes({ clientId: TEST_CLIENT_ID });
      const nonSentQuote = quotes.find((q) => q.status !== "sent");
      
      if (!nonSentQuote) {
        // Skip test if all quotes are sent
        console.log("All quotes are in 'sent' status");
        return;
      }
      
      try {
        await adminCaller.quotes.markAsPaid({ id: nonSentQuote.id });
        expect.fail("Should have thrown error");
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
        expect(error.message).toContain("Cannot process payment for quote with status");
      }
    });

    it("should throw error for non-existent quote", async () => {
      try {
        await adminCaller.quotes.markAsPaid({ id: 999999 });
        expect.fail("Should have thrown error");
      } catch (error: any) {
        // Error code could be NOT_FOUND or BAD_REQUEST depending on implementation
        expect(["NOT_FOUND", "BAD_REQUEST"]).toContain(error.code);
      }
    });

    it("should set acceptedAt timestamp when accepting quote", async () => {
      const quotes = await adminCaller.quotes.getClientQuotes({ clientId: TEST_CLIENT_ID });
      const sentQuote = quotes.find((q) => q.status === "sent");
      
      if (!sentQuote) {
        console.log("No sent quote available for testing");
        return;
      }
      
      const beforeTime = new Date();
      const result = await adminCaller.quotes.markAsPaid({ id: sentQuote.id });
      const afterTime = new Date();
      
      expect(result.acceptedAt).toBeDefined();
      const acceptedTime = new Date(result.acceptedAt);
      expect(acceptedTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(acceptedTime.getTime()).toBeLessThanOrEqual(afterTime.getTime() + 1000); // +1s buffer
    });
  });

  describe("ClientDashboard Data Consistency", () => {
    it("should return consistent data across multiple calls", async () => {
      const quotes1 = await adminCaller.quotes.getClientQuotes({ clientId: TEST_CLIENT_ID });
      const quotes2 = await adminCaller.quotes.getClientQuotes({ clientId: TEST_CLIENT_ID });
      
      expect(quotes1.length).toBe(quotes2.length);
      
      // Verify same quotes returned in same order
      for (let i = 0; i < quotes1.length; i++) {
        expect(quotes1[i].id).toBe(quotes2[i].id);
        expect(quotes1[i].quoteNumber).toBe(quotes2[i].quoteNumber);
      }
    });

    it("should return jobs and quotes for same client", async () => {
      const quotes = await adminCaller.quotes.getClientQuotes({ clientId: TEST_CLIENT_ID });
      const jobs = await adminCaller.jobCards.getClientJobs({ clientId: TEST_CLIENT_ID });
      
      // Both should be arrays
      expect(Array.isArray(quotes)).toBe(true);
      expect(Array.isArray(jobs)).toBe(true);
      
      // Both should have same clientId
      quotes.forEach((q) => expect(q.clientId).toBe(TEST_CLIENT_ID));
      jobs.forEach((j) => expect(j.clientId).toBe(TEST_CLIENT_ID));
    });

    it("should handle large datasets efficiently", async () => {
      const startTime = Date.now();
      const quotes = await adminCaller.quotes.getClientQuotes({ clientId: TEST_CLIENT_ID });
      const endTime = Date.now();
      
      // Should complete within reasonable time (2 seconds)
      expect(endTime - startTime).toBeLessThan(2000);
      expect(Array.isArray(quotes)).toBe(true);
    });
  });

  describe("ClientDashboard Authorization", () => {
    it("should only allow admin/manager to fetch client quotes", async () => {
      try {
        await technicianCaller.quotes.getClientQuotes({ clientId: TEST_CLIENT_ID });
        expect.fail("Technician should not have access");
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
      }
    });

    it("should only allow admin/manager to fetch client jobs", async () => {
      try {
        await technicianCaller.jobCards.getClientJobs({ clientId: TEST_CLIENT_ID });
        expect.fail("Technician should not have access");
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
      }
    });

    it("should allow admin to accept quotes", async () => {
      const quotes = await adminCaller.quotes.getClientQuotes({ clientId: TEST_CLIENT_ID });
      const sentQuote = quotes.find((q) => q.status === "sent");
      
      if (!sentQuote) {
        console.log("No sent quote available for testing");
        return;
      }
      
      const result = await adminCaller.quotes.markAsPaid({ id: sentQuote.id });
      expect(result.status).toBe("accepted");
    });
  });
});
