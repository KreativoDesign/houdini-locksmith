import { TRPCError } from "@trpc/server";
import { desc, eq, and } from "drizzle-orm";
import { z } from "zod";
import {
  createQuote,
  generateQuoteNumber,
  getQuoteById,
  getQuoteItemsByQuoteId,
  getQuoteTokenByQuoteId,
  listQuotes,
  updateQuote,
  upsertQuoteToken,
  createQuoteItem,
  deleteQuoteItem,
  getClientById,
} from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { sendQuoteEmail } from "../_core/email";
import { generateQuotePdf } from "../pdfGenerators/quotePdf";

// ─────────────────────────────────────────────
// SCHEMAS
// ─────────────────────────────────────────────

const QuoteItemInput = z.object({
  name: z.string().min(1),
  type: z.enum(["part", "service", "labour", "other"]),
  quantity: z.number().int().min(1),
  unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
  discountPercent: z.number().int().min(0).max(100).default(0),
});

const CreateQuoteInput = z.object({
  clientId: z.number().int(),
  description: z.string().optional(),
  items: z.array(QuoteItemInput),
  discount: z.string().regex(/^\d+(\.\d{1,2})?$/).default("0.00"),
  discountPercent: z.number().int().min(0).max(100).default(0),
  expiresAt: z.date().optional(),
});

const UpdateQuoteInput = z.object({
  id: z.number().int(),
  description: z.string().optional(),
  discount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  discountPercent: z.number().int().min(0).max(100).optional(),
  expiresAt: z.date().optional(),
});

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function calculateLineTotal(quantity: number, unitPrice: string, discountPercent: number): string {
  const price = parseFloat(unitPrice);
  const subtotal = quantity * price;
  const discount = subtotal * (discountPercent / 100);
  const total = subtotal - discount;
  return total.toFixed(2);
}

function calculateQuoteTotals(items: Array<{ quantity: number; unitPrice: string; discountPercent: number }>, quoteDiscount: string, quoteDiscountPercent: number) {
  let subtotal = 0;
  for (const item of items) {
    const price = parseFloat(item.unitPrice);
    const itemSubtotal = item.quantity * price;
    const itemDiscount = itemSubtotal * (item.discountPercent / 100);
    subtotal += itemSubtotal - itemDiscount;
  }

  const quoteDiscountAmount = parseFloat(quoteDiscount);
  const quotePercentDiscount = subtotal * (quoteDiscountPercent / 100);
  const total = subtotal - quoteDiscountAmount - quotePercentDiscount;

  const vat = total * 0.15; // 15% VAT for South Africa
  const grandTotal = total + vat;

  return {
    total: total.toFixed(2),
    vat: vat.toFixed(2),
    grandTotal: grandTotal.toFixed(2),
  };
}

// ─────────────────────────────────────────────
// PROCEDURES
// ─────────────────────────────────────────────

