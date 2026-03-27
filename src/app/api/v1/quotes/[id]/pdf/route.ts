import {
  ensureDefaultBusiness,
  getBusinessContextById,
} from "@/core/business/business.service";
import { getBusinessLogoAsset } from "@/core/business/business-logo.service";
import { getSession } from "@/lib/auth";
import { fail } from "@/lib/http";
import { getQuoteDetail } from "@/services/quotes/quote.service";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

export const runtime = "nodejs";

const PAGE_SIZE: [number, number] = [595.28, 841.89];
const PAGE_MARGIN = 36;
const CONTENT_WIDTH = PAGE_SIZE[0] - PAGE_MARGIN * 2;
const BORDER_COLOR = rgb(0, 0, 0);
const TEXT_COLOR = rgb(0, 0, 0);
const MUTED_COLOR = rgb(0.25, 0.25, 0.25);
const SURFACE_COLOR = rgb(1, 1, 1);
const HEADER_FILL = rgb(0.94, 0.94, 0.94);

type DrawContext = {
  pdfDoc: PDFDocument;
  regularFont: PDFFont;
  boldFont: PDFFont;
  logoImage?: PDFImage;
};

type TableColumn = {
  key: "code" | "description" | "quantity" | "unitPrice" | "discount" | "total";
  label: string;
  width: number;
  align?: "left" | "right" | "center";
};

const TABLE_COLUMNS: TableColumn[] = [
  { key: "code", label: "Codigo", width: 64 },
  { key: "description", label: "Descripcion", width: 190, align: "left" },
  { key: "quantity", label: "Cant.", width: 52, align: "right" },
  { key: "unitPrice", label: "P. Unit.", width: 70, align: "right" },
  { key: "discount", label: "Desc.", width: 60, align: "right" },
  { key: "total", label: "Total", width: 71.28, align: "right" },
];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  "01": "Sin utilizacion del sistema financiero",
  "15": "Compensacion de deudas",
  "16": "Tarjeta de debito",
  "19": "Tarjeta de credito",
  "20": "Otros con utilizacion del sistema financiero",
};

function money(value: number): string {
  return value.toFixed(2);
}

function paymentMethodLabel(code: string): string {
  return PAYMENT_METHOD_LABELS[code] ?? code;
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color = TEXT_COLOR,
) {
  page.drawText(text, { x, y, font, size, color });
}

function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: PDFFont,
  size: number,
  lineHeight: number,
  color = TEXT_COLOR,
) {
  const lines = wrapText(text, font, size, maxWidth);
  lines.forEach((line, index) => {
    drawText(page, line, x, y - index * lineHeight, font, size, color);
  });
  return lines.length;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  if (!text.trim()) return [""];

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
      continue;
    }

    let fragment = "";
    for (const char of word) {
      const next = `${fragment}${char}`;
      if (font.widthOfTextAtSize(next, size) > maxWidth && fragment) {
        lines.push(fragment);
        fragment = char;
      } else {
        fragment = next;
      }
    }
    current = fragment;
  }

  if (current) lines.push(current);
  return lines;
}

function drawBox(page: PDFPage, x: number, y: number, width: number, height: number) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: SURFACE_COLOR,
    borderColor: BORDER_COLOR,
    borderWidth: 1,
  });
}

function addPage(pdfDoc: PDFDocument): PDFPage {
  return pdfDoc.addPage(PAGE_SIZE);
}

function drawPageHeader(page: PDFPage, quoteNumber: string, ctx: DrawContext) {
  drawText(page, `Cotizacion #${quoteNumber}`, PAGE_MARGIN, PAGE_SIZE[1] - PAGE_MARGIN + 2, ctx.boldFont, 11);
  page.drawLine({
    start: { x: PAGE_MARGIN, y: PAGE_SIZE[1] - PAGE_MARGIN - 6 },
    end: { x: PAGE_SIZE[0] - PAGE_MARGIN, y: PAGE_SIZE[1] - PAGE_MARGIN - 6 },
    thickness: 1,
    color: BORDER_COLOR,
  });
}

