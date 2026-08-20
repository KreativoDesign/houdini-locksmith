import { afterEach, describe, expect, it, vi } from "vitest";
import { generateInvoicePdf } from "./_core/invoicePdf";

describe("generateInvoicePdf", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("generates a branded PDF from approved line items and ZAR totals", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as typeof fetch;

    const pdf = await generateInvoicePdf({
      invoiceNumber: "INV-810001",
      jobNumber: "810001",
      jobTitle: "Security lock replacement",
      clientName: "Jamie Britz",
      clientEmail: "jamie@example.com",
      clientPhone: "041 365 7565",
      lineItems: [
        { description: "High security lock", quantity: 2, unitPrice: 450, total: 900 },
        { description: "Installation labour", quantity: 1, unitPrice: 900, total: 900 },
      ],
      labourCost: 900,
      partsCost: 900,
      additionalFees: 0,
      discountAmount: 0,
      vatPercentage: 15,
      subtotal: 1800,
      vatAmount: 270,
      total: 2070,
      currency: "ZAR",
      paymentTerms: "Due within 30 days",
      issuedDate: new Date("2026-08-20T00:00:00Z"),
      dueDate: new Date("2026-09-19T00:00:00Z"),
      portalUrl: "https://houdinilock-rhvefken.manus.space/client-portal/a".repeat(1),
      logoUrl: "https://example.com/unavailable-logo.png",
    });

    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(1200);
  });
});
