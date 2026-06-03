import { z } from "zod";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { customerPortalLinks, portalLinkHistory, jobCards, quotes } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";

/**
 * Generate a secure random token for portal links
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export const portalRouter = router({
  /**
   * Generate a new portal link for a job card
   * Admin only
   */
  generateLink: adminProcedure
    .input(
      z.object({
        jobCardId: z.number().int().positive(),
        quoteId: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify job card exists
      const jobCard = await db
        .select()
        .from(jobCards)
        .where(eq(jobCards.id, input.jobCardId))
        .limit(1);

      if (!jobCard || jobCard.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job card not found",
        });
      }

      // Verify quote exists if provided
      if (input.quoteId) {
        const quote = await db
          .select()
          .from(quotes)
          .where(eq(quotes.id, input.quoteId))
          .limit(1);

        if (!quote || quote.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Quote not found",
          });
        }
      }

      // Check if a link already exists for this job
      const existingLink = await db
        .select()
        .from(customerPortalLinks)
        .where(
          and(
            eq(customerPortalLinks.jobCardId, input.jobCardId),
            eq(customerPortalLinks.isActive, true)
          )
        )
        .limit(1);

      if (existingLink && existingLink.length > 0) {
        // Return existing active link
        return {
          token: existingLink[0].token,
          url: `${process.env.VITE_APP_URL || "https://houdinilock-rhvefken.manus.space"}/portal/${existingLink[0].token}`,
          createdAt: existingLink[0].createdAt,
        };
      }

      // Generate new token
      const token = generateToken();

      // Create new portal link
      await db.insert(customerPortalLinks).values({
        jobCardId: input.jobCardId,
        quoteId: input.quoteId || null,
        token,
        isActive: true,
      });

      return {
        token,
        url: `${process.env.VITE_APP_URL || "https://houdinilock-rhvefken.manus.space"}/portal/${token}`,
        createdAt: new Date(),
      };
    }),

  /**
   * Get job and quote details for a portal link
   * Public - no authentication required
   */
  getPortalData: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Find the portal link
      const portalLink = await db
        .select()
        .from(customerPortalLinks)
        .where(
          and(
            eq(customerPortalLinks.token, input.token),
            eq(customerPortalLinks.isActive, true)
          )
        )
        .limit(1);

      if (!portalLink || portalLink.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Portal link not found or has been deactivated",
        });
      }

      const link = portalLink[0];

      // Get job card and quote
      const jobCard = await db
        .select()
        .from(jobCards)
        .where(eq(jobCards.id, link.jobCardId))
        .limit(1);

      const quote = link.quoteId
        ? await db
            .select()
            .from(quotes)
            .where(eq(quotes.id, link.quoteId))
            .limit(1)
        : null;

      // Log the access
      await db.insert(portalLinkHistory).values({
        portalLinkId: link.id,
        action: "view",
        metadata: JSON.stringify({
          timestamp: new Date().toISOString(),
        }),
      });

      return {
        jobCard: jobCard[0] || null,
        quote: quote ? quote[0] : null,
      };
    }),

  /**
   * Get invoice details for payment
   * Public - no authentication required
   */
  getInvoiceData: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Find the portal link
      const portalLink = await db
        .select()
        .from(customerPortalLinks)
        .where(
          and(
            eq(customerPortalLinks.token, input.token),
            eq(customerPortalLinks.isActive, true)
          )
        )
        .limit(1);

      if (!portalLink || portalLink.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Portal link not found or has been deactivated",
        });
      }

      const link = portalLink[0];

      // Get quote
      const quote = link.quoteId
        ? await db
            .select()
            .from(quotes)
            .where(eq(quotes.id, link.quoteId))
            .limit(1)
        : null;

      // Get job card
      const jobCard = await db
        .select()
        .from(jobCards)
        .where(eq(jobCards.id, link.jobCardId))
        .limit(1);

      // Log the access
      await db.insert(portalLinkHistory).values({
        portalLinkId: link.id,
        action: "view_invoice",
        metadata: JSON.stringify({
          timestamp: new Date().toISOString(),
        }),
      });

      return {
        quote: quote ? quote[0] : null,
        jobCard: jobCard[0] || null,
      };
    }),

  /**
   * Deactivate a portal link
   * Admin only
   */
  deactivateLink: adminProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input: { token } }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(customerPortalLinks)
        .set({ isActive: false })
        .where(eq(customerPortalLinks.token, token));

      return { success: true };
    }),

  /**
   * Get portal link history for a job
   * Admin only
   */
  getLinkHistory: adminProcedure
    .input(z.object({ jobCardId: z.number().int().positive() }))
    .query(async ({ input: { jobCardId } }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Find the portal link for this job
      const portalLink = await db
        .select()
        .from(customerPortalLinks)
        .where(eq(customerPortalLinks.jobCardId, jobCardId))
        .limit(1);

      if (!portalLink || portalLink.length === 0) {
        return [];
      }

      // Get the history
      const history = await db
        .select()
        .from(portalLinkHistory)
        .where(eq(portalLinkHistory.portalLinkId, portalLink[0].id));

      return history;
    }),
});
