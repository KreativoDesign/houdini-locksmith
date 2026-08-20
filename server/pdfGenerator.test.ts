import { afterEach, describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import { generateJobCardPdf } from "./pdfGenerator";

describe("job-card PDF layout", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("generates a branded PDF when client and job fields require multiple wrapped lines", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    const pdf = await generateJobCardPdf({
      jobNumber: "JC-2026-0020",
      title: "Comprehensive CCTV camera and access-control installation for a multi-unit commercial property",
      description: "Install, test, and demonstrate an integrated security solution with camera coverage and keypad access for all authorised personnel.",
      status: "priced",
      priority: "normal",
      scheduledDate: new Date("2026-08-20T09:00:00Z"),
      createdAt: new Date("2026-08-20T08:00:00Z"),
      clientName: "Yvonne du Preez",
      clientPhone: "083 709 0021",
      clientAlternatePhone: "041 365 7565",
      clientEmail: "yvonne.du.preez@example.co.za",
      clientAddress: "Tuscan Villas, 313 Cape Road, Newton Park, Gqeberha",
      clientCity: "Gqeberha",
      clientPostalCode: "6070",
      technicianName: "Willie Woodhead",
      managerName: "Jamie Woodhead",
      departmentName: "Security Systems and Access Control",
      technicianNotes: "All equipment was tested with the client and the operating controls were demonstrated.",
      managerNotes: "Pricing has been reviewed and approved for client invoicing.",
      items: [
        {
          name: "High-definition outdoor CCTV camera with weatherproof mounting and setup",
          type: "part",
          quantity: "1",
          unitPrice: "1800.00",
          discountPct: "0",
          lineTotal: "1800.00",
        },
      ],
      photos: [],
      signerName: "Yvonne du Preez",
      signerRole: "Client representative",
      signedAt: new Date("2026-08-20T11:31:00Z"),
    });

    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(1_000);
    expect((await PDFDocument.load(pdf)).getPageCount()).toBe(1);
  });
});
