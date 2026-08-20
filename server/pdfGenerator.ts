/**
 * Job Card PDF Generator
 * Produces a branded A4 PDF for a job card using PDFKit.
 * Brand: Houdini Locksmith & Security — near-black header, lime-green accents, mascot logo.
 * Includes: company header with mascot logo, client info, job summary, line items table,
 * photo thumbnails (fetched from S3 URLs), and the client signature.
 */
import PDFDocument from "pdfkit";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PdfJobItem {
  name: string;
  type: string;
  description?: string | null;
  quantity: string | number;
  unitPrice: string | number;
  discountPct?: string | number | null;
  lineTotal: string | number;
}

export interface PdfJobDocument {
  fileUrl: string;
  fileName: string;
  category: string;
  mimeType: string;
}

export interface JobCardPdfParams {
  // Job info
  jobNumber: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  scheduledDate?: Date | null;
  createdAt: Date;
  // Client
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientAlternatePhone?: string | null;
  clientAddress?: string | null;
  clientCity?: string | null;
  clientPostalCode?: string | null;
  // Staff
  technicianName?: string | null;
  managerName?: string | null;
  departmentName?: string | null;
  // Notes
  technicianNotes?: string | null;
  managerNotes?: string | null;
  // Items
  items: PdfJobItem[];
  // Photos (images only — mimeType starts with image/)
  photos: PdfJobDocument[];
  // Signature
  signatureUrl?: string | null;
  signerName?: string | null;
  signerRole?: string | null;
  signedAt?: Date | null;
}

// ─── Brand colours ────────────────────────────────────────────────────────────
const BRAND_GREEN  = "#84cc16";   // lime-green primary
const BRAND_DARK   = "#0a0f0a";   // near-black sidebar colour
const BRAND_DARK2  = "#111a11";   // slightly lighter for section headers
const GRAY_MED     = "#6b7280";
const GRAY_LIGHT   = "#e5e7eb";
const GRAY_BG      = "#f9fafb";
const WHITE        = "#ffffff";

const MARGIN    = 50;
const PAGE_W    = 595.28; // A4 points
const PAGE_H    = 841.89;
const CONTENT_W = PAGE_W - MARGIN * 2;

// CDN URL for the mascot logo (holding the Houdini sign)
const MASCOT_LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663346956907/RhVEFKENpu3fHPtnd8SHCE/houdini-mascot-logo_e1c5aaa1.jpeg";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(val: string | number | null | undefined): string {
  if (val == null) return "";
  return String(val);
}

function fmtRand(val: string | number | null | undefined): string {
  const n = parseFloat(String(val ?? 0));
  return `R ${isNaN(n) ? "0.00" : n.toFixed(2)}`;
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Johannesburg",
  });
}

function statusLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusColour(s: string): string {
  switch (s) {
    case "completed":        return "#16a34a";
    case "cancelled":        return "#dc2626";
    case "in_progress":      return "#2563eb";
    case "on_hold":          return "#d97706";
    case "awaiting_pricing": return "#7c3aed";
    case "priced":           return "#0891b2";
    default:                 return BRAND_GREEN;
  }
}

/** Fetch a remote image URL and return a Buffer (or null on failure) */
async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.startsWith("image/")) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

// ─── Section heading helper ───────────────────────────────────────────────────
function drawSectionHeading(
  doc: InstanceType<typeof PDFDocument>,
  label: string,
  y: number
): number {
  // Green left accent bar + dark background strip
  doc.rect(MARGIN, y, 4, 16).fill(BRAND_GREEN);
  doc.rect(MARGIN + 4, y, CONTENT_W - 4, 16).fill(BRAND_DARK2);
  doc.fillColor(WHITE).fontSize(8).font("Helvetica-Bold")
     .text(label, MARGIN + 12, y + 4, { width: CONTENT_W - 20 });
  return y + 22;
}

type DetailRow = [label: string, value: string];

function detailBoxHeight(doc: InstanceType<typeof PDFDocument>, rows: DetailRow[], width: number) {
  const valueWidth = width - 16;
  let height = 26;
  for (const [, value] of rows) {
    if (!value) continue;
    doc.font("Helvetica").fontSize(8.5);
    height += 9 + doc.heightOfString(value, { width: valueWidth, lineGap: 1 }) + 7;
  }
  return Math.max(86, height + 6);
}

