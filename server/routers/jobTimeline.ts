import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { jobStatusHistory } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Job Timeline Router
 * Procedures for fetching and managing job status history
 */

export const jobTimelineRouter = router({
  /**
   * Get job status timeline - returns all status changes for a job
   * Used to display timeline on client dashboard and job detail pages
   */
  getJobTimeline: protectedProcedure
    .input(z.object({ jobCardId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();

      try {
        const db_instance = await db;
        if (!db_instance) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        const timeline = await db_instance
          .select()
          .from(jobStatusHistory)
          .where(eq(jobStatusHistory.jobCardId, input.jobCardId))
          .orderBy(jobStatusHistory.createdAt);

        return timeline.map((entry: any) => ({
          id: entry.id,
          jobCardId: entry.jobCardId,
          previousStatus: entry.previousStatus,
          newStatus: entry.newStatus,
          changedBy: entry.changedBy,
          notes: entry.notes,
          createdAt: entry.createdAt,
          // Format status for display
          statusLabel: formatStatus(entry.newStatus),
          timestamp: entry.createdAt.toISOString(),
        }));
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch job timeline",
        });
      }
    }),

  /**
   * Get recent job status changes - returns last N status changes
   * Used for quick status overview
   */
  getRecentStatusChanges: protectedProcedure
    .input(
      z.object({
        jobCardId: z.number(),
        limit: z.number().default(5),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = getDb();

      try {
        const db_instance = await db;
        if (!db_instance) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        const recentChanges = await db_instance
          .select()
          .from(jobStatusHistory)
          .where(eq(jobStatusHistory.jobCardId, input.jobCardId))
          .orderBy(jobStatusHistory.createdAt)
          .limit(input.limit);

        return recentChanges.map((entry: any) => ({
          id: entry.id,
          newStatus: entry.newStatus,
          statusLabel: formatStatus(entry.newStatus),
          createdAt: entry.createdAt,
          timestamp: entry.createdAt.toISOString(),
          notes: entry.notes,
        }));
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch recent status changes",
        });
      }
    }),

  /**
   * Get current job status - returns the most recent status
   * Used to display current job state
   */
  getCurrentStatus: protectedProcedure
    .input(z.object({ jobCardId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();

      try {
        const db_instance = await db;
        if (!db_instance) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        const latestStatus = await db_instance
          .select()
          .from(jobStatusHistory)
          .where(eq(jobStatusHistory.jobCardId, input.jobCardId))
          .orderBy(jobStatusHistory.createdAt)
          .limit(1);

        if (latestStatus.length === 0) {
          return {
            status: "pending",
            statusLabel: "Pending",
            createdAt: new Date(),
          };
        }

        const latest = latestStatus[0] as any;
        return {
          status: latest.newStatus,
          statusLabel: formatStatus(latest.newStatus),
          createdAt: latest.createdAt,
          timestamp: latest.createdAt.toISOString(),
          notes: latest.notes,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch current job status",
        });
      }
    }),
});

/**
 * Format status for display
 */
function formatStatus(status: string | null): string {
  if (!status) return "Unknown";

  const statusMap: Record<string, string> = {
    pending: "Pending",
    assigned: "Assigned",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return statusMap[status] || status;
}

/**
 * Get status badge color
 */
export function getStatusBadgeColor(
  status: string | null
): { bg: string; text: string } {
  const colorMap: Record<string, { bg: string; text: string }> = {
    pending: { bg: "bg-yellow-100", text: "text-yellow-800" },
    assigned: { bg: "bg-blue-100", text: "text-blue-800" },
    in_progress: { bg: "bg-orange-100", text: "text-orange-800" },
    completed: { bg: "bg-green-100", text: "text-green-800" },
    cancelled: { bg: "bg-red-100", text: "text-red-800" },
  };

  return colorMap[status || "pending"] || colorMap.pending;
}
