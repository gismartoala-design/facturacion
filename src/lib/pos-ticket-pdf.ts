"use client";

import { PDFDocument, StandardFonts } from "pdf-lib";

import type { PosTicketData } from "@/lib/pos-ticket-template";

const MM_TO_PT = 2.83465;
const PAGE_WIDTH = 78 * MM_TO_PT;
const PAGE_PADDING = 12;
const LINE_HEIGHT = 11;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_PADDING * 2;

function formatMoney(value: number) {
  return value.toFixed(2);
}

function wrapText(text: string, maxChars: number) {
  const normalized = text.trim();
  if (!normalized) {
    return [""];
  }

  const words = normalized.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = "";
    }

    if (word.length <= maxChars) {
      current = word;
      continue;
    }

    for (let index = 0; index < word.length; index += maxChars) {
      lines.push(word.slice(index, index + maxChars));
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [normalized];
}

function pushDivider(lines: string[]) {
  lines.push("--------------------------------");
}

function buildReceiptLines(data: PosTicketData) {
  const lines: string[] = [];

  lines.push(data.businessName.toUpperCase());
  lines.push(data.documentLabel);
  if (data.documentNumber) {
    lines.push(`Documento: ${data.documentNumber}`);
  }
  lines.push(`Venta: ${data.saleNumber}`);
  pushDivider(lines);
  lines.push(`Fecha: ${data.createdAt}`);
  lines.push(`Operador: ${data.operatorName}`);
  lines.push(`Cliente: ${data.customerName}`);
  lines.push(`Pago: ${data.paymentMethodLabel}`);
  pushDivider(lines);

  for (const line of data.lines) {
    for (const wrapped of wrapText(line.name, 30)) {
      lines.push(wrapped);
    }
    lines.push(
      `${line.quantity.toFixed(2)} x ${formatMoney(line.unitPrice)}`.padEnd(22) +
        formatMoney(line.total).padStart(10),
    );
  }

  pushDivider(lines);
  lines.push(`Subtotal`.padEnd(22) + formatMoney(data.subtotal).padStart(10));
  lines.push(`IVA`.padEnd(22) + formatMoney(data.taxTotal).padStart(10));
  lines.push(`TOTAL`.padEnd(22) + formatMoney(data.total).padStart(10));
  pushDivider(lines);
  lines.push("Gracias por su compra");

  return lines;
}

export async function buildPosTicketPdfBase64(data: PosTicketData) {
  const receiptLines = buildReceiptLines(data);
  const pageHeight =
    PAGE_PADDING * 2 + receiptLines.length * LINE_HEIGHT + 10;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_WIDTH, pageHeight]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  let cursorY = pageHeight - PAGE_PADDING - 8;

  receiptLines.forEach((line, index) => {
    const isHeader = index === 0 || line === "Gracias por su compra";
    page.drawText(line, {
      x: PAGE_PADDING,
      y: cursorY,
      size: isHeader ? 9 : 8,
      font: isHeader ? boldFont : font,
      maxWidth: CONTENT_WIDTH,
    });
    cursorY -= LINE_HEIGHT;
  });

  return pdf.saveAsBase64();
}