function drawTableHeader(page: PDFPage, y: number, ctx: DrawContext) {
  let currentX = PAGE_MARGIN;
  page.drawRectangle({
    x: PAGE_MARGIN,
    y: y - 16,
    width: CONTENT_WIDTH,
    height: 18,
    color: HEADER_FILL,
    borderColor: BORDER_COLOR,
    borderWidth: 1,
  });

  for (const column of TABLE_COLUMNS) {
    drawText(page, column.label, currentX + 4, y - 10, ctx.boldFont, 8, TEXT_COLOR);
    currentX += column.width;
  }
}

function drawSimpleField(
  page: PDFPage,
  label: string,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  ctx: DrawContext,
  options?: { size?: number; valueBold?: boolean },
) {
  const size = options?.size ?? 9;
  const labelText = `${label}: `;
  const labelWidth = ctx.boldFont.widthOfTextAtSize(labelText, size);
  drawText(page, labelText, x, y, ctx.boldFont, size);
  return drawWrappedText(
    page,
    value,
    x + labelWidth,
    y,
    Math.max(20, maxWidth - labelWidth),
    options?.valueBold ? ctx.boldFont : ctx.regularFont,
    size,
    size + 2,
    MUTED_COLOR,
  );
}

function drawTotalsRow(
  page: PDFPage,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  ctx: DrawContext,
  fillColor?: ReturnType<typeof rgb>,
) {
  page.drawRectangle({
    x,
    y: y - 18,
    width,
    height: 18,
    borderColor: BORDER_COLOR,
    borderWidth: 1,
    color: fillColor ?? SURFACE_COLOR,
  });
  drawText(page, label, x + 8, y - 12, ctx.boldFont, 8.5);
  const valueWidth = ctx.regularFont.widthOfTextAtSize(value, 8.5);
  drawText(page, value, x + width - valueWidth - 8, y - 12, ctx.regularFont, 8.5);
}

