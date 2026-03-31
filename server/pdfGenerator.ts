/**
 * Job Card PDF Generator
 * Produces a branded A4 PDF for a job card using PDFKit.
 * Includes: company header, client info, job summary, line items table,
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

// ─── Main generator ──────────────────────────────────────────────────────────

const BRAND_ORANGE = "#f97316";
const BRAND_DARK   = "#1c1917";
const GRAY_MED     = "#71717a";
const GRAY_LIGHT   = "#e4e4e7";
const WHITE        = "#ffffff";

const MARGIN  = 50;
const PAGE_W  = 595.28; // A4 points
const CONTENT_W = PAGE_W - MARGIN * 2;

export async function generateJobCardPdf(params: JobCardPdfParams): Promise<Buffer> {
  // Pre-fetch images in parallel before starting the PDF stream
  const photoBuffers: (Buffer | null)[] = await Promise.all(
    params.photos
      .filter((p) => p.mimeType.startsWith("image/"))
      .slice(0, 6) // max 6 photos to keep PDF size reasonable
      .map((p) => fetchImageBuffer(p.fileUrl))
  );

  let sigBuffer: Buffer | null = null;
  if (params.signatureUrl) {
    sigBuffer = await fetchImageBuffer(params.signatureUrl);
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
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

    let y = MARGIN;

    // ── Header bar ────────────────────────────────────────────────────────
    doc.rect(0, 0, PAGE_W, 70).fill(BRAND_DARK);
    doc.fillColor(BRAND_ORANGE).fontSize(18).font("Helvetica-Bold")
       .text("HOUDINI LOCKSMITH & SECURITY", MARGIN, 18, { width: CONTENT_W - 120 });
    doc.fillColor(WHITE).fontSize(9).font("Helvetica")
       .text("Professional Locksmith & Security Services", MARGIN, 40, { width: CONTENT_W - 120 });

    // Job number badge (top-right)
    doc.fillColor(BRAND_ORANGE).fontSize(10).font("Helvetica-Bold")
       .text(params.jobNumber, PAGE_W - MARGIN - 120, 22, { width: 120, align: "right" });
    doc.fillColor(WHITE).fontSize(8).font("Helvetica")
       .text("JOB CARD", PAGE_W - MARGIN - 120, 36, { width: 120, align: "right" });

    y = 90;

    // ── Job summary row ───────────────────────────────────────────────────
    doc.fillColor(BRAND_DARK).fontSize(13).font("Helvetica-Bold")
       .text(params.title, MARGIN, y, { width: CONTENT_W });
    y += 18;

    const statusColor = params.status === "completed" ? "#16a34a"
                      : params.status === "cancelled"  ? "#dc2626"
                      : params.status === "in_progress" ? "#2563eb"
                      : "#92400e";

    doc.fillColor(statusColor).fontSize(9).font("Helvetica-Bold")
       .text(statusLabel(params.status).toUpperCase(), MARGIN, y);
    const statusW = doc.widthOfString(statusLabel(params.status).toUpperCase()) + 8;
    doc.rect(MARGIN - 4, y - 3, statusW, 14).stroke(statusColor);

    doc.fillColor(GRAY_MED).fontSize(9).font("Helvetica")
       .text(`Priority: ${statusLabel(params.priority)}`, MARGIN + statusW + 12, y)
       .text(`Created: ${fmtDate(params.createdAt)}`, MARGIN + statusW + 100, y)
       .text(params.scheduledDate ? `Scheduled: ${fmtDate(params.scheduledDate)}` : "", MARGIN + statusW + 220, y);
    y += 22;

    if (params.description) {
      doc.fillColor(GRAY_MED).fontSize(9).font("Helvetica")
         .text(params.description, MARGIN, y, { width: CONTENT_W });
      y += doc.heightOfString(params.description, { width: CONTENT_W }) + 8;
    }

    // ── Two-column: Client | Job Details ──────────────────────────────────
    const colW = (CONTENT_W - 16) / 2;

    // Client box
    doc.rect(MARGIN, y, colW, 120).fill("#fafafa").stroke(GRAY_LIGHT);
    doc.fillColor(BRAND_ORANGE).fontSize(8).font("Helvetica-Bold")
       .text("CLIENT", MARGIN + 8, y + 8);
    doc.fillColor(BRAND_DARK).fontSize(10).font("Helvetica-Bold")
       .text(fmt(params.clientName) || "Unknown Client", MARGIN + 8, y + 20, { width: colW - 16 });
    let cy = y + 34;
    const clientRows: [string, string][] = [
      ["Phone",    fmt(params.clientPhone)],
      ["Alt Phone",fmt(params.clientAlternatePhone)],
      ["Email",    fmt(params.clientEmail)],
      ["Address",  [params.clientAddress, params.clientCity, params.clientPostalCode].filter(Boolean).join(", ")],
    ];
    for (const [label, val] of clientRows) {
      if (!val) continue;
      doc.fillColor(GRAY_MED).fontSize(8).font("Helvetica")
         .text(`${label}:`, MARGIN + 8, cy, { width: 55, continued: true })
         .fillColor(BRAND_DARK).font("Helvetica")
         .text(val, { width: colW - 70 });
      cy += 13;
    }

    // Job details box
    const jx = MARGIN + colW + 16;
    doc.rect(jx, y, colW, 120).fill("#fafafa").stroke(GRAY_LIGHT);
    doc.fillColor(BRAND_ORANGE).fontSize(8).font("Helvetica-Bold")
       .text("JOB DETAILS", jx + 8, y + 8);
    let jy = y + 20;
    const jobRows: [string, string][] = [
      ["Department", fmt(params.departmentName)],
      ["Technician", fmt(params.technicianName)],
      ["Manager",    fmt(params.managerName)],
    ];
    for (const [label, val] of jobRows) {
      if (!val) continue;
      doc.fillColor(GRAY_MED).fontSize(8).font("Helvetica")
         .text(`${label}:`, jx + 8, jy, { width: 65, continued: true })
         .fillColor(BRAND_DARK).font("Helvetica")
         .text(val, { width: colW - 80 });
      jy += 13;
    }

    y += 130;

    // ── Line items table ──────────────────────────────────────────────────
    if (params.items.length > 0) {
      doc.fillColor(BRAND_DARK).fontSize(10).font("Helvetica-Bold")
         .text("JOB ITEMS", MARGIN, y);
      y += 14;

      // Table header
      const cols = { name: 200, type: 60, qty: 45, unit: 65, disc: 40, total: 65 };
      const headerH = 18;
      doc.rect(MARGIN, y, CONTENT_W, headerH).fill(BRAND_DARK);
      let hx = MARGIN + 6;
      doc.fillColor(WHITE).fontSize(8).font("Helvetica-Bold");
      doc.text("Item", hx, y + 5, { width: cols.name });         hx += cols.name;
      doc.text("Type", hx, y + 5, { width: cols.type });         hx += cols.type;
      doc.text("Qty",  hx, y + 5, { width: cols.qty });          hx += cols.qty;
      doc.text("Unit",  hx, y + 5, { width: cols.unit });        hx += cols.unit;
      doc.text("Disc%", hx, y + 5, { width: cols.disc });        hx += cols.disc;
      doc.text("Total", hx, y + 5, { width: cols.total, align: "right" });
      y += headerH;

      let grandTotal = 0;
      params.items.forEach((item, idx) => {
        const rowH = 18;
        if (y + rowH > 780) { doc.addPage(); y = MARGIN; }
        doc.rect(MARGIN, y, CONTENT_W, rowH).fill(idx % 2 === 0 ? WHITE : "#f4f4f5");
        let rx = MARGIN + 6;
        doc.fillColor(BRAND_DARK).fontSize(8).font("Helvetica");
        doc.text(item.name, rx, y + 5, { width: cols.name - 4, ellipsis: true }); rx += cols.name;
        doc.fillColor(GRAY_MED);
        doc.text(statusLabel(item.type), rx, y + 5, { width: cols.type });        rx += cols.type;
        doc.fillColor(BRAND_DARK);
        doc.text(fmt(item.quantity), rx, y + 5, { width: cols.qty });             rx += cols.qty;
        doc.text(fmtRand(item.unitPrice), rx, y + 5, { width: cols.unit });       rx += cols.unit;
        const disc = parseFloat(String(item.discountPct ?? 0));
        doc.fillColor(disc > 0 ? "#dc2626" : GRAY_MED);
        doc.text(disc > 0 ? `${disc}%` : "—", rx, y + 5, { width: cols.disc }); rx += cols.disc;
        const lt = parseFloat(String(item.lineTotal ?? 0));
        grandTotal += lt;
        doc.fillColor(BRAND_DARK).font("Helvetica-Bold");
        doc.text(fmtRand(lt), rx, y + 5, { width: cols.total, align: "right" });
        y += rowH;
      });

      // Grand total row
      if (y + 22 > 780) { doc.addPage(); y = MARGIN; }
      doc.rect(MARGIN, y, CONTENT_W, 22).fill(BRAND_DARK);
      doc.fillColor(WHITE).fontSize(9).font("Helvetica-Bold")
         .text("TOTAL (excl. VAT)", MARGIN + 6, y + 6, { width: CONTENT_W - 80 })
         .text(fmtRand(grandTotal), MARGIN + 6, y + 6, { width: CONTENT_W - 12, align: "right" });
      y += 30;
    }

    // ── Notes ─────────────────────────────────────────────────────────────
    const noteBlocks: [string, string][] = [
      ["Technician Notes", fmt(params.technicianNotes)],
      ["Manager Notes",    fmt(params.managerNotes)],
    ];
    for (const [label, text] of noteBlocks) {
      if (!text) continue;
      if (y + 50 > 780) { doc.addPage(); y = MARGIN; }
      doc.fillColor(BRAND_DARK).fontSize(10).font("Helvetica-Bold").text(label.toUpperCase(), MARGIN, y);
      y += 14;
      const noteH = doc.heightOfString(text, { width: CONTENT_W }) + 16;
      doc.rect(MARGIN, y, CONTENT_W, noteH).fill("#fafafa").stroke(GRAY_LIGHT);
      doc.fillColor(BRAND_DARK).fontSize(9).font("Helvetica")
         .text(text, MARGIN + 8, y + 8, { width: CONTENT_W - 16 });
      y += noteH + 12;
    }

    // ── Photos ────────────────────────────────────────────────────────────
    const validPhotos = photoBuffers.filter(Boolean) as Buffer[];
    if (validPhotos.length > 0) {
      if (y + 30 > 750) { doc.addPage(); y = MARGIN; }
      doc.fillColor(BRAND_DARK).fontSize(10).font("Helvetica-Bold")
         .text("PHOTOS", MARGIN, y);
      y += 14;

      const thumbW = (CONTENT_W - 20) / 3;
      const thumbH = thumbW * 0.65;
      let col = 0;
      let rowStartY = y;

      for (const buf of validPhotos) {
        if (y + thumbH + 10 > 780 && col === 0) { doc.addPage(); y = MARGIN; rowStartY = y; }
        const px = MARGIN + col * (thumbW + 10);
        try {
          doc.image(buf, px, rowStartY, { width: thumbW, height: thumbH, cover: [thumbW, thumbH] });
        } catch {
          doc.rect(px, rowStartY, thumbW, thumbH).fill("#f4f4f5");
          doc.fillColor(GRAY_MED).fontSize(8).text("Image unavailable", px + 4, rowStartY + thumbH / 2 - 5, { width: thumbW - 8, align: "center" });
        }
        col++;
        if (col === 3) { col = 0; rowStartY += thumbH + 8; y = rowStartY; }
      }
      if (col > 0) y = rowStartY + thumbH + 8;
      y += 8;
    }

    // ── Signature ─────────────────────────────────────────────────────────
    if (sigBuffer || params.signerName) {
      if (y + 120 > 780) { doc.addPage(); y = MARGIN; }
      doc.fillColor(BRAND_DARK).fontSize(10).font("Helvetica-Bold")
         .text("CLIENT SIGNATURE", MARGIN, y);
      y += 14;

      const sigBoxH = sigBuffer ? 100 : 60;
      doc.rect(MARGIN, y, CONTENT_W, sigBoxH).fill("#f0fdf4").stroke("#bbf7d0");

      if (sigBuffer) {
        try {
          doc.image(sigBuffer, MARGIN + 8, y + 8, { width: 200, height: 80, fit: [200, 80] });
        } catch {
          doc.fillColor(GRAY_MED).fontSize(8).text("Signature image unavailable", MARGIN + 8, y + 30);
        }
      }

      const sigInfoX = sigBuffer ? MARGIN + 220 : MARGIN + 8;
      let siy = y + 12;
      if (params.signerName) {
        doc.fillColor(GRAY_MED).fontSize(8).font("Helvetica")
           .text("Signed by:", sigInfoX, siy, { continued: true })
           .fillColor(BRAND_DARK).font("Helvetica-Bold")
           .text(` ${params.signerName}`);
        siy += 14;
      }
      if (params.signerRole) {
        doc.fillColor(GRAY_MED).fontSize(8).font("Helvetica")
           .text("Role:", sigInfoX, siy, { continued: true })
           .fillColor(BRAND_DARK).font("Helvetica")
           .text(` ${params.signerRole}`);
        siy += 14;
      }
      if (params.signedAt) {
        doc.fillColor(GRAY_MED).fontSize(8).font("Helvetica")
           .text("Date & Time:", sigInfoX, siy, { continued: true })
           .fillColor(BRAND_DARK).font("Helvetica")
           .text(` ${fmtDateTime(params.signedAt)}`);
      }
      y += sigBoxH + 12;
    }

    // ── Footer ────────────────────────────────────────────────────────────
    const footerY = 820;
    doc.rect(0, footerY - 10, PAGE_W, 35).fill(BRAND_DARK);
    doc.fillColor(GRAY_MED).fontSize(8).font("Helvetica")
       .text(
         `Generated ${fmtDateTime(new Date())} · Houdini Locksmith & Security · ${params.jobNumber}`,
         MARGIN, footerY,
         { width: CONTENT_W, align: "center" }
       );

    doc.end();
  });
}
