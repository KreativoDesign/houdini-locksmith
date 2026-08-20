import { describe, it, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { clientPortalRouter } from "./clientPortal";
import * as db from "../db";

// Mock the database functions
vi.mock("../db", () => ({
  getJobCardById: vi.fn(),
  getClientById: vi.fn(),
  getClientPortalToken: vi.fn(),
  getClientPortalTokenByJobCard: vi.fn(),
  getClientPortalDashboardSummary: vi.fn().mockResolvedValue({ recentJobs: [], pendingInvoices: [] }),
  upsertClientPortalToken: vi.fn(),
  getSignatureByJobCard: vi.fn(),
  listJobDocuments: vi.fn(),
  listJobItems: vi.fn(),
  getJobPricingByJobCard: vi.fn(),
  getUserById: vi.fn(),
  getSlotById: vi.fn(),
  getQuoteTokenByToken: vi.fn(),
  getQuoteById: vi.fn(),
  getQuoteItemsByQuoteId: vi.fn(),
  updateQuote: vi.fn(),
}));

// Mock email service
vi.mock("../_core/email", () => ({
  sendClientPortalEmail: vi.fn().mockResolvedValue(true),
}));

describe("clientPortalRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authorization Tests", () => {
    it("should reject unauthenticated users from generateLink", async () => {
      const caller = clientPortalRouter.createCaller({} as any);

      await expect(
        caller.generateLink({
          jobCardId: 1,
          origin: "https://example.com",
        })
      ).rejects.toThrow();
    });

    it("should reject technician users from generateLink", async () => {
      const caller = clientPortalRouter.createCaller({
        user: { id: 1, role: "technician" },
      } as any);

      await expect(
        caller.generateLink({
          jobCardId: 1,
          origin: "https://example.com",
        })
      ).rejects.toThrow();
    });

    it("should allow manager users to generateLink", async () => {
      const mockJob = {
        id: 1,
        jobNumber: "JC-2026-0001",
        description: "Test job",
        clientId: 1,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockToken = {
        token: "a".repeat(64),
        jobCardId: 1,
        expiresAt: null,
      };

      vi.mocked(db.getJobCardById).mockResolvedValue(mockJob as any);
      vi.mocked(db.getClientPortalTokenByJobCard).mockResolvedValue(mockToken as any);

      const caller = clientPortalRouter.createCaller({
        user: { id: 1, role: "manager" },
      } as any);

      const result = await caller.generateLink({
        jobCardId: 1,
        origin: "https://example.com",
      });

      expect(result).toHaveProperty("token");
    });

    it("should allow admin users to generateLink", async () => {
      const mockJob = {
        id: 1,
        jobNumber: "JC-2026-0001",
        description: "Test job",
        clientId: 1,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockToken = {
        token: "a".repeat(64),
        jobCardId: 1,
        expiresAt: null,
      };

      vi.mocked(db.getJobCardById).mockResolvedValue(mockJob as any);
      vi.mocked(db.getClientPortalTokenByJobCard).mockResolvedValue(mockToken as any);

      const caller = clientPortalRouter.createCaller({
        user: { id: 1, role: "admin" },
      } as any);

      const result = await caller.generateLink({
        jobCardId: 1,
        origin: "https://example.com",
      });

      expect(result).toHaveProperty("token");
    });

    it("should reject unauthenticated users from getLink", async () => {
      const caller = clientPortalRouter.createCaller({} as any);

      await expect(
        caller.getLink({ jobCardId: 1 })
      ).rejects.toThrow();
    });

    it("should reject technician users from getLink", async () => {
      const caller = clientPortalRouter.createCaller({
        user: { id: 1, role: "technician" },
      } as any);

      await expect(
        caller.getLink({ jobCardId: 1 })
      ).rejects.toThrow();
    });

    it("should allow public access to getJobStatus", async () => {
      const mockToken = {
        token: "a".repeat(64),
        jobCardId: 1,
        expiresAt: null,
      };

      const mockJob = {
        id: 1,
        jobNumber: "JC-2026-0001",
        description: "Test job",
        clientId: 1,
        status: "in_progress",
        priority: "normal",
        scheduledDate: new Date(),
        scheduledTimeSlotId: null,
        isSigned: false,
        requiresSignature: true,
        assignedTechnicianId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getClientPortalToken).mockResolvedValue(mockToken as any);
      vi.mocked(db.getJobCardById).mockResolvedValue(mockJob as any);
      vi.mocked(db.getClientById).mockResolvedValue(null);
      vi.mocked(db.getUserById).mockResolvedValue(null);
      vi.mocked(db.getSignatureByJobCard).mockResolvedValue(null);
      vi.mocked(db.listJobDocuments).mockResolvedValue([]);
      vi.mocked(db.listJobItems).mockResolvedValue([]);
      vi.mocked(db.getJobPricingByJobCard).mockResolvedValue(null);
      vi.mocked(db.getSlotById).mockResolvedValue(null);

      // Call without authentication context (public)
      const caller = clientPortalRouter.createCaller({} as any);

      const result = await caller.getJobStatus({
        token: "a".repeat(64),
      });

      expect(result.jobNumber).toBe("JC-2026-0001");
      expect(result.dashboardSummary).toEqual({ recentJobs: [], pendingInvoices: [] });
    });

    it("exposes only the latest published invoice PDF through the secure portal token", async () => {
      const token = { token: "a".repeat(64), jobCardId: 1, expiresAt: null };
      const job = {
        id: 1,
        jobNumber: "JC-2026-0001",
        description: "Test job",
        clientId: 1,
        status: "completed",
        priority: "normal",
        scheduledDate: null,
        scheduledTimeSlotId: null,
        isSigned: false,
        requiresSignature: false,
        assignedTechnicianId: null,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z"),
      };

      vi.mocked(db.getClientPortalToken).mockResolvedValue(token as any);
      vi.mocked(db.getJobCardById).mockResolvedValue(job as any);
      vi.mocked(db.getClientById).mockResolvedValue(null);
      vi.mocked(db.getUserById).mockResolvedValue(null);
      vi.mocked(db.getSignatureByJobCard).mockResolvedValue(null);
      vi.mocked(db.listJobItems).mockResolvedValue([]);
      vi.mocked(db.getSlotById).mockResolvedValue(null);
      vi.mocked(db.getJobPricingByJobCard).mockResolvedValue({ status: "invoiced", subtotal: "100.00", vatAmount: "15.00", total: "115.00", currency: "ZAR" } as any);
      vi.mocked(db.listJobDocuments).mockResolvedValue([
        { category: "document", mimeType: "application/pdf", description: "Client invoice PDF", fileUrl: "https://files.example.com/old.pdf", fileName: "Invoice-old.pdf", createdAt: new Date("2026-01-01T00:00:00Z") },
        { category: "document", mimeType: "application/pdf", description: "Client invoice PDF", fileUrl: "https://files.example.com/latest.pdf", fileName: "Invoice-latest.pdf", createdAt: new Date("2026-01-02T00:00:00Z") },
      ] as any);

      const result = await clientPortalRouter.createCaller({} as any).getJobStatus({ token: "a".repeat(64) });

      expect(result.invoicePdf).toEqual({
        url: "https://files.example.com/latest.pdf",
        fileName: "Invoice-latest.pdf",
      });
    });

    it("should allow public access to getQuoteByToken", async () => {
      const mockQuoteToken = {
        token: "quote-token",
        quoteId: 1,
        expiresAt: null,
      };

      const mockQuote = {
        id: 1,
        status: "pending",
        clientId: 1,
        createdAt: new Date(),
      };

      vi.mocked(db.getQuoteTokenByToken).mockResolvedValue(mockQuoteToken as any);
      vi.mocked(db.getQuoteById).mockResolvedValue(mockQuote as any);
      vi.mocked(db.getQuoteItemsByQuoteId).mockResolvedValue([]);

      // Call without authentication context (public)
      const caller = clientPortalRouter.createCaller({} as any);

      const result = await caller.getQuoteByToken({
        token: "quote-token",
      });

      expect(result.quote.id).toBe(1);
    });

    it("should allow public access to acceptQuote", async () => {
      const mockQuoteToken = {
        token: "quote-token",
        quoteId: 1,
        expiresAt: null,
      };

      const mockQuote = {
        id: 1,
        status: "pending",
        clientId: 1,
        createdAt: new Date(),
      };

      vi.mocked(db.getQuoteTokenByToken).mockResolvedValue(mockQuoteToken as any);
      vi.mocked(db.getQuoteById).mockResolvedValue(mockQuote as any);
      vi.mocked(db.updateQuote).mockResolvedValue(undefined);

      // Call without authentication context (public)
      const caller = clientPortalRouter.createCaller({} as any);

      const result = await caller.acceptQuote({
        token: "quote-token",
      });

      expect(result.success).toBe(true);
    });
  });


  describe("generateLink", () => {
    it("should generate a portal link for a valid job card", async () => {
      const mockJob = {
        id: 1,
        jobNumber: "JC-2026-0001",
        description: "Test job",
        clientId: 1,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockClient = {
        id: 1,
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      };

      const mockToken = {
        token: "a".repeat(64),
        jobCardId: 1,
        expiresAt: null,
      };

      vi.mocked(db.getJobCardById).mockResolvedValue(mockJob as any);
      vi.mocked(db.getClientById).mockResolvedValue(mockClient as any);
      vi.mocked(db.getClientPortalTokenByJobCard).mockResolvedValue(mockToken as any);

      const caller = clientPortalRouter.createCaller({
        user: { id: 1, role: "admin" },
      } as any);

      const result = await caller.generateLink({
        jobCardId: 1,
        origin: "https://example.com",
      });

      expect(result).toHaveProperty("token");
      expect(result).toHaveProperty("url");
      expect(result.url).toContain("/client-portal/");
      expect(result.emailSent).toBe(true);
    });

    it("should throw NOT_FOUND for non-existent job card", async () => {
      vi.mocked(db.getJobCardById).mockResolvedValue(null);

      const caller = clientPortalRouter.createCaller({
        user: { id: 1, role: "admin" },
      } as any);

      await expect(
        caller.generateLink({
          jobCardId: 999,
          origin: "https://example.com",
        })
      ).rejects.toThrow("Job card not found");
    });

    it("should handle expiry days calculation", async () => {
      const mockJob = {
        id: 1,
        jobNumber: "JC-2026-0001",
        description: "Test job",
        clientId: 1,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockToken = {
        token: "a".repeat(64),
        jobCardId: 1,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      vi.mocked(db.getJobCardById).mockResolvedValue(mockJob as any);
      vi.mocked(db.getClientPortalTokenByJobCard).mockResolvedValue(mockToken as any);

      const caller = clientPortalRouter.createCaller({
        user: { id: 1, role: "admin" },
      } as any);

      const result = await caller.generateLink({
        jobCardId: 1,
        expiryDays: 7,
      });

      expect(result.expiresAt).toBeDefined();
      expect(result.expiresAt?.getTime()).toBeGreaterThan(Date.now());
    });

    it("should not send email if client has no email", async () => {
      const mockJob = {
        id: 1,
        jobNumber: "JC-2026-0001",
        description: "Test job",
        clientId: 1,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockClient = {
        id: 1,
        firstName: "John",
        lastName: "Doe",
        email: null,
      };

      const mockToken = {
        token: "a".repeat(64),
        jobCardId: 1,
        expiresAt: null,
      };

      vi.mocked(db.getJobCardById).mockResolvedValue(mockJob as any);
      vi.mocked(db.getClientById).mockResolvedValue(mockClient as any);
      vi.mocked(db.getClientPortalTokenByJobCard).mockResolvedValue(mockToken as any);

      const caller = clientPortalRouter.createCaller({
        user: { id: 1, role: "admin" },
      } as any);

      const result = await caller.generateLink({
        jobCardId: 1,
        origin: "https://example.com",
      });

      expect(result.emailSent).toBe(false);
    });
  });

  describe("getLink", () => {
    it("should retrieve existing portal token", async () => {
      const mockToken = {
        token: "a".repeat(64),
        jobCardId: 1,
        expiresAt: null,
      };

      vi.mocked(db.getClientPortalTokenByJobCard).mockResolvedValue(mockToken as any);

      const caller = clientPortalRouter.createCaller({
        user: { id: 1, role: "admin" },
      } as any);

      const result = await caller.getLink({ jobCardId: 1 });

      expect(result).toEqual({
        token: mockToken.token,
        expiresAt: mockToken.expiresAt,
      });
    });

    it("should return null if no token exists", async () => {
      vi.mocked(db.getClientPortalTokenByJobCard).mockResolvedValue(null);

      const caller = clientPortalRouter.createCaller({
        user: { id: 1, role: "admin" },
      } as any);

      const result = await caller.getLink({ jobCardId: 1 });

      expect(result).toBeNull();
    });
  });

  describe("getJobStatus", () => {
    it("should retrieve job status for valid token", async () => {
      const mockToken = {
        token: "a".repeat(64),
        jobCardId: 1,
        expiresAt: null,
      };

      const mockJob = {
        id: 1,
        jobNumber: "JC-2026-0001",
        description: "Test job",
        clientId: 1,
        status: "in_progress",
        priority: "normal",
        scheduledDate: new Date(),
        scheduledTimeSlotId: 1,
        isSigned: false,
        requiresSignature: true,
        assignedTechnicianId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockClient = {
        id: 1,
        firstName: "John",
        lastName: "Doe",
      };

      const mockTechnician = {
        id: 1,
        name: "Jane Smith",
      };

      const mockSlot = {
        id: 1,
        startTime: "09:00",
        endTime: "10:00",
        slotDate: new Date(),
      };

      vi.mocked(db.getClientPortalToken).mockResolvedValue(mockToken as any);
      vi.mocked(db.getJobCardById).mockResolvedValue(mockJob as any);
      vi.mocked(db.getClientById).mockResolvedValue(mockClient as any);
      vi.mocked(db.getUserById).mockResolvedValue(mockTechnician as any);
      vi.mocked(db.getSignatureByJobCard).mockResolvedValue(null);
      vi.mocked(db.listJobDocuments).mockResolvedValue([]);
      vi.mocked(db.listJobItems).mockResolvedValue([]);
      vi.mocked(db.getJobPricingByJobCard).mockResolvedValue(null);
      vi.mocked(db.getSlotById).mockResolvedValue(mockSlot as any);

      const caller = clientPortalRouter.createCaller({} as any);

      const result = await caller.getJobStatus({
        token: "a".repeat(64),
      });

      expect(result.jobNumber).toBe("JC-2026-0001");
      expect(result.status).toBe("in_progress");
      expect(result.client?.firstName).toBe("John");
      expect(result.technician?.name).toBe("Jane Smith");
      expect(result.statusTimeline).toBeDefined();
      expect(result.statusTimeline.length).toBe(6);
    });

    it("should throw NOT_FOUND for invalid token", async () => {
      vi.mocked(db.getClientPortalToken).mockResolvedValue(null);

      const caller = clientPortalRouter.createCaller({} as any);

      await expect(
        caller.getJobStatus({
          token: "b".repeat(64),
        })
      ).rejects.toThrow("This link is invalid or has expired");
    });

    it("should throw NOT_FOUND if job not found", async () => {
      const mockToken = {
        token: "c".repeat(64),
        jobCardId: 1,
        expiresAt: null,
      };

      vi.mocked(db.getClientPortalToken).mockResolvedValue(mockToken as any);
      vi.mocked(db.getJobCardById).mockResolvedValue(null);

      const caller = clientPortalRouter.createCaller({} as any);

      await expect(
        caller.getJobStatus({
          token: "c".repeat(64),
        })
      ).rejects.toThrow("Job not found");
    });

    it("should include status timeline with correct completion status", async () => {
      const mockToken = {
        token: "d".repeat(64),
        jobCardId: 1,
        expiresAt: null,
      };

      const mockJob = {
        id: 1,
        jobNumber: "JC-2026-0001",
        description: "Test job",
        clientId: 1,
        status: "completed",
        priority: "normal",
        scheduledDate: new Date(),
        scheduledTimeSlotId: null,
        isSigned: true,
        requiresSignature: true,
        assignedTechnicianId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getClientPortalToken).mockResolvedValue(mockToken as any);
      vi.mocked(db.getJobCardById).mockResolvedValue(mockJob as any);
      vi.mocked(db.getClientById).mockResolvedValue(null);
      vi.mocked(db.getUserById).mockResolvedValue(null);
      vi.mocked(db.getSignatureByJobCard).mockResolvedValue(null);
      vi.mocked(db.listJobDocuments).mockResolvedValue([]);
      vi.mocked(db.listJobItems).mockResolvedValue([]);
      vi.mocked(db.getJobPricingByJobCard).mockResolvedValue(null);
      vi.mocked(db.getSlotById).mockResolvedValue(null);

      const caller = clientPortalRouter.createCaller({} as any);

      const result = await caller.getJobStatus({
        token: "d".repeat(64),
      });

      // Check that statuses up to "completed" are marked as completed
      const completedIndex = result.statusTimeline.findIndex((s: any) => s.status === "completed");
      result.statusTimeline.forEach((s: any, idx: number) => {
        if (idx <= completedIndex) {
          expect(s.completed).toBe(true);
        }
      });
    });
  });

  describe("acceptQuote", () => {
    it("should accept a pending quote", async () => {
      const mockQuoteToken = {
        token: "quote-token",
        quoteId: 1,
        expiresAt: null,
      };

      const mockQuote = {
        id: 1,
        status: "pending",
        clientId: 1,
        createdAt: new Date(),
      };

      vi.mocked(db.getQuoteTokenByToken).mockResolvedValue(mockQuoteToken as any);
      vi.mocked(db.getQuoteById).mockResolvedValue(mockQuote as any);
      vi.mocked(db.updateQuote).mockResolvedValue(undefined);

      const caller = clientPortalRouter.createCaller({} as any);

      const result = await caller.acceptQuote({
        token: "quote-token",
      });

      expect(result.success).toBe(true);
      expect(db.updateQuote).toHaveBeenCalledWith(1, expect.objectContaining({
        status: "accepted",
      }));
    });

    it("should throw error if quote already accepted", async () => {
      const mockQuoteToken = {
        token: "quote-token",
        quoteId: 1,
        expiresAt: null,
      };

      const mockQuote = {
        id: 1,
        status: "accepted",
        clientId: 1,
        createdAt: new Date(),
      };

      vi.mocked(db.getQuoteTokenByToken).mockResolvedValue(mockQuoteToken as any);
      vi.mocked(db.getQuoteById).mockResolvedValue(mockQuote as any);

      const caller = clientPortalRouter.createCaller({} as any);

      await expect(
        caller.acceptQuote({
          token: "quote-token",
        })
      ).rejects.toThrow("Quote already accepted");
    });

    it("should throw error if quote rejected", async () => {
      const mockQuoteToken = {
        token: "quote-token",
        quoteId: 1,
        expiresAt: null,
      };

      const mockQuote = {
        id: 1,
        status: "rejected",
        clientId: 1,
        createdAt: new Date(),
      };

      vi.mocked(db.getQuoteTokenByToken).mockResolvedValue(mockQuoteToken as any);
      vi.mocked(db.getQuoteById).mockResolvedValue(mockQuote as any);

      const caller = clientPortalRouter.createCaller({} as any);

      await expect(
        caller.acceptQuote({
          token: "quote-token",
        })
      ).rejects.toThrow("Quote has been rejected");
    });
  });

  describe("rejectQuote", () => {
    it("should reject a pending quote", async () => {
      const mockQuoteToken = {
        token: "quote-token",
        quoteId: 1,
        expiresAt: null,
      };

      const mockQuote = {
        id: 1,
        status: "pending",
        clientId: 1,
        createdAt: new Date(),
      };

      vi.mocked(db.getQuoteTokenByToken).mockResolvedValue(mockQuoteToken as any);
      vi.mocked(db.getQuoteById).mockResolvedValue(mockQuote as any);
      vi.mocked(db.updateQuote).mockResolvedValue(undefined);

      const caller = clientPortalRouter.createCaller({} as any);

      const result = await caller.rejectQuote({
        token: "quote-token",
        reason: "Too expensive",
      });

      expect(result.success).toBe(true);
      expect(db.updateQuote).toHaveBeenCalledWith(1, expect.objectContaining({
        status: "rejected",
        rejectionReason: "Too expensive",
      }));
    });

    it("should throw error if quote already accepted", async () => {
      const mockQuoteToken = {
        token: "quote-token",
        quoteId: 1,
        expiresAt: null,
      };

      const mockQuote = {
        id: 1,
        status: "accepted",
        clientId: 1,
        createdAt: new Date(),
      };

      vi.mocked(db.getQuoteTokenByToken).mockResolvedValue(mockQuoteToken as any);
      vi.mocked(db.getQuoteById).mockResolvedValue(mockQuote as any);

      const caller = clientPortalRouter.createCaller({} as any);

      await expect(
        caller.rejectQuote({
          token: "quote-token",
        })
      ).rejects.toThrow("Quote already accepted");
    });

    it("should throw error if quote already rejected", async () => {
      const mockQuoteToken = {
        token: "quote-token",
        quoteId: 1,
        expiresAt: null,
      };

      const mockQuote = {
        id: 1,
        status: "rejected",
        clientId: 1,
        createdAt: new Date(),
      };

      vi.mocked(db.getQuoteTokenByToken).mockResolvedValue(mockQuoteToken as any);
      vi.mocked(db.getQuoteById).mockResolvedValue(mockQuote as any);

      const caller = clientPortalRouter.createCaller({} as any);

      await expect(
        caller.rejectQuote({
          token: "quote-token",
        })
      ).rejects.toThrow("Quote already rejected");
    });
  });

  describe("getQuoteByToken", () => {
    it("should retrieve quote and items for valid token", async () => {
      const mockQuoteToken = {
        token: "quote-token",
        quoteId: 1,
        expiresAt: null,
      };

      const mockQuote = {
        id: 1,
        status: "pending",
        clientId: 1,
        createdAt: new Date(),
      };

      const mockItems = [
        {
          id: 1,
          quoteId: 1,
          name: "Service 1",
          quantity: 1,
          unitPrice: 100,
        },
      ];

      vi.mocked(db.getQuoteTokenByToken).mockResolvedValue(mockQuoteToken as any);
      vi.mocked(db.getQuoteById).mockResolvedValue(mockQuote as any);
      vi.mocked(db.getQuoteItemsByQuoteId).mockResolvedValue(mockItems as any);

      const caller = clientPortalRouter.createCaller({} as any);

      const result = await caller.getQuoteByToken({
        token: "quote-token",
      });

      expect(result.quote).toEqual(mockQuote);
      expect(result.items).toEqual(mockItems);
    });

    it("should throw NOT_FOUND for invalid token", async () => {
      vi.mocked(db.getQuoteTokenByToken).mockResolvedValue(null);

      const caller = clientPortalRouter.createCaller({} as any);

      await expect(
        caller.getQuoteByToken({
          token: "invalid",
        })
      ).rejects.toThrow("This quote link is invalid or has expired");
    });
  });
});