function drawDetailBox(
  doc: InstanceType<typeof PDFDocument>,
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  rows: DetailRow[]
) {
  doc.rect(x, y, width, height).fill(GRAY_BG).stroke(GRAY_LIGHT);
  doc.rect(x, y, width, 16).fill(BRAND_DARK2);
  doc.rect(x, y, 4, 16).fill(BRAND_GREEN);
  doc.fillColor(WHITE).fontSize(7.2).font("Helvetica-Bold")
    .text(title, x + 10, y + 4.5, { width: width - 18 });

  let rowY = y + 24;
  for (const [label, value] of rows) {
    if (!value) continue;
    doc.fillColor(GRAY_MED).fontSize(6.8).font("Helvetica-Bold")
      .text(label.toUpperCase(), x + 8, rowY, { width: width - 16 });
    rowY += 9;
    doc.fillColor(BRAND_DARK).fontSize(8.5).font("Helvetica")
      .text(value, x + 8, rowY, { width: width - 16, lineGap: 1 });
    rowY += doc.heightOfString(value, { width: width - 16, lineGap: 1 }) + 7;
  }
}

// ─── Main generator ──────────────────────────────────────────────────────────

export async function generateJobCardPdf(params: JobCardPdfParams): Promise<Buffer> {
  // Pre-fetch images in parallel before starting the PDF stream
  const photoBuffers: (Buffer | null)[] = await Promise.all(
    params.photos
      .filter((p) => p.mimeType.startsWith("image/"))
      .slice(0, 6)
      .map((p) => fetchImageBuffer(p.fileUrl))
  );

  let sigBuffer: Buffer | null = null;
  if (params.signatureUrl) {
    sigBuffer = await fetchImageBuffer(params.signatureUrl);
  }

  // Fetch mascot logo
  const mascotBuffer = await fetchImageBuffer(MASCOT_LOGO_URL);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      bufferPages: true,
      margins: { top: MARGIN, bottom: 30, left: MARGIN, right: MARGIN },
      info: {
        Title: `Job Card ${params.jobNumber}`,
        Author: "Houdini Locksmith & Security",
        Subject: params.title,
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ── Header bar ────────────────────────────────────────────────────────
    const HEADER_H = 80;
    doc.rect(0, 0, PAGE_W, HEADER_H).fill(BRAND_DARK);

    // Green accent strip at the very bottom of the header
    doc.rect(0, HEADER_H - 3, PAGE_W, 3).fill(BRAND_GREEN);

    // Mascot logo (square crop, left side)
    if (mascotBuffer) {
      try {
        doc.image(mascotBuffer, MARGIN, 8, { width: 64, height: 64 });
      } catch {
        // fallback: green square placeholder
        doc.rect(MARGIN, 8, 64, 64).fill(BRAND_GREEN);
      }
    } else {
      doc.rect(MARGIN, 8, 64, 64).fill(BRAND_GREEN);
    }

    // Company name + tagline (right of logo)
    const textX = MARGIN + 74;
    doc.fillColor(BRAND_GREEN).fontSize(16).font("Helvetica-Bold")
       .text("HOUDINI LOCKSMITH", textX, 16, { width: CONTENT_W - 74 - 100 });
    doc.fillColor(WHITE).fontSize(9).font("Helvetica-Bold")
       .text("& SECURITY", textX, 36, { width: CONTENT_W - 74 - 100 });
    doc.fillColor(GRAY_MED).fontSize(8).font("Helvetica")
       .text("Professional Locksmith & Security Services", textX, 50, { width: CONTENT_W - 74 - 100 });

    // Job number badge (top-right of header)
    const badgeX = PAGE_W - MARGIN - 110;
    doc.rect(badgeX, 20, 110, 40).fill(BRAND_GREEN);
    doc.fillColor(BRAND_DARK).fontSize(8).font("Helvetica-Bold")
       .text("JOB CARD", badgeX, 26, { width: 110, align: "center" });
    doc.fillColor(BRAND_DARK).fontSize(10).font("Helvetica-Bold")
       .text(params.jobNumber, badgeX, 38, { width: 110, align: "center" });

    let y = HEADER_H + 14;

    // ── Job title + meta row ──────────────────────────────────────────────
    doc.fillColor(BRAND_DARK).fontSize(14).font("Helvetica-Bold")
       .text(params.title, MARGIN, y, { width: CONTENT_W, lineGap: 1 });
    y += doc.heightOfString(params.title, { width: CONTENT_W, lineGap: 1 }) + 8;

    // Status badge
    const sc = statusColour(params.status);
    const statusText = statusLabel(params.status).toUpperCase();
    doc.fontSize(8);
    const statusW = doc.widthOfString(statusText) + 14;
    doc.rect(MARGIN, y - 2, statusW, 14).fill(sc);
    doc.fillColor(WHITE).fontSize(8).font("Helvetica-Bold")
       .text(statusText, MARGIN + 7, y, { width: statusW - 14 });

    // Priority + dates inline
    const metaX = MARGIN + statusW + 10;
    doc.fillColor(GRAY_MED).fontSize(8).font("Helvetica");
    const metaParts = [
      `Priority: ${statusLabel(params.priority)}`,
      `Created: ${fmtDate(params.createdAt)}`,
      params.scheduledDate ? `Scheduled: ${fmtDate(params.scheduledDate)}` : null,
    ].filter(Boolean).join("   ·   ");
    const metaWidth = CONTENT_W - statusW - 10;
    doc.text(metaParts, metaX, y, { width: metaWidth, lineGap: 1 });
    y += Math.max(18, doc.heightOfString(metaParts, { width: metaWidth, lineGap: 1 })) + 4;

    if (params.description) {
      doc.fillColor(GRAY_MED).fontSize(9).font("Helvetica")
         .text(params.description, MARGIN, y, { width: CONTENT_W, lineGap: 1 });
      y += doc.heightOfString(params.description, { width: CONTENT_W, lineGap: 1 }) + 12;
    }

    // ── Two-column: Client | Job Details ──────────────────────────────────
    const colW = (CONTENT_W - 12) / 2;
    const clientRows: [string, string][] = [
      ["Client", fmt(params.clientName) || "Unknown Client"],
      ["Phone", fmt(params.clientPhone)],
      ["Alternative phone", fmt(params.clientAlternatePhone)],
      ["Email", fmt(params.clientEmail)],
      ["Address", [params.clientAddress, params.clientCity, params.clientPostalCode].filter(Boolean).join(", ")],
    ];
    const jx = MARGIN + colW + 12;
    const jobRows: [string, string][] = [
      ["Job reference", params.jobNumber],
      ["Department", fmt(params.departmentName)],
      ["Technician", fmt(params.technicianName)],
      ["Manager", fmt(params.managerName)],
      ["Scheduled", params.scheduledDate ? fmtDate(params.scheduledDate) : "Not scheduled"],
    ];
    const boxH = Math.max(detailBoxHeight(doc, clientRows, colW), detailBoxHeight(doc, jobRows, colW));
    drawDetailBox(doc, MARGIN, y, colW, boxH, "CLIENT INFORMATION", clientRows);
    drawDetailBox(doc, jx, y, colW, boxH, "JOB DETAILS", jobRows);
    y += boxH + 16;

    // ── Line items table ──────────────────────────────────────────────────
    if (params.items.length > 0) {
      y = drawSectionHeading(doc, "JOB ITEMS", y);

      const cols = { name: 195, type: 60, qty: 40, unit: 65, disc: 40, total: 65 };
      const headerH = 16;

      const drawItemTableHeader = () => {
        doc.rect(MARGIN, y, CONTENT_W, headerH).fill(BRAND_GREEN);
        let hx = MARGIN + 6;
        doc.fillColor(BRAND_DARK).fontSize(7.5).font("Helvetica-Bold");
        doc.text("Item", hx, y + 4, { width: cols.name }); hx += cols.name;
        doc.text("Type", hx, y + 4, { width: cols.type }); hx += cols.type;
        doc.text("Qty", hx, y + 4, { width: cols.qty }); hx += cols.qty;
        doc.text("Unit", hx, y + 4, { width: cols.unit }); hx += cols.unit;
        doc.text("Disc%", hx, y + 4, { width: cols.disc }); hx += cols.disc;
        doc.text("Total", hx, y + 4, { width: cols.total, align: "right" });
        y += headerH;
      };
      drawItemTableHeader();

      let grandTotal = 0;
      params.items.forEach((item, idx) => {
        const nameH = doc.font("Helvetica").fontSize(8).heightOfString(item.name, { width: cols.name - 4, lineGap: 1 });
        const typeH = doc.heightOfString(statusLabel(item.type), { width: cols.type - 2, lineGap: 1 });
        const rowH = Math.max(20, nameH + 8, typeH + 8);
        if (y + rowH > PAGE_H - 60) {
          doc.addPage();
          y = MARGIN;
          y = drawSectionHeading(doc, "JOB ITEMS (CONTINUED)", y);
          drawItemTableHeader();
        }
        doc.rect(MARGIN, y, CONTENT_W, rowH).fill(idx % 2 === 0 ? WHITE : GRAY_BG);
        // Left accent line on alternating rows
        if (idx % 2 !== 0) doc.rect(MARGIN, y, 2, rowH).fill(BRAND_GREEN);

        let rx = MARGIN + 6;
        doc.fillColor(BRAND_DARK).fontSize(8).font("Helvetica");
        doc.text(item.name, rx, y + 4, { width: cols.name - 4, lineGap: 1, ellipsis: true }); rx += cols.name;
        doc.fillColor(GRAY_MED);
        doc.text(statusLabel(item.type), rx, y + 4, { width: cols.type - 2, lineGap: 1, ellipsis: true }); rx += cols.type;
        doc.fillColor(BRAND_DARK);
        doc.text(fmt(item.quantity), rx, y + 4, { width: cols.qty });             rx += cols.qty;
        doc.text(fmtRand(item.unitPrice), rx, y + 4, { width: cols.unit });       rx += cols.unit;
        const disc = parseFloat(String(item.discountPct ?? 0));
        doc.fillColor(disc > 0 ? "#dc2626" : GRAY_MED);
        doc.text(disc > 0 ? `${disc}%` : "—", rx, y + 4, { width: cols.disc }); rx += cols.disc;
        const lt = parseFloat(String(item.lineTotal ?? 0));
        grandTotal += lt;
        doc.fillColor(BRAND_DARK).font("Helvetica-Bold");
        doc.text(fmtRand(lt), rx, y + 4, { width: cols.total, align: "right" });
        y += rowH;
      });

      // Grand total row — lime-green
      if (y + 22 > PAGE_H - 60) {
        doc.addPage();
        y = drawSectionHeading(doc, "JOB ITEMS (CONTINUED)", MARGIN);
      }
      doc.rect(MARGIN, y, CONTENT_W, 22).fill(BRAND_GREEN);
      doc.fillColor(BRAND_DARK).fontSize(9).font("Helvetica-Bold")
         .text("TOTAL (excl. VAT)", MARGIN + 6, y + 6, { width: CONTENT_W - 12 - 80 });
      doc.fillColor(BRAND_DARK).fontSize(10).font("Helvetica-Bold")
         .text(fmtRand(grandTotal), MARGIN + 6, y + 5, { width: CONTENT_W - 12, align: "right" });
      y += 30;
    }

    // ── Notes ─────────────────────────────────────────────────────────────
    const noteBlocks: [string, string][] = [
      ["TECHNICIAN NOTES", fmt(params.technicianNotes)],
      ["MANAGER NOTES",    fmt(params.managerNotes)],
    ];
    for (const [label, text] of noteBlocks) {
      if (!text) continue;
      if (y + 50 > PAGE_H - 60) { doc.addPage(); y = MARGIN; }
      y = drawSectionHeading(doc, label, y);
      const noteH = doc.heightOfString(text, { width: CONTENT_W - 16 }) + 16;
      doc.rect(MARGIN, y, CONTENT_W, noteH).fill(GRAY_BG).stroke(GRAY_LIGHT);
      doc.fillColor(BRAND_DARK).fontSize(9).font("Helvetica")
         .text(text, MARGIN + 8, y + 8, { width: CONTENT_W - 16 });
      y += noteH + 12;
    }

    // ── Photos ────────────────────────────────────────────────────────────
    const validPhotos = photoBuffers.filter(Boolean) as Buffer[];
    if (validPhotos.length > 0) {
      if (y + 30 > PAGE_H - 60) { doc.addPage(); y = MARGIN; }
      y = drawSectionHeading(doc, "PHOTOS", y);

      const thumbW = (CONTENT_W - 20) / 3;
      const thumbH = thumbW * 0.65;
      let col = 0;
      let rowStartY = y;

      for (const buf of validPhotos) {
        if (rowStartY + thumbH + 10 > PAGE_H - 60 && col === 0) {
          doc.addPage(); rowStartY = MARGIN; y = MARGIN;
        }
        const px = MARGIN + col * (thumbW + 10);
        try {
          doc.image(buf, px, rowStartY, { width: thumbW, height: thumbH, cover: [thumbW, thumbH] });
        } catch {
          doc.rect(px, rowStartY, thumbW, thumbH).fill(GRAY_BG);
          doc.fillColor(GRAY_MED).fontSize(8)
             .text("Image unavailable", px + 4, rowStartY + thumbH / 2 - 5, { width: thumbW - 8, align: "center" });
        }
        col++;
        if (col === 3) { col = 0; rowStartY += thumbH + 8; y = rowStartY; }
      }
      if (col > 0) y = rowStartY + thumbH + 8;
      y += 8;
    }

    // ── Signature ─────────────────────────────────────────────────────────
    if (sigBuffer || params.signerName) {
      if (y + 120 > PAGE_H - 60) { doc.addPage(); y = MARGIN; }
      y = drawSectionHeading(doc, "CLIENT SIGNATURE", y);

      const sigBoxH = sigBuffer ? 100 : 60;
      // Light green tinted signature box
      doc.rect(MARGIN, y, CONTENT_W, sigBoxH).fill("#f0fdf4").stroke("#bbf7d0");
      // Green left accent
      doc.rect(MARGIN, y, 4, sigBoxH).fill(BRAND_GREEN);

      if (sigBuffer) {
        try {
          doc.image(sigBuffer, MARGIN + 12, y + 8, { width: 200, height: 80, fit: [200, 80] });
        } catch {
          doc.fillColor(GRAY_MED).fontSize(8).text("Signature image unavailable", MARGIN + 12, y + 30);
        }
      }

      const sigInfoX = sigBuffer ? MARGIN + 224 : MARGIN + 16;
      let siy = y + 14;
      const signatureRows: DetailRow[] = [
        ["Signed by", fmt(params.signerName)],
        ["Role", fmt(params.signerRole)],
        ["Date & time", params.signedAt ? fmtDateTime(params.signedAt) : ""],
      ];
      for (const [label, value] of signatureRows) {
        if (!value) continue;
        doc.fillColor(GRAY_MED).fontSize(7).font("Helvetica-Bold")
          .text(label.toUpperCase(), sigInfoX, siy, { width: CONTENT_W - (sigInfoX - MARGIN) - 12 });
        siy += 9;
        doc.fillColor(BRAND_DARK).fontSize(8.5).font("Helvetica")
          .text(value, sigInfoX, siy, { width: CONTENT_W - (sigInfoX - MARGIN) - 12, lineGap: 1 });
        siy += doc.heightOfString(value, { width: CONTENT_W - (sigInfoX - MARGIN) - 12, lineGap: 1 }) + 6;
      }
      y += sigBoxH + 12;
    }

    // ── Footer ────────────────────────────────────────────────────────────
    // Draw footer on every page
    const totalPages = (doc as any).bufferedPageRange
      ? (doc as any).bufferedPageRange().count
      : 1;
    for (let i = 0; i < totalPages; i++) {
      if (i > 0) doc.switchToPage(i);
      const footerTop = PAGE_H - 52;
      doc.rect(0, footerTop, PAGE_W, 52).fill(BRAND_DARK);
      doc.rect(0, footerTop, PAGE_W, 2).fill(BRAND_GREEN);
      doc.fillColor(GRAY_MED).fontSize(7.5).font("Helvetica")
         .text(
           `Generated ${fmtDateTime(new Date())}  ·  Houdini Locksmith & Security  ·  ${params.jobNumber}`,
           MARGIN, footerTop + 6,
           { width: CONTENT_W, align: "center" }
         );
    }

    doc.end();
  });
}
