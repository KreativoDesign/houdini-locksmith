import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "../db";
import { jobCards, jobStatusHistory, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { appRouter } from "../routers";
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

describe("Job Timeline Procedures", () => {
  let db: any;
  let testJobId: number;
  let testUserId: number;
  let caller: any;

  beforeAll(async () => {
    db = await getDb();
    
    // Create a test user
    const users_result = await db
      .insert(users)
      .values({
        openId: `test-user-${Date.now()}`,
        name: "Test User",
        email: "test@example.com",
        role: "admin",
      });
    
    testUserId = users_result[0]?.insertId || 1;

    // Create a test job
    const jobs_result = await db
      .insert(jobCards)
      .values({
        jobNumber: `JC-TEST-${Date.now()}`,
        clientId: 1,
        enquiryId: null,
        departmentId: 1,
        assignedTechnicianId: null,
        assignedManagerId: testUserId,
        title: "Test Job for Timeline",
        description: "Testing job timeline procedures",
        status: "pending",
        priority: "normal",
        estimatedDuration: 60,
        actualDuration: null,
        scheduledDate: new Date(),
        completedDate: null,
      });
    
    testJobId = jobs_result[0]?.insertId || 1;

    // Create initial status history entry
    await db
      .insert(jobStatusHistory)
      .values({
        jobCardId: testJobId,
        previousStatus: null,
        newStatus: "pending",
        changedBy: testUserId,
        notes: "Job created",
      });

    // Create caller with mock context
    const context = createContext("admin");
    caller = appRouter.createCaller(context);
  });

  afterAll(async () => {
    // Clean up test data
    if (db && testJobId) {
      await db
        .delete(jobStatusHistory)
        .where(eq(jobStatusHistory.jobCardId, testJobId));
      
      await db
        .delete(jobCards)
        .where(eq(jobCards.id, testJobId));
    }
  });

  it("should fetch job timeline with status history", async () => {
    const context = createContext("admin");
    const caller = appRouter.createCaller(context);
    const timeline = await caller.jobTimeline.getJobTimeline({
      jobCardId: testJobId,
    });

    expect(timeline).toBeDefined();
    expect(Array.isArray(timeline)).toBe(true);
    expect(timeline.length).toBeGreaterThan(0);
    
    // Verify first entry is the job creation
    const firstEntry = timeline[0];
    expect(firstEntry.jobCardId).toBe(testJobId);
    expect(firstEntry.newStatus).toBe("pending");
    expect(firstEntry.statusLabel).toBe("Pending");
  });

  it("should fetch recent status changes with limit", async () => {
    // Add another status change
    await db
      .insert(jobStatusHistory)
      .values({
        jobCardId: testJobId,
        previousStatus: "pending",
        newStatus: "assigned",
        changedBy: testUserId,
        notes: "Job assigned to technician",
      });

    const context = createContext("admin");
    const caller = appRouter.createCaller(context);
    const recentChanges = await caller.jobTimeline.getRecentStatusChanges({
      jobCardId: testJobId,
      limit: 5,
    });

    expect(recentChanges).toBeDefined();
    expect(Array.isArray(recentChanges)).toBe(true);
    expect(recentChanges.length).toBeLessThanOrEqual(5);
  });

  it("should fetch current job status", async () => {
    const context = createContext("admin");
    const caller = appRouter.createCaller(context);
    const currentStatus = await caller.jobTimeline.getCurrentStatus({
      jobCardId: testJobId,
    });

    expect(currentStatus).toBeDefined();
    expect(currentStatus.status).toBeDefined();
    expect(currentStatus.statusLabel).toBeDefined();
    expect(currentStatus.createdAt).toBeDefined();
  });

  it("should return pending status for job with no history", async () => {
    // Create a new job without status history
    const newJobResult = await db
      .insert(jobCards)
      .values({
        jobNumber: `JC-NO-HISTORY-${Date.now()}`,
        clientId: 1,
        enquiryId: null,
        departmentId: 1,
        assignedTechnicianId: null,
        assignedManagerId: testUserId,
        title: "Job with no history",
        description: "Testing no history scenario",
        status: "pending",
        priority: "normal",
        estimatedDuration: 60,
        actualDuration: null,
        scheduledDate: new Date(),
        completedDate: null,
      });
    
    const newJobId = newJobResult[0]?.insertId;

    try {
      const context = createContext("admin");
      const caller = appRouter.createCaller(context);
      const currentStatus = await caller.jobTimeline.getCurrentStatus({
        jobCardId: newJobId,
      });

      expect(currentStatus.status).toBe("pending");
      expect(currentStatus.statusLabel).toBe("Pending");
    } finally {
      // Clean up
      await db
        .delete(jobCards)
        .where(eq(jobCards.id, newJobId));
    }
  });

  it("should format status labels correctly", async () => {
    const context = createContext("admin");
    const caller = appRouter.createCaller(context);
    const timeline = await caller.jobTimeline.getJobTimeline({
      jobCardId: testJobId,
    });

    const statusLabels = timeline.map((entry: any) => entry.statusLabel);
    
    // Verify status labels are properly formatted
    statusLabels.forEach((label: string) => {
      expect(label).toBeTruthy();
      expect(typeof label).toBe("string");
      // Status labels should be capitalized
      expect(label[0]).toBe(label[0].toUpperCase());
    });
  });

  it("should include timestamps in timeline entries", async () => {
    const context = createContext("admin");
    const caller = appRouter.createCaller(context);
    const timeline = await caller.jobTimeline.getJobTimeline({
      jobCardId: testJobId,
    });

    timeline.forEach((entry: any) => {
      expect(entry.timestamp).toBeDefined();
      expect(typeof entry.timestamp).toBe("string");
      // Verify it's a valid ISO timestamp
      expect(new Date(entry.timestamp).getTime()).toBeGreaterThan(0);
    });
  });
});
