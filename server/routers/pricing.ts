import { z } from "zod";
import { randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
import {
  createJobPricing,
  getJobCardById,
  getJobPricingById,
  getJobPricingByJobCard,
  getClientById,
  getClientPortalTokenByJobCard,
  listJobItems,
  createJobDocument,
  updateJobCard,
  updateJobPricing,
  upsertClientPortalToken,
} from "../db";
import { adminProcedure, managerProcedure, technicianProcedure, emitNotification } from "./middleware";
import { router } from "../_core/trpc";
import { sendInvoiceEmail } from "../_core/email";
import { generateInvoicePdf } from "../_core/invoicePdf";
import { storagePut } from "../storage";

/** Compute pricing totals */
export function computeTotals(
  labourCost: number,
  partsCost: number,
  additionalFees: number,
  discountAmount: number,
  vatPct: number
) {
  const subtotal = labourCost + partsCost + additionalFees - discountAmount;
  const vatAmount = subtotal * (vatPct / 100);
  const total = subtotal + vatAmount;
  return {
    subtotal: subtotal.toFixed(2),
    vatAmount: vatAmount.toFixed(2),
    total: total.toFixed(2),
  };
}

/** Split job-card items into the invoice's labour and materials buckets. */
export function getJobItemCosts(items: Awaited<ReturnType<typeof listJobItems>>) {
  return items.reduce(
    (costs, item) => {
      const amount = Number(item.lineTotal) || 0;
      costs.itemTotal += amount;
      if (item.type === "labour") {
        costs.labourCost += amount;
      } else {
        costs.partsCost += amount;
      }
      return costs;
    },
    { labourCost: 0, partsCost: 0, itemTotal: 0 }
  );
}

/** Repair a legacy R0 pricing record from the authoritative job-card item values. */
async function synchronizePricingFromJobItems(pricing: NonNullable<Awaited<ReturnType<typeof getJobPricingByJobCard>>>) {
  const itemCosts = getJobItemCosts(await listJobItems(pricing.jobCardId));
  if (itemCosts.itemTotal <= 0 || (Number(pricing.total) || 0) > 0) {
    return { pricing, itemCosts };
  }

  const totals = computeTotals(
    itemCosts.labourCost,
    itemCosts.partsCost,
    Number(pricing.additionalFees) || 0,
    Number(pricing.discountAmount) || 0,
    Number(pricing.vatPct) || 15
  );

  await updateJobPricing(pricing.id, {
    labourCost: itemCosts.labourCost.toFixed(2),
    partsCost: itemCosts.partsCost.toFixed(2),
    subtotal: totals.subtotal,
    vatAmount: totals.vatAmount,
    total: totals.total,
  });

  return { pricing: (await getJobPricingById(pricing.id)) ?? pricing, itemCosts };
}

export const pricingRouter = router({
  /** Get pricing for a job card */
  getByJobCard: technicianProcedure
    .input(z.object({ jobCardId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return getJobPricingByJobCard(input.jobCardId);
    }),

  /**
   * Create a pricing record for a completed job.
   * Only available when job status is 'awaiting_pricing' or 'completed'.
   * Optionally auto-populates parts cost from job items.
   */
  create: managerProcedure
    .input(
      z.object({
        jobCardId: z.number().int().positive(),
        labourCost: z.number().nonnegative(),
        partsCost: z.number().nonnegative().optional(),
        additionalFees: z.number().nonnegative().optional(),
        discountAmount: z.number().nonnegative().optional(),
        vatPercentage: z.number().nonnegative().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const job = await getJobCardById(input.jobCardId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

      if (!["awaiting_pricing", "completed"].includes(job.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot create pricing for job with status: ${job.status}`,
        });
      }

      const itemCosts = getJobItemCosts(await listJobItems(input.jobCardId));
      const useJobItemCosts = input.labourCost === 0 && (input.partsCost === undefined || input.partsCost === 0);
      const labourCost = useJobItemCosts ? itemCosts.labourCost : input.labourCost;
      const partsCost = useJobItemCosts ? itemCosts.partsCost : input.partsCost ?? 0;
      const additionalFees = input.additionalFees ?? 0;
      const discountAmount = input.discountAmount ?? 0;
      const vatPercentage = input.vatPercentage ?? 15;

      const { subtotal, vatAmount, total } = computeTotals(
        labourCost,
        partsCost,
        additionalFees,
        discountAmount,
        vatPercentage
      );

      const pricing = await createJobPricing({
        jobCardId: input.jobCardId,
        labourCost: labourCost.toString(),
        partsCost: partsCost.toString(),
        additionalFees: additionalFees.toString(),
        discountAmount: discountAmount.toString(),
        vatPct: vatPercentage.toString(),
        subtotal,
        vatAmount,
        total,
        status: "draft",
        notes: input.notes,
      });

      await updateJobCard(input.jobCardId, { status: "awaiting_pricing" });

      return pricing;
    }),

  /** Synchronize legacy pricing records before they are approved or invoiced. */
  synchronizeFromJobItems: managerProcedure
    .input(z.object({ jobCardId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const pricing = await getJobPricingByJobCard(input.jobCardId);
      if (!pricing) throw new TRPCError({ code: "NOT_FOUND", message: "No pricing found for this job" });
      if (pricing.status === "invoiced") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "An invoiced pricing record cannot be changed" });
      }
      return synchronizePricingFromJobItems(pricing);
    }),

  /** Request approval for pricing */
  requestApproval: managerProcedure
    .input(z.object({ pricingId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const pricing = await updateJobPricing(input.pricingId, { status: "pending_approval" });
      return pricing;
    }),

  /** Approve pricing */
  approve: adminProcedure
    .input(z.object({ pricingId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const pricing = await getJobPricingById(input.pricingId);
      if (!pricing) throw new TRPCError({ code: "NOT_FOUND", message: "Pricing record not found" });

      const synchronized = await synchronizePricingFromJobItems(pricing);
      if (synchronized.itemCosts.itemTotal > 0 && (Number(synchronized.pricing.total) || 0) <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Pricing cannot be approved while billable job items total more than R0.00 but the invoice total is R0.00.",
        });
      }

      await updateJobPricing(input.pricingId, {
        status: "approved",
        approvedById: ctx.user.id,
        approvedAt: new Date(),
      });
      await updateJobCard(pricing.jobCardId, { status: "priced" });
      return getJobPricingById(input.pricingId);
    }),

  /** Reject pricing and request changes */
  reject: adminProcedure
    .input(z.object({ pricingId: z.number().int().positive(), reason: z.string().optional() }))
    .mutation(async ({ input }) => {
      const pricing = await updateJobPricing(input.pricingId, { status: "draft", notes: input.reason });
      return pricing;
    }),

  /** Generate and send invoice with PDF attachment */
  generateAndSendInvoice: managerProcedure
    .input(
      z.object({
        jobCardId: z.number().int().positive(),
        origin: z.string().url(),
        paymentTerms: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const job = await getJobCardById(input.jobCardId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job card not found" });

      const storedPricing = await getJobPricingByJobCard(input.jobCardId);
      const pricing = storedPricing ? (await synchronizePricingFromJobItems(storedPricing)).pricing : undefined;
      if (!pricing) throw new TRPCError({ code: "NOT_FOUND", message: "No pricing found for this job" });
      if (pricing.status !== "approved") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only approved pricing can be invoiced" });
      }

      const client = job.clientId ? await getClientById(job.clientId) : null;
      if (!client) throw new TRPCError({ code: "BAD_REQUEST", message: "Client record not found" });

      const clientName = `${client.firstName} ${client.lastName}`.trim();
      const totalAmount = parseFloat(pricing.total as any);
      const jobItems = await listJobItems(input.jobCardId);

      // Publish every invoice to an unguessable client portal URL first, so the
      // customer can access it even when email delivery is temporarily blocked.
      const existingPortalToken = await getClientPortalTokenByJobCard(input.jobCardId);
      const portalToken = existingPortalToken?.token ?? randomBytes(32).toString("hex");
      await upsertClientPortalToken({ jobCardId: input.jobCardId, token: portalToken, expiresAt: null });
      const portalUrl = `${input.origin}/client-portal/${portalToken}`;

      // Generate PDF invoice
      let pdfBuffer: Buffer | undefined;
      let invoicePdfUrl: string | undefined;

      try {
        const invoiceNumber = `INV-${job.jobNumber}`;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30); // 30 days payment terms

        pdfBuffer = await generateInvoicePdf({
          invoiceNumber,
          jobNumber: job.jobNumber,
          jobTitle: job.title,
          clientName,
          clientEmail: client.email ?? "",
          clientPhone: client.phone,
          clientAddress: client.address || undefined,
          jobDescription: job.description || undefined,
          lineItems: jobItems.map((item) => ({
            description: item.name,
            quantity: parseFloat(item.quantity as any) || 1,
            unitPrice: parseFloat(item.unitPrice as any) || 0,
            total: parseFloat(item.lineTotal as any) || 0,
          })),
          labourCost: parseFloat(pricing.labourCost as any) || 0,
          partsCost: parseFloat(pricing.partsCost as any) || 0,
          additionalFees: parseFloat(pricing.additionalFees as any) || 0,
          discountAmount: parseFloat(pricing.discountAmount as any) || 0,
          vatPercentage: parseFloat(pricing.vatPct as any) || 0,
          subtotal: parseFloat(pricing.subtotal as any) || 0,
          vatAmount: parseFloat(pricing.vatAmount as any) || 0,
          total: totalAmount,
          currency: pricing.currency || "ZAR",
          paymentTerms: input.paymentTerms || "Due within 30 days",
          issuedDate: new Date(),
          dueDate,
          portalUrl,
        });

        // Store PDF in S3 for archival
        const pdfKey = `invoices/${job.id}/${randomBytes(18).toString("hex")}.pdf`;
        const { url } = await storagePut(pdfKey, pdfBuffer, "application/pdf");
        invoicePdfUrl = url;
        await createJobDocument({
          jobCardId: input.jobCardId,
          category: "document",
          fileName: `Invoice-${job.jobNumber}.pdf`,
          mimeType: "application/pdf",
          fileSize: pdfBuffer.length,
          fileUrl: url,
          fileKey: pdfKey,
          description: "Client invoice PDF",
        });
      } catch (pdfError) {
        console.warn("[Invoice] Failed to generate PDF:", pdfError);
        // Continue without PDF - email will still be sent
      }

      // Send invoice email with PDF attachment
      const emailDelivery = await sendInvoiceEmail(
        {
          to: client.email ?? "",
          clientName,
          jobNumber: job.jobNumber,
          jobTitle: job.title,
          totalAmount,
          portalUrl,
          invoiceDate: new Date(),
          paymentTerms: input.paymentTerms || "Due upon receipt",
        },
        pdfBuffer
      );

      // The invoice is live in the secure portal before notification is attempted.
      await updateJobPricing(pricing.id, { status: "invoiced" });

      if (!emailDelivery.sent) {
        const deliveryMessage = emailDelivery.failureCode === "sender_domain_unverified"
          ? "Invoice has been published to the secure client portal, but email delivery is unavailable until the Houdini sending domain is verified in Resend. Share the portal link with the client or verify houdini.co.za to enable email delivery."
          : emailDelivery.failureCode === "invalid_recipient"
            ? "Invoice has been published to the secure client portal, but the client email address is invalid. Update the email address before retrying delivery."
            : "Invoice has been published to the secure client portal, but email delivery is currently unavailable. Share the portal link with the client or retry shortly.";

        console.warn("[Invoice] Email delivery blocked", {
          jobCardId: input.jobCardId,
          failureCode: emailDelivery.failureCode,
        });

        await emitNotification({
          type: "pricing_approved",
          title: "Invoice Published to Client Portal",
          message: `Invoice for job ${job.jobNumber} is available in the client portal. Email delivery is blocked: ${emailDelivery.failureCode ?? "unknown"}.`,
          entityType: "job_card",
          entityId: input.jobCardId,
          notifyOwnerPush: true,
        });

        return {
          success: true,
          emailSent: false,
          invoicePdfUrl,
          portalUrl,
          deliveryBlocked: emailDelivery.failureCode,
          deliveryMessage,
        };
      }

      // Emit notification
      await emitNotification({
        type: "pricing_approved",
        title: "Invoice Published and Sent",
        message: `Invoice for job ${job.jobNumber} has been published to the client portal and sent to ${client.email}. Total: ${pricing.currency} ${pricing.total}.`,
        entityType: "job_card",
        entityId: input.jobCardId,
        notifyOwnerPush: true,
      });

      return { success: true, emailSent: true, invoicePdfUrl, portalUrl, deliveryBlocked: null, deliveryMessage: null };
    }),
});