async function buildQuotePdf(
  quote: Awaited<ReturnType<typeof getQuoteDetail>>,
  logoBytes?: Buffer | null,
) {
  const pdfDoc = await PDFDocument.create();
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let logoImage: PDFImage | undefined;
  if (logoBytes) {
    try {
      logoImage = await pdfDoc.embedPng(logoBytes);
    } catch (error) {
      console.error("No se pudo incrustar el logo en el PDF", error);
    }
  }

  const ctx: DrawContext = { pdfDoc, regularFont, boldFont, logoImage };
  let page = addPage(pdfDoc);
  let y = PAGE_SIZE[1] - PAGE_MARGIN;

  const gutter = 12;
  const leftBoxWidth = (CONTENT_WIDTH - gutter) / 2;
  const rightBoxWidth = leftBoxWidth;
  const boxHeight = 170;
  const leftBoxX = PAGE_MARGIN;
  const rightBoxX = PAGE_MARGIN + leftBoxWidth + gutter;
  const boxY = y - boxHeight;

  drawBox(page, leftBoxX, boxY, leftBoxWidth, boxHeight);
  drawBox(page, rightBoxX, boxY, rightBoxWidth, boxHeight);

  if (ctx.logoImage) {
    const dimensions = ctx.logoImage.scale(0.19);
    page.drawImage(ctx.logoImage, {
      x: leftBoxX + leftBoxWidth - dimensions.width - 12,
      y: boxY + boxHeight - dimensions.height - 10,
      width: dimensions.width,
      height: dimensions.height,
      opacity: 0.14,
    });
  }

  let leftY = boxY + boxHeight - 18;
  const titleLines = drawWrappedText(
    page,
    "ANDRADE VELASQUEZ MARIA SOL",
    leftBoxX + 12,
    leftY,
    leftBoxWidth - 24,
    boldFont,
    13,
    15,
  );
  leftY -= titleLines * 15 + 10;
  // leftY -= drawSimpleField(page, "Dir Matriz", "Pancho Jacome Solar 4A Mz 252", leftBoxX + 12, leftY, leftBoxWidth - 24, ctx) * 11 + 4;
  leftY -= drawSimpleField(page, "Obligado a llevar contabilidad", "NO", leftBoxX + 12, leftY, leftBoxWidth - 24, ctx) * 11 + 4;
  leftY -= drawSimpleField(page, "Documento", "COTIZACION / PROFORMA", leftBoxX + 12, leftY, leftBoxWidth - 24, ctx, { valueBold: true }) * 11;

  const paddedQuoteNumber = `${process.env.COMPANY_ESTAB ?? "001"}-${process.env.COMPANY_PTO_EMI ?? "001"}-${quote.quoteNumber.padStart(9, "0").slice(-9)}`;
  let rightY = boxY + boxHeight - 18;
  drawText(page, "R.U.C.: 956540116001", rightBoxX + 12, rightY, boldFont, 12);
  rightY -= 22;
  drawText(page, "C O T I Z A C I O N", rightBoxX + 12, rightY, boldFont, 13);
  rightY -= 20;
  rightY -= drawSimpleField(page, "No.", paddedQuoteNumber, rightBoxX + 12, rightY, rightBoxWidth - 24, ctx, { valueBold: true }) * 11 + 4;
  rightY -= drawSimpleField(page, "Numero de autorizacion", "NO APLICA PARA COTIZACION", rightBoxX + 12, rightY, rightBoxWidth - 24, ctx) * 11 + 4;
  rightY -= drawSimpleField(page, "Fecha y hora", quote.fechaEmision, rightBoxX + 12, rightY, rightBoxWidth - 24, ctx) * 11 + 4;
  rightY -= drawSimpleField(page, "Ambiente", process.env.SRI_AMBIENTE === "2" ? "PRODUCCION" : "PRUEBAS", rightBoxX + 12, rightY, rightBoxWidth - 24, ctx) * 11 + 4;
  drawSimpleField(page, "Emision", "NORMAL", rightBoxX + 12, rightY, rightBoxWidth - 24, ctx);
  y = boxY - 18;

  const customerNameLines = wrapText(quote.customer.razonSocial, regularFont, 9, CONTENT_WIDTH - 170);
  const customerAddressLines = quote.customer.direccion
    ? wrapText(quote.customer.direccion, regularFont, 9, CONTENT_WIDTH - 110)
    : [];
  const customerBoxHeight = 60 + (customerNameLines.length - 1) * 11 + customerAddressLines.length * 11;
  drawBox(page, PAGE_MARGIN, y - customerBoxHeight, CONTENT_WIDTH, customerBoxHeight);
  let customerY = y - 18;
  customerY -= drawSimpleField(page, "Razon Social / Nombres y Apellidos", quote.customer.razonSocial, PAGE_MARGIN + 12, customerY, CONTENT_WIDTH - 24, ctx) * 11 + 5;
  customerY -= drawSimpleField(page, "Identificacion", quote.customer.identificacion, PAGE_MARGIN + 12, customerY, 220, ctx) * 11;
  drawSimpleField(page, "Fecha Emision", quote.fechaEmision, PAGE_MARGIN + 260, y - 34, 220, ctx);
  if (quote.customer.direccion) {
    drawSimpleField(page, "Direccion", quote.customer.direccion, PAGE_MARGIN + 12, customerY - 5, CONTENT_WIDTH - 24, ctx);
  }
  y = y - customerBoxHeight - 22;

  drawTableHeader(page, y, ctx);
  y -= 24;

  for (const item of quote.items) {
    const descriptionLines = wrapText(item.productName, regularFont, 8.5, TABLE_COLUMNS[1].width - 8);
    const rowHeight = Math.max(20, descriptionLines.length * 10 + 8);

    if (y - rowHeight < PAGE_MARGIN + 110) {
      page = addPage(pdfDoc);
      drawPageHeader(page, quote.quoteNumber, ctx);
      y = PAGE_SIZE[1] - PAGE_MARGIN - 26;
      drawTableHeader(page, y, ctx);
      y -= 24;
    }

    page.drawRectangle({
      x: PAGE_MARGIN,
      y: y - rowHeight + 4,
      width: CONTENT_WIDTH,
      height: rowHeight,
      borderColor: BORDER_COLOR,
      borderWidth: 1,
    });

    let x = PAGE_MARGIN;
    const values = {
      code: item.productCode,
      description: descriptionLines,
      quantity: item.cantidad.toFixed(3),
      unitPrice: money(item.precioUnitario),
      discount: money(item.descuento),
      total: money(item.total),
    };

    for (const column of TABLE_COLUMNS) {
      if (column.key === "description") {
        descriptionLines.forEach((line, index) => {
          drawText(page, line, x + 4, y - 10 - index * 10, regularFont, 8.5);
        });
      } else {
        const rawValue = values[column.key];
        const textWidth = regularFont.widthOfTextAtSize(rawValue, 8.5);
        const textX =
          column.align === "right"
            ? x + column.width - textWidth - 4
            : column.align === "center"
              ? x + (column.width - textWidth) / 2
              : x + 4;
        drawText(page, rawValue, textX, y - 10, regularFont, 8.5);
      }

      x += column.width;
      if (x < PAGE_MARGIN + CONTENT_WIDTH) {
        page.drawLine({
          start: { x, y: y - rowHeight + 4 },
          end: { x, y: y + 4 },
          thickness: 1,
          color: BORDER_COLOR,
        });
      }
    }

    y -= rowHeight;
  }

  if (y < PAGE_MARGIN + 120) {
    page = addPage(pdfDoc);
    drawPageHeader(page, quote.quoteNumber, ctx);
    y = PAGE_SIZE[1] - PAGE_MARGIN - 26;
  }

  const taxableSubtotal = quote.items.reduce((acc, item) => acc + (item.valorIva > 0 ? item.total - item.valorIva : 0), 0);
  const zeroSubtotal = quote.items.reduce((acc, item) => acc + (item.valorIva <= 0 ? item.total : 0), 0);
  const discountTotal = quote.items.reduce((acc, item) => acc + item.descuento, 0);
  const additionalWidth = 250;
  const totalsWidth = 208;
  const summaryHeight = 118;
  const additionalX = PAGE_MARGIN;
  const totalsX = PAGE_MARGIN + CONTENT_WIDTH - totalsWidth;

  drawBox(page, additionalX, y - summaryHeight, additionalWidth, summaryHeight);
  page.drawRectangle({
    x: additionalX,
    y: y - 18,
    width: additionalWidth,
    height: 18,
    color: HEADER_FILL,
    borderColor: BORDER_COLOR,
    borderWidth: 1,
  });
  drawText(page, "Informacion Adicional", additionalX + 8, y - 12, boldFont, 8.5);
  drawText(page, `Moneda: ${quote.moneda}`, additionalX + 8, y - 34, regularFont, 8.5);
  drawWrappedText(
    page,
    `Forma de pago: ${paymentMethodLabel(quote.formaPago)}`,
    additionalX + 8,
    y - 50,
    additionalWidth - 16,
    regularFont,
    8.5,
    10,
  );

  drawBox(page, totalsX, y - summaryHeight, totalsWidth, summaryHeight);
  let totalsY = y;
  if (taxableSubtotal > 0) {
    drawTotalsRow(page, "SUBTOTAL 15%", money(taxableSubtotal), totalsX, totalsY, totalsWidth, ctx);
    totalsY -= 18;
  }
  if (zeroSubtotal > 0) {
    drawTotalsRow(page, "SUBTOTAL 0%", money(zeroSubtotal), totalsX, totalsY, totalsWidth, ctx);
    totalsY -= 18;
  }
  drawTotalsRow(page, "SUBTOTAL SIN IMPUESTOS", money(quote.subtotal), totalsX, totalsY, totalsWidth, ctx);
  totalsY -= 18;
  drawTotalsRow(page, "TOTAL DESCUENTO", money(discountTotal), totalsX, totalsY, totalsWidth, ctx);
  totalsY -= 18;
  if (quote.taxTotal > 0) {
    drawTotalsRow(page, "IVA 15%", money(quote.taxTotal), totalsX, totalsY, totalsWidth, ctx);
    totalsY -= 18;
  }
  drawTotalsRow(page, "VALOR TOTAL", money(quote.total), totalsX, totalsY, totalsWidth, ctx, HEADER_FILL);

  return pdfDoc.save();
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    const business = session?.businessId
      ? await getBusinessContextById(session.businessId)
      : await ensureDefaultBusiness();
    const { id } = await params;
    const quote = await getQuoteDetail(id);
    const logoAsset = await getBusinessLogoAsset(business.logoStorageKey);

    if (quote.status !== "OPEN") {
      return fail("Solo se puede descargar PDF de cotizaciones abiertas", 400);
    }

    const pdfBuffer = await buildQuotePdf(quote, logoAsset?.bytes ?? null);

    return new Response(pdfBuffer as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"cotizacion-${quote.quoteNumber}.pdf\"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error crítico generando PDF:", error);
    const message = error instanceof Error ? error.message : "No se pudo generar PDF de la cotizacion";
    return fail(`Error de generación: ${message}`, 500);
  }
}
