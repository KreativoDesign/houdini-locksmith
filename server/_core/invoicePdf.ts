import { PDFDocument, PDFPage, rgb } from 'pdf-lib';
import { format } from 'date-fns';

export interface InvoiceData {
  invoiceNumber: string;
  jobNumber: string;
  jobTitle: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress?: string;
  jobDescription?: string;
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
}

export async function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size
  const { height, width } = page.getSize();

  const fontSize = 12;
  const smallFontSize = 10;
  const titleFontSize = 24;
  const sectionFontSize = 14;

  // Colors
  const primaryColor = rgb(132 / 255, 204 / 255, 22 / 255); // Houdini lime green
  const darkColor = rgb(15 / 255, 23 / 255, 42 / 255); // Dark slate
  const lightGray = rgb(100 / 255, 116 / 255, 139 / 255);

  let yPosition = height - 50;

  // Header with company name
  page.drawText('HOUDINI', {
    x: 50,
    y: yPosition,
    size: titleFontSize,
    color: primaryColor,
  });

  page.drawText('Locksmith & Security', {
    x: 50,
    y: yPosition - 20,
    size: smallFontSize,
    color: lightGray,
  });

  // Invoice title
  page.drawText('INVOICE', {
    x: width - 150,
    y: yPosition,
    size: sectionFontSize,
    color: darkColor,
  });

  yPosition -= 60;

  // Invoice details
  const detailsX = width - 200;
  page.drawText(`Invoice #: ${data.invoiceNumber}`, {
    x: detailsX,
    y: yPosition,
    size: smallFontSize,
    color: darkColor,
  });

  page.drawText(`Job #: ${data.jobNumber}`, {
    x: detailsX,
    y: yPosition - 15,
    size: smallFontSize,
    color: darkColor,
  });

  page.drawText(`Issued: ${format(data.issuedDate, 'MMM dd, yyyy')}`, {
    x: detailsX,
    y: yPosition - 30,
    size: smallFontSize,
    color: darkColor,
  });

  page.drawText(`Due: ${format(data.dueDate, 'MMM dd, yyyy')}`, {
    x: detailsX,
    y: yPosition - 45,
    size: smallFontSize,
    color: darkColor,
  });

  yPosition -= 80;

  // Bill To section
  page.drawText('BILL TO:', {
    x: 50,
    y: yPosition,
    size: smallFontSize,
    color: primaryColor,
  });

  yPosition -= 20;

  page.drawText(data.clientName, {
    x: 50,
    y: yPosition,
    size: fontSize,
    color: darkColor,
  });

  if (data.clientAddress) {
    page.drawText(data.clientAddress, {
      x: 50,
      y: yPosition - 15,
      size: smallFontSize,
      color: darkColor,
    });
    yPosition -= 15;
  }

  page.drawText(data.clientEmail, {
    x: 50,
    y: yPosition - 15,
    size: smallFontSize,
    color: darkColor,
  });

  page.drawText(data.clientPhone, {
    x: 50,
    y: yPosition - 30,
    size: smallFontSize,
    color: darkColor,
  });

  yPosition -= 60;

  // Job details section
  page.drawText('JOB DETAILS:', {
    x: 50,
    y: yPosition,
    size: smallFontSize,
    color: primaryColor,
  });

  yPosition -= 20;

  page.drawText(`Title: ${data.jobTitle}`, {
    x: 50,
    y: yPosition,
    size: fontSize,
    color: darkColor,
  });

  if (data.jobDescription) {
    yPosition -= 20;
    const descLines = wrapText(data.jobDescription, 80);
    for (const line of descLines) {
      page.drawText(line, {
        x: 50,
        y: yPosition,
        size: smallFontSize,
        color: darkColor,
      });
      yPosition -= 15;
    }
  }

  yPosition -= 20;

  // Pricing table
  const tableX = 50;
  const tableWidth = width - 100;
  const colWidth = tableWidth / 2;

  // Table header
  page.drawRectangle({
    x: tableX,
    y: yPosition - 20,
    width: tableWidth,
    height: 20,
    color: primaryColor,
  });

  page.drawText('Description', {
    x: tableX + 10,
    y: yPosition - 15,
    size: smallFontSize,
    color: rgb(1, 1, 1),
  });

  page.drawText('Amount', {
    x: tableX + colWidth + 10,
    y: yPosition - 15,
    size: smallFontSize,
    color: rgb(1, 1, 1),
  });

  yPosition -= 30;

  // Table rows
  const rows = [
    { label: 'Labour Cost', value: data.labourCost },
    { label: 'Parts & Materials', value: data.partsCost },
    { label: 'Additional Fees', value: data.additionalFees },
  ];

  for (const row of rows) {
    if (row.value > 0) {
      page.drawText(row.label, {
        x: tableX + 10,
        y: yPosition,
        size: smallFontSize,
        color: darkColor,
      });

      page.drawText(formatCurrency(row.value, data.currency), {
        x: tableX + colWidth + 10,
        y: yPosition,
        size: smallFontSize,
        color: darkColor,
      });

      yPosition -= 20;
    }
  }

  // Discount
  if (data.discountAmount > 0) {
    page.drawText('Discount', {
      x: tableX + 10,
      y: yPosition,
      size: smallFontSize,
      color: darkColor,
    });

    page.drawText(`-${formatCurrency(data.discountAmount, data.currency)}`, {
      x: tableX + colWidth + 10,
      y: yPosition,
      size: smallFontSize,
      color: darkColor,
    });

    yPosition -= 20;
  }

  // Subtotal
  page.drawText('Subtotal', {
    x: tableX + 10,
    y: yPosition,
    size: smallFontSize,
    color: darkColor,
  });

  page.drawText(formatCurrency(data.subtotal, data.currency), {
    x: tableX + colWidth + 10,
    y: yPosition,
    size: smallFontSize,
    color: darkColor,
  });

  yPosition -= 20;

  // VAT
  page.drawText(`VAT (${data.vatPercentage}%)`, {
    x: tableX + 10,
    y: yPosition,
    size: smallFontSize,
    color: darkColor,
  });

  page.drawText(formatCurrency(data.vatAmount, data.currency), {
    x: tableX + colWidth + 10,
    y: yPosition,
    size: smallFontSize,
    color: darkColor,
  });

  yPosition -= 25;

  // Total (highlighted)
  page.drawRectangle({
    x: tableX,
    y: yPosition - 20,
    width: tableWidth,
    height: 25,
    color: primaryColor,
  });

  page.drawText('TOTAL', {
    x: tableX + 10,
    y: yPosition - 12,
    size: fontSize,
    color: rgb(1, 1, 1),
  });

  page.drawText(formatCurrency(data.total, data.currency), {
    x: tableX + colWidth + 10,
    y: yPosition - 12,
    size: fontSize,
    color: rgb(1, 1, 1),
  });

  yPosition -= 50;

  // Payment terms
  page.drawText('PAYMENT TERMS:', {
    x: 50,
    y: yPosition,
    size: smallFontSize,
    color: primaryColor,
  });

  page.drawText(data.paymentTerms, {
    x: 50,
    y: yPosition - 15,
    size: smallFontSize,
    color: darkColor,
  });

  // Footer
  const footerY = 30;
  page.drawText('Thank you for your business!', {
    x: 50,
    y: footerY,
    size: smallFontSize,
    color: lightGray,
  });

  if (data.portalUrl) {
    page.drawText(`View invoice online: ${data.portalUrl}`, {
      x: 50,
      y: footerY - 15,
      size: smallFontSize,
      color: lightGray,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + word).length > maxCharsPerLine) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine += (currentLine ? ' ' : '') + word;
    }
  }

  if (currentLine) lines.push(currentLine.trim());
  return lines;
}
