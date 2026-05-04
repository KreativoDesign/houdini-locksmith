import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

export interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface QuotePdfData {
  quoteNumber: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  issueDate: Date;
  expiryDate: Date;
  items: QuoteItem[];
  subtotal: number;
  discountFixed: number;
  discountPercentage: number;
  discountedSubtotal: number;
  vat: number;
  total: number;
  notes?: string;
  companyName?: string;
  companyPhone?: string;
  companyEmail?: string;
}

/**
 * Generate a professional PDF quote document
 * Returns a readable stream that can be piped to response or file
 */
export function generateQuotePdf(data: QuotePdfData) {
  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
  });

  const stream = new PassThrough();
  doc.pipe(stream);

  // ─────────────────────────────────────────────
  // HEADER
  // ─────────────────────────────────────────────

  // Company name
  doc
    .fontSize(24)
    .font("Helvetica-Bold")
    .text(data.companyName || "Houdini Locksmith & Security", 40, 40);

  // Quote title
  doc
    .fontSize(14)
    .font("Helvetica")
    .text("QUOTE", 40, 75);

  // Quote number and dates (right aligned)
  const rightX = 500;
  doc
    .fontSize(10)
    .font("Helvetica")
    .text(`Quote #: ${data.quoteNumber}`, rightX, 40, { align: "right" })
    .text(`Issue Date: ${data.issueDate.toLocaleDateString()}`, rightX, 55, {
      align: "right",
    })
    .text(`Expiry Date: ${data.expiryDate.toLocaleDateString()}`, rightX, 70, {
      align: "right",
    });

  // ─────────────────────────────────────────────
  // CLIENT DETAILS
  // ─────────────────────────────────────────────

  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .text("Bill To:", 40, 110);

  doc
    .fontSize(10)
    .font("Helvetica")
    .text(data.clientName, 40, 128)
    .text(data.clientEmail || "", 40, 143)
    .text(data.clientPhone || "", 40, 158);

  // ─────────────────────────────────────────────
  // ITEMS TABLE
  // ─────────────────────────────────────────────

  const tableTop = 200;
  const tableLeft = 40;
  const colWidths = {
    description: 280,
    quantity: 70,
    unitPrice: 80,
    total: 80,
  };

  // Table header
  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .rect(tableLeft, tableTop, 510, 20)
    .fill("#f0f0f0")
    .fillAndStroke("#f0f0f0", "#999");

  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor("#000")
    .text("Description", tableLeft + 5, tableTop + 5)
    .text("Qty", tableLeft + colWidths.description + 5, tableTop + 5, {
      width: colWidths.quantity - 10,
      align: "right",
    })
    .text("Unit Price", tableLeft + colWidths.description + colWidths.quantity + 5, tableTop + 5, {
      width: colWidths.unitPrice - 10,
      align: "right",
    })
    .text("Total", tableLeft + colWidths.description + colWidths.quantity + colWidths.unitPrice + 5, tableTop + 5, {
      width: colWidths.total - 10,
      align: "right",
    });

  // Table rows
  let currentY = tableTop + 25;
  const rowHeight = 20;

  data.items.forEach((item) => {
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#000")
      .text(item.description, tableLeft + 5, currentY, {
        width: colWidths.description - 10,
      })
      .text(item.quantity.toString(), tableLeft + colWidths.description + 5, currentY, {
        width: colWidths.quantity - 10,
        align: "right",
      })
      .text(`R${item.unitPrice.toFixed(2)}`, tableLeft + colWidths.description + colWidths.quantity + 5, currentY, {
        width: colWidths.unitPrice - 10,
        align: "right",
      })
      .text(`R${item.total.toFixed(2)}`, tableLeft + colWidths.description + colWidths.quantity + colWidths.unitPrice + 5, currentY, {
        width: colWidths.total - 10,
        align: "right",
      });

    currentY += rowHeight;
  });

  // ─────────────────────────────────────────────
  // TOTALS SECTION
  // ─────────────────────────────────────────────

  const totalsX = tableLeft + colWidths.description + colWidths.quantity + 20;
  currentY += 10;

  doc
    .fontSize(9)
    .font("Helvetica")
    .text("Subtotal:", totalsX, currentY, { width: 100, align: "right" })
    .text(`R${data.subtotal.toFixed(2)}`, totalsX + 105, currentY, {
      width: 60,
      align: "right",
    });

  currentY += 15;

  if (data.discountFixed > 0 || data.discountPercentage > 0) {
    const discountAmount = data.subtotal - data.discountedSubtotal;
    doc
      .text("Discount:", totalsX, currentY, { width: 100, align: "right" })
      .text(`-R${discountAmount.toFixed(2)}`, totalsX + 105, currentY, {
        width: 60,
        align: "right",
      });
    currentY += 15;
  }

  doc
    .text("VAT (15%):", totalsX, currentY, { width: 100, align: "right" })
    .text(`R${data.vat.toFixed(2)}`, totalsX + 105, currentY, {
      width: 60,
      align: "right",
    });

  currentY += 15;

  // Total (highlighted)
  doc
    .rect(totalsX - 5, currentY - 5, 170, 25)
    .fill("#f0f0f0")
    .fillAndStroke("#f0f0f0", "#999");

  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .fillColor("#000")
    .text("TOTAL:", totalsX, currentY + 3, { width: 100, align: "right" })
    .text(`R${data.total.toFixed(2)}`, totalsX + 105, currentY + 3, {
      width: 60,
      align: "right",
    });

  // ─────────────────────────────────────────────
  // NOTES & TERMS
  // ─────────────────────────────────────────────

  currentY += 40;

  if (data.notes) {
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Notes:", 40, currentY);

    doc
      .fontSize(9)
      .font("Helvetica")
      .text(data.notes, 40, currentY + 18, { width: 510 });

    currentY += 50;
  }

  // Standard terms
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("Terms & Conditions:", 40, currentY);

  doc
    .fontSize(8)
    .font("Helvetica")
    .text("• This quote is valid for 30 days from the issue date", 40, currentY + 15)
    .text("• Payment terms: 50% deposit, 50% on completion", 40, currentY + 28)
    .text("• All prices include VAT at 15%", 40, currentY + 41)
    .text("• Additional charges may apply if scope changes", 40, currentY + 54);

  // ─────────────────────────────────────────────
  // FOOTER
  // ─────────────────────────────────────────────

  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor("#999")
    .text(
      `${data.companyName || "Houdini Locksmith & Security"} | ${data.companyPhone || ""} | ${data.companyEmail || ""}`,
      40,
      750,
      { align: "center" }
    );

  doc.end();

  return stream as any;
}