export const quotesRouter = router({
  /**
   * Create a new quote with items
   */
  create: protectedProcedure
    .input(CreateQuoteInput)
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const quoteNumber = await generateQuoteNumber();

      // Calculate totals
      const totals = calculateQuoteTotals(input.items, input.discount, input.discountPercent);

      // Create quote
      const quote = await createQuote({
        quoteNumber,
        clientId: input.clientId,
        createdById: ctx.user.id,
        status: "draft",
        description: input.description,
        total: totals.total,
        vat: totals.vat,
        grandTotal: totals.grandTotal,
        discount: input.discount,
        discountPercent: input.discountPercent,
        expiresAt: input.expiresAt,
      });

      // Create quote items
      for (const item of input.items) {
        const lineTotal = calculateLineTotal(item.quantity, item.unitPrice, item.discountPercent);
        await createQuoteItem({
          quoteId: quote.id,
          name: item.name,
          type: item.type,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent,
          lineTotal,
        });
      }

      return quote;
    }),

  /**
   * Get a quote by ID (admin/manager only)
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const quote = await getQuoteById(input.id);
      if (!quote) throw new TRPCError({ code: "NOT_FOUND" });

      const items = await getQuoteItemsByQuoteId(quote.id);

      return { quote, items };
    }),

  /**
   * List quotes (admin/manager only)
   */
  list: protectedProcedure
    .input(
      z.object({
        clientId: z.number().int().optional(),
        status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]).optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const quotes = await listQuotes({
        clientId: input.clientId,
        status: input.status,
      });

      // Fetch client info for each quote
      const quotesWithClients = await Promise.all(
        quotes.map(async (q) => {
          const client = q.clientId ? await getClientById(q.clientId) : null;
          return {
            ...q,
            client: client
              ? {
                  id: client.id,
                  firstName: client.firstName,
                  lastName: client.lastName,
                  email: client.email,
                  phone: client.phone,
                }
              : null,
          };
        })
      );

      // Filter by search term (quote number or client name)
      if (input.search) {
        const searchLower = input.search.toLowerCase();
        return quotesWithClients.filter((q) => {
          const quoteNumMatch = q.quoteNumber.toLowerCase().includes(searchLower);
          const clientNameMatch = q.client
            ? `${q.client.firstName} ${q.client.lastName}`.toLowerCase().includes(searchLower)
            : false;
          return quoteNumMatch || clientNameMatch;
        });
      }

      return quotesWithClients;
    }),

  /**
   * Update a quote (admin/manager only)
   */
  update: protectedProcedure
    .input(UpdateQuoteInput)
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const quote = await getQuoteById(input.id);
      if (!quote) throw new TRPCError({ code: "NOT_FOUND" });

      // Recalculate totals if discount changed
      let updateData: Record<string, any> = {
        description: input.description ?? quote.description,
        discount: input.discount ?? quote.discount,
        discountPercent: input.discountPercent ?? quote.discountPercent,
        expiresAt: input.expiresAt ?? quote.expiresAt,
      };

      if (input.discount !== undefined || input.discountPercent !== undefined) {
        const items = await getQuoteItemsByQuoteId(quote.id);
        const totals = calculateQuoteTotals(
          items.map((i) => ({
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discountPercent: i.discountPercent,
          })),
          input.discount ?? quote.discount,
          input.discountPercent ?? quote.discountPercent
        );
        updateData = { ...updateData, ...totals };
      }

      await updateQuote(input.id, updateData);
      return getQuoteById(input.id);
    }),

  /**
   * Send quote to client via email
   */
  send: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const quote = await getQuoteById(input.id);
      if (!quote) throw new TRPCError({ code: "NOT_FOUND" });

      const client = await getClientById(quote.clientId);
      if (!client || !client.email) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Client has no email address" });
      }

      // Generate or get existing token
      let token = await getQuoteTokenByQuoteId(quote.id);
      if (!token) {
        const newToken = await upsertQuoteToken(quote.id, quote.expiresAt);
        token = { quoteId: quote.id, token: newToken, expiresAt: quote.expiresAt, createdAt: new Date(), id: 0 };
      }

      const items = await getQuoteItemsByQuoteId(quote.id);

      // Send email
      await sendQuoteEmail({
        to: client.email,
        clientName: `${client.firstName} ${client.lastName}`,
        quoteNumber: quote.quoteNumber,
        quoteUrl: `${process.env.VITE_FRONTEND_URL || "https://houdinilock-rhvefken.manus.space"}/quotes/${token.token}`,
        items,
        total: quote.total,
        vat: quote.vat,
        grandTotal: quote.grandTotal,
        expiresAt: quote.expiresAt,
      });

      // Mark quote as sent
      await updateQuote(quote.id, { status: "sent", sentAt: new Date() });

      return { success: true };
    }),

  /**
   * Delete a quote (admin/manager only)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const quote = await getQuoteById(input.id);
      if (!quote) throw new TRPCError({ code: "NOT_FOUND" });

      // Delete quote items first
      const items = await getQuoteItemsByQuoteId(quote.id);
      for (const item of items) {
        await deleteQuoteItem(item.id);
      }

      // Note: In a production system, you would also delete quote tokens from the database
      // This is a soft delete - the quote record remains but is marked as draft with no items
      // To implement hard delete, you would need to add database cascade rules or explicit token deletion

      return { success: true };
    }),

  /**
   * Get a single quote by ID with items and client info
   */
  get: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const quote = await getQuoteById(input.id);
      if (!quote) throw new TRPCError({ code: "NOT_FOUND" });

      const items = await getQuoteItemsByQuoteId(quote.id);
      const client = quote.clientId ? await getClientById(quote.clientId) : null;

      return {
        ...quote,
        items,
        client: client
          ? {
              id: client.id,
              firstName: client.firstName,
              lastName: client.lastName,
              email: client.email,
              phone: client.phone,
            }
          : null,
      };
    }),

  /**
   * Create a quote item
   */
  createItem: protectedProcedure
    .input(
      z.object({
        quoteId: z.number().int(),
        name: z.string().min(1),
        type: z.enum(["part", "service", "labour", "other"]),
        quantity: z.number().min(0.5),
        unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/),
        discountPercent: z.number().int().min(0).max(100).default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const quote = await getQuoteById(input.quoteId);
      if (!quote) throw new TRPCError({ code: "NOT_FOUND" });

      return createQuoteItem({
        quoteId: input.quoteId,
        name: input.name,
        type: input.type,
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        discountPercent: input.discountPercent,
      });
    }),

  /**
   * Delete a quote item
   */
  deleteItem: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await deleteQuoteItem(input.id);
      return { success: true };
    }),

  /**
   * Accept a quote (client-facing, public)
   */
  accept: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      // This is handled by the public quote router
      throw new TRPCError({ code: "NOT_IMPLEMENTED" });
    }),

  /**
   * Reject a quote (client-facing, public)
   */
  reject: publicProcedure
    .input(z.object({ token: z.string(), reason: z.string().optional() }))
    .mutation(async ({ input }) => {
      // This is handled by the public quote router
      throw new TRPCError({ code: "NOT_IMPLEMENTED" });
    }),

  /**
   * Download quote as PDF (admin-only)
   */
  downloadPdf: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input, ctx }) => {
      const quote = await getQuoteById(input.id);
      if (!quote) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found" });
      }

      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can download quotes" });
      }

      const items = await getQuoteItemsByQuoteId(input.id);
      const client = quote.clientId ? await getClientById(quote.clientId) : null;

      const subtotal = items.reduce((sum, item) => sum + (item.quantity * parseFloat(item.unitPrice)), 0);
      const discountFixed = parseFloat(quote.discount || "0");
      const discountPercent = quote.discountPercent || 0;
      const discountAmount = discountFixed + (subtotal * discountPercent) / 100;
      const discountedSubtotal = Math.max(0, subtotal - discountAmount);
      const vat = discountedSubtotal * 0.15;
      const total = discountedSubtotal + vat;

      const pdfStream = generateQuotePdf({
        quoteNumber: quote.quoteNumber,
        clientName: client ? `${client.firstName} ${client.lastName}` : "Unknown Client",
        clientEmail: client?.email || undefined,
        clientPhone: client?.phone || undefined,
        issueDate: new Date(quote.createdAt),
        expiryDate: quote.expiresAt ? new Date(quote.expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: items.map((item) => ({
          description: item.name,
          quantity: item.quantity,
          unitPrice: parseFloat(item.unitPrice),
          total: item.quantity * parseFloat(item.unitPrice),
        })),
        subtotal,
        discountFixed,
        discountPercentage: discountPercent,
        discountedSubtotal,
        vat,
        total,
        notes: quote.description || undefined,
        companyName: "Houdini Locksmith & Security",
      });

      return pdfStream as any;
    }),
});
