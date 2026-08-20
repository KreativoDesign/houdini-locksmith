import { PDFDocument, rgb } from "pdf-lib";
import { format } from "date-fns";

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  jobNumber: string;
  jobTitle: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress?: string;
  jobDescription?: string;
  lineItems?: InvoiceLineItem[];
  labourCost: number;
  partsCost: number;
  additionalFees: number;
  discountAmount: number;
  vatPercentage: number;
  subtotal: number;
  vatAmount: number;
  total: number;
  currency: string;
  paymentTerms: string;
  issuedDate: Date;
  dueDate: Date;
  portalUrl?: string;
  logoUrl?: string;
}

const BRAND = {
  ink: rgb(13 / 255, 22 / 255, 15 / 255),
  forest: rgb(22 / 255, 47 / 255, 28 / 255),
  lime: rgb(151 / 255, 219 / 255, 0 / 255),
  limeDark: rgb(92 / 255, 145 / 255, 0 / 255),
  text: rgb(29 / 255, 38 / 255, 31 / 255),
  muted: rgb(94 / 255, 110 / 255, 97 / 255),
  border: rgb(218 / 255, 226 / 255, 217 / 255),
  soft: rgb(246 / 255, 250 / 255, 244 / 255),
  white: rgb(1, 1, 1),
};

const DEFAULT_LOGO_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663346956907/FvsJQLgDSLrAGayZ.png";

