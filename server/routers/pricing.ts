import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createJobPricing,
  getJobCardById,
  getJobPricingByJobCard,
  getClientById,
  listJobItems,
  updateJobCard,
  updateJobPricing,
} from "../db";
import { adminProcedure, managerProcedure, technicianProcedure, emitNotification } from "./middleware";
import { router } from "../_core/trpc";
import { sendInvoiceEmail } from "../_core/email";
import { generateInvoicePdf } from "../_core/invoicePdf";
import { storagePut } from "../storage";

/** Compute pricing totals */
function computeTotals(
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

      const labourCost = input.labourCost;
      const partsCost = input.partsCost ?? 0;
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
    .mutation(async ({ input }) => {
      const pricing = await updateJobPricing(input.pricingId, { status: "approved" });
      return pricing;
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
        portalUrl: z.string().url(),
        paymentTerms: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const job = await getJobCardById(input.jobCardId);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job card not found" });

      const pricing = await getJobPricingByJobCard(input.jobCardId);
      if (!pricing) throw new TRPCError({ code: "NOT_FOUND", message: "No pricing found for this job" });
      if (pricing.status !== "approved") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only approved pricing can be invoiced" });
      }

      const client = job.clientId ? await getClientById(job.clientId) : null;
      if (!client || !client.email) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Client email not found" });
      }

      const clientName = `${client.firstName} ${client.lastName}`.trim();
      const totalAmount = parseFloat(pricing.total as any);
      const jobItems = await listJobItems(input.jobCardId);

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
          clientEmail: client.email,
          clientPhone: client.phone,
          clientAddress: client.address || undefined,
          jobDescription: job.description || undefined,
          labourCost: parseFloat(pricing.labourCost as any) || 0,
          partsCost: parseFloat(pricing.partsCost as any) || 0,
          additionalFees: parseFloat(pricing.additionalFees as any) || 0,
          discountAmount: parseFloat(pricing.discountAmount as any) || 0,
          vatPercentage: parseFloat(pricing.vatPct as any) || 0,
          subtotal: parseFloat(pricing.subtotal as any) || 0,
          vatAmount: parseFloat(pricing.vatAmount as any) || 0,
          total: totalAmount,
          currency: pricing.currency || "USD",
          paymentTerms: input.paymentTerms || "Due within 30 days",
          issuedDate: new Date(),
          dueDate,
          portalUrl: input.portalUrl,
        });

        // Store PDF in S3 for archival
        const pdfKey = `invoices/${job.jobNumber}/${invoiceNumber}-${Date.now()}.pdf`;
        const { url } = await storagePut(pdfKey, pdfBuffer, "application/pdf");
        invoicePdfUrl = url;
      } catch (pdfError) {
        console.warn("[Invoice] Failed to generate PDF:", pdfError);
        // Continue without PDF - email will still be sent
      }

      // Send invoice email with PDF attachment
      const emailDelivery = await sendInvoiceEmail(
        {
          to: client.email,
          clientName,
          jobNumber: job.jobNumber,
          jobTitle: job.title,
          totalAmount,
          portalUrl: input.portalUrl,
          invoiceDate: new Date(),
          paymentTerms: input.paymentTerms || "Due upon receipt",
        },
        pdfBuffer
      );

      if (!emailDelivery.sent) {
        const deliveryMessage = emailDelivery.failureCode === "sender_domain_unverified"
          ? "Invoice PDF generated, but email delivery is unavailable until the Houdini sending domain is verified in Resend. Please verify houdini.co.za, then retry this invoice."
          : emailDelivery.failureCode === "invalid_recipient"
            ? "Invoice PDF generated, but the client email address is invalid. Update the client email address and retry."
            : "Invoice PDF generated, but email delivery is currently unavailable. Please retry shortly or check the email configuration.";

        console.warn("[Invoice] Email delivery blocked", {
          jobCardId: input.jobCardId,
          failureCode: emailDelivery.failureCode,
        });

        return {
          success: false,
          emailSent: false,
          invoicePdfUrl,
          deliveryBlocked: emailDelivery.failureCode,
          deliveryMessage,
        };
      }

      // Mark as invoiced
      await updateJobPricing(pricing.id, { status: "invoiced" });

      // Emit notification
      await emitNotification({
        type: "pricing_approved",
        title: "Invoice Sent",
        message: `Invoice for job ${job.jobNumber} has been sent to ${client.email}. Total: ${pricing.currency} ${pricing.total}.`,
        entityType: "job_card",
        entityId: input.jobCardId,
        notifyOwnerPush: true,
      });

      return { success: true, emailSent: true, invoicePdfUrl, deliveryBlocked: null, deliveryMessage: null };
    }),
});
