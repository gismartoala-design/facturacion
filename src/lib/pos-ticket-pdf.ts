"use client";

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
} from "pdf-lib";

import type { PosTicketData } from "@/lib/pos-ticket-template";

const MM_TO_PT = 2.83465;
const PAGE_WIDTH = 78 * MM_TO_PT;
const PAGE_PADDING_X = 6;
const PAGE_PADDING_Y = 4;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_PADDING_X * 2;
const AMOUNT_COLUMN_WIDTH = 56;
const TEXT_COLUMN_WIDTH = CONTENT_WIDTH - AMOUNT_COLUMN_WIDTH - 6;

type TextOp = {
  kind: "text";
  text: string;
  font: PDFFont;
  size: number;
  align: "left" | "right" | "center";
  x?: number;
  color?: ReturnType<typeof rgb>;
};

type DividerOp = {
  kind: "divider";
};

type LayoutOp = TextOp | DividerOp;

function formatMoney(value: number) {
  return value.toFixed(2);
}

function lineHeightFor(size: number) {
  return size + 3;
}

function wrapTextByWidth(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
) {
  const normalized = text.trim();
  if (!normalized) {
    return [""];
  }

  const words = normalized.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  function fits(value: string) {
    return font.widthOfTextAtSize(value, size) <= maxWidth;
  }

  function splitLongWord(word: string) {
    let chunk = "";

    for (const char of word) {
      const candidate = `${chunk}${char}`;
      if (fits(candidate)) {
        chunk = candidate;
        continue;
      }

      if (chunk) {
        lines.push(chunk);
      }
      chunk = char;
    }

    if (chunk) {
      current = chunk;
    }
  }

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (fits(candidate)) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = "";
    }

    if (fits(word)) {
      current = word;
      continue;
    }

    splitLongWord(word);
  }

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [normalized];
}

function buildLayoutOps(
  data: PosTicketData,
  regularFont: PDFFont,
  boldFont: PDFFont,
) {
  const ops: LayoutOp[] = [];

  function addWrappedText(
    text: string,
    options: {
      font?: PDFFont;
      size?: number;
      align?: "left" | "right" | "center";
      x?: number;
      color?: ReturnType<typeof rgb>;
      maxWidth?: number;
    } = {},
  ) {
    const font = options.font ?? regularFont;
    const size = options.size ?? 10;
    const align = options.align ?? "left";
    const maxWidth =
      options.maxWidth ??
      (align === "center"
        ? CONTENT_WIDTH
        : align === "right"
          ? AMOUNT_COLUMN_WIDTH
          : CONTENT_WIDTH);

    for (const line of wrapTextByWidth(text, font, size, maxWidth)) {
      ops.push({
        kind: "text",
        text: line,
        font,
        size,
        align,
        x: options.x,
        color: options.color,
      });
    }
  }

  function addDivider() {
    ops.push({ kind: "divider" });
  }

  addWrappedText(data.businessName.toUpperCase(), {
    font: boldFont,
    size: 12.5,
    align: "center",
  });
  addWrappedText(data.documentLabel, {
    size: 10,
    align: "center",
    color: rgb(0.35, 0.35, 0.35),
  });

  if (data.documentNumber) {
    addWrappedText(`Documento: ${data.documentNumber}`, {
      size: 10,
      align: "center",
    });
  }

  addWrappedText(`Venta #${data.saleNumber}`, {
    size: 10.5,
    align: "center",
  });
  addDivider();

  addWrappedText(`Fecha: ${data.createdAt}`, { size: 9.5 });
  addWrappedText(`Operador: ${data.operatorName}`, { size: 9.5 });
  addWrappedText(`Cliente: ${data.customerName}`, { size: 9.5 });
  addWrappedText(`Pago: ${data.paymentMethodLabel}`, { size: 9.5 });
  addDivider();

  for (const item of data.lines) {
    addWrappedText(item.name, {
      font: boldFont,
      size: 10.5,
      maxWidth: CONTENT_WIDTH,
    });

    addWrappedText(`${item.quantity.toFixed(2)} x $${formatMoney(item.unitPrice)}`, {
      size: 9.5,
      x: PAGE_PADDING_X,
      maxWidth: TEXT_COLUMN_WIDTH,
    });
    ops.push({
      kind: "text",
      text: `$${formatMoney(item.total)}`,
      font: boldFont,
      size: 9.5,
      align: "right",
      x: PAGE_WIDTH - PAGE_PADDING_X,
    });
  }

  addDivider();
  addWrappedText("Subtotal", {
    size: 10,
    x: PAGE_PADDING_X,
    maxWidth: TEXT_COLUMN_WIDTH,
  });
  ops.push({
    kind: "text",
    text: `$${formatMoney(data.subtotal)}`,
    font: regularFont,
    size: 10,
    align: "right",
    x: PAGE_WIDTH - PAGE_PADDING_X,
  });

  addWrappedText("IVA", {
    size: 10,
    x: PAGE_PADDING_X,
    maxWidth: TEXT_COLUMN_WIDTH,
  });
  ops.push({
    kind: "text",
    text: `$${formatMoney(data.taxTotal)}`,
    font: regularFont,
    size: 10,
    align: "right",
    x: PAGE_WIDTH - PAGE_PADDING_X,
  });

  addWrappedText("TOTAL", {
    font: boldFont,
    size: 11.5,
    x: PAGE_PADDING_X,
    maxWidth: TEXT_COLUMN_WIDTH,
  });
  ops.push({
    kind: "text",
    text: `$${formatMoney(data.total)}`,
    font: boldFont,
    size: 11.5,
    align: "right",
    x: PAGE_WIDTH - PAGE_PADDING_X,
  });

  addDivider();
  addWrappedText("Gracias por su compra", {
    font: boldFont,
    size: 10,
    align: "center",
  });

  return ops;
}

function estimatePageHeight(ops: LayoutOp[]) {
  let height = PAGE_PADDING_Y * 2;

  for (const op of ops) {
    if (op.kind === "divider") {
      height += 8;
      continue;
    }

    height += lineHeightFor(op.size);
  }

  return Math.max(height, 80);
}

export async function buildPosTicketPdfBase64(data: PosTicketData) {
  const pdf = await PDFDocument.create();
  const regularFont = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  const ops = buildLayoutOps(data, regularFont, boldFont);
  const pageHeight = estimatePageHeight(ops);
  const page = pdf.addPage([PAGE_WIDTH, pageHeight]);

  let cursorY = pageHeight - PAGE_PADDING_Y;

  for (const op of ops) {
    if (op.kind === "divider") {
      cursorY -= 4;
      page.drawLine({
        start: { x: PAGE_PADDING_X, y: cursorY },
        end: { x: PAGE_WIDTH - PAGE_PADDING_X, y: cursorY },
        thickness: 0.8,
        color: rgb(0.6, 0.6, 0.6),
        dashArray: [2, 2],
      });
      cursorY -= 4;
      continue;
    }

    const textWidth = op.font.widthOfTextAtSize(op.text, op.size);
    let x = op.x ?? PAGE_PADDING_X;

    if (op.align === "center") {
      x = PAGE_PADDING_X + (CONTENT_WIDTH - textWidth) / 2;
    }

    if (op.align === "right") {
      x = (op.x ?? PAGE_WIDTH - PAGE_PADDING_X) - textWidth;
    }

    page.drawText(op.text, {
      x,
      y: cursorY - op.size,
      size: op.size,
      font: op.font,
      color: op.color ?? rgb(0.07, 0.1, 0.14),
    });

    cursorY -= lineHeightFor(op.size);
  }

  return pdf.saveAsBase64();
}