export async function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { height, width } = page.getSize();
  const margin = 42;
  let y = height - 42;

  const logo = await embedLogo(pdfDoc, data.logoUrl ?? DEFAULT_LOGO_URL);

  // ── Branded invoice header ──────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 122, width, height: 122, color: BRAND.ink });
  page.drawRectangle({ x: 0, y: height - 122, width, height: 5, color: BRAND.lime });

  if (logo) {
    const logoHeight = 48;
    const logoWidth = (logo.width / logo.height) * logoHeight;
    page.drawImage(logo, { x: margin, y: height - 93, width: logoWidth, height: logoHeight });
  } else {
    page.drawText("HOUDINI", { x: margin, y: height - 70, size: 25, color: BRAND.lime });
  }

  page.drawText("LOCKSMITH & SECURITY", {
    x: margin,
    y: height - 106,
    size: 8,
    color: rgb(217 / 255, 226 / 255, 217 / 255),
  });
  page.drawText("INVOICE", { x: width - 154, y: height - 65, size: 24, color: BRAND.white });
  page.drawText(data.invoiceNumber, { x: width - 154, y: height - 84, size: 9, color: BRAND.lime });

  y = height - 151;
  const drawMeta = (label: string, value: string, x: number, top: number) => {
    page.drawText(label.toUpperCase(), { x, y: top, size: 7, color: BRAND.muted });
    page.drawText(value, { x, y: top - 14, size: 9, color: BRAND.text });
  };
  drawMeta("Issue date", format(data.issuedDate, "dd MMM yyyy"), margin, y);
  drawMeta("Due date", format(data.dueDate, "dd MMM yyyy"), margin + 128, y);
  drawMeta("Job reference", data.jobNumber, margin + 256, y);
  y -= 56;

  // ── Bill to / job details ────────────────────────────────────────────────
  const panelTop = y;
  page.drawRectangle({ x: margin, y: panelTop - 77, width: width - margin * 2, height: 77, color: BRAND.soft });
  page.drawRectangle({ x: margin, y: panelTop - 77, width: width - margin * 2, height: 77, borderColor: BRAND.border, borderWidth: 0.7 });
  page.drawText("BILL TO", { x: margin + 12, y: panelTop - 16, size: 7, color: BRAND.limeDark });
  page.drawText(data.clientName || "Client", { x: margin + 12, y: panelTop - 31, size: 11, color: BRAND.text });
  const contactLines = [data.clientEmail, data.clientPhone, data.clientAddress].filter(Boolean) as string[];
  contactLines.slice(0, 2).forEach((line, index) => {
    page.drawText(trimText(line, 38), { x: margin + 12, y: panelTop - 46 - index * 12, size: 8, color: BRAND.muted });
  });
  page.drawText("SERVICE DETAILS", { x: width / 2 + 4, y: panelTop - 16, size: 7, color: BRAND.limeDark });
  page.drawText(trimText(data.jobTitle || "Houdini service job", 35), { x: width / 2 + 4, y: panelTop - 31, size: 11, color: BRAND.text });
  const description = trimText(data.jobDescription || "Professional locksmith and security service", 72);
  wrapText(description, 44).slice(0, 2).forEach((line, index) => {
    page.drawText(line, { x: width / 2 + 4, y: panelTop - 46 - index * 12, size: 8, color: BRAND.muted });
  });
  y = panelTop - 103;

  // ── Priced work ──────────────────────────────────────────────────────────
  page.drawText("PRICED WORK", { x: margin, y, size: 9, color: BRAND.text });
  y -= 16;
  const x = { description: margin + 10, quantity: 324, rate: 390, amount: 478 };
  page.drawRectangle({ x: margin, y: y - 18, width: width - margin * 2, height: 20, color: BRAND.forest });
  [
    ["DESCRIPTION", x.description],
    ["QTY", x.quantity],
    ["UNIT PRICE", x.rate],
    ["AMOUNT", x.amount],
  ].forEach(([label, xPosition]) => page.drawText(label as string, { x: xPosition as number, y: y - 11, size: 7, color: BRAND.white }));
  y -= 34;

  const lineItems = normalizedLineItems(data);
  for (const item of lineItems) {
    page.drawLine({ start: { x: margin, y: y - 8 }, end: { x: width - margin, y: y - 8 }, thickness: 0.5, color: BRAND.border });
    page.drawText(trimText(item.description, 38), { x: x.description, y, size: 8.5, color: BRAND.text });
    page.drawText(formatQuantity(item.quantity), { x: x.quantity, y, size: 8.5, color: BRAND.text });
    page.drawText(formatCurrency(item.unitPrice, data.currency), { x: x.rate, y, size: 8.5, color: BRAND.text });
    page.drawText(formatCurrency(item.total, data.currency), { x: x.amount, y, size: 8.5, color: BRAND.text });
    y -= 22;
  }

  y -= 6;
  const totalsX = 342;
  const drawTotalRow = (label: string, value: string, emphasize = false) => {
    if (emphasize) {
      page.drawRectangle({ x: totalsX - 12, y: y - 16, width: width - margin - totalsX + 12, height: 25, color: BRAND.lime });
    }
    page.drawText(label, { x: totalsX, y, size: emphasize ? 10 : 8.5, color: emphasize ? BRAND.ink : BRAND.muted });
    page.drawText(value, { x: 466, y, size: emphasize ? 10 : 8.5, color: emphasize ? BRAND.ink : BRAND.text });
    y -= emphasize ? 34 : 18;
  };
  drawTotalRow("Subtotal", formatCurrency(data.subtotal, data.currency));
  if (data.discountAmount > 0) drawTotalRow("Discount", `-${formatCurrency(data.discountAmount, data.currency)}`);
  drawTotalRow(`VAT (${data.vatPercentage.toFixed(0)}%)`, formatCurrency(data.vatAmount, data.currency));
  drawTotalRow("TOTAL DUE", formatCurrency(data.total, data.currency), true);

  // ── Payment and footer ───────────────────────────────────────────────────
  const termsY = Math.max(74, y - 8);
  page.drawLine({ start: { x: margin, y: termsY + 31 }, end: { x: width - margin, y: termsY + 31 }, thickness: 0.7, color: BRAND.border });
  page.drawText("PAYMENT TERMS", { x: margin, y: termsY + 16, size: 7, color: BRAND.limeDark });
  page.drawText(trimText(data.paymentTerms || "Due within 30 days", 92), { x: margin, y: termsY + 3, size: 8.5, color: BRAND.text });
  page.drawText("Questions about this invoice? Contact sales@houdini.co.za · 041 365 7565", { x: margin, y: 35, size: 7.5, color: BRAND.muted });
  if (data.portalUrl) page.drawText("This invoice is also securely available in your Houdini client portal.", { x: margin, y: 22, size: 7.5, color: BRAND.muted });

  return Buffer.from(await pdfDoc.save());
}

async function embedLogo(pdfDoc: PDFDocument, logoUrl: string) {
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) return null;
    const bytes = await response.arrayBuffer();
    return await pdfDoc.embedPng(bytes);
  } catch {
    return null;
  }
}

function normalizedLineItems(data: InvoiceData): InvoiceLineItem[] {
  if (data.lineItems?.length) return data.lineItems.filter((item) => item.total > 0);
  return [
    { description: "Labour", quantity: 1, unitPrice: data.labourCost, total: data.labourCost },
    { description: "Parts & materials", quantity: 1, unitPrice: data.partsCost, total: data.partsCost },
    { description: "Additional services", quantity: 1, unitPrice: data.additionalFees, total: data.additionalFees },
  ].filter((item) => item.total > 0);
}

function formatCurrency(value: number, currency = "ZAR") {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: currency || "ZAR" }).format(value || 0);
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function trimText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, Math.max(0, maxLength - 1))}…` : value;
}

function wrapText(value: string, maxCharacters: number) {
  const lines: string[] = [];
  let current = "";
  for (const word of value.split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharacters && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}
