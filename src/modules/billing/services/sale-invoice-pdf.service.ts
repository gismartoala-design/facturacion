import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";

import { getBusinessLogoAsset } from "@/core/business/business-logo.service";
import type { SaleInvoicePrintData } from "@/lib/sale-invoice-template";
import { getSaleInvoicePrintData } from "@/modules/billing/services/sale-document-render.service";

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
  key:
    | "code"
    | "description"
    | "quantity"
    | "unitPrice"
    | "discount"
    | "total";
  label: string;
  width: number;
  align?: "left" | "right" | "center";
};

const TABLE_COLUMNS: TableColumn[] = [
  { key: "code", label: "Cod. Principal", width: 95, align: "center" },
  { key: "quantity", label: "Cant", width: 40, align: "center" },
  { key: "description", label: "Descripcion", width: 132, align: "left" },
  { key: "unitPrice", label: "Precio Unitario", width: 100, align: "right" },
  { key: "discount", label: "Descuento", width: 75, align: "right" },
  { key: "total", label: "Precio Total", width: 81, align: "right" },
];

type TotalsRow = {
  label: string;
  value: string;
  fillColor?: ReturnType<typeof rgb>;
};

function money(value: number): string {
  return value.toFixed(2);
}

function ambienteLabel(value?: string | null) {
  return value === "PRODUCCION" ? "PRODUCCION" : "PRUEBAS";
}

function accountingRequiredLabel(value?: boolean | null) {
  return value ? "SI" : "NO";
}

function spacedDocumentTitle(value: string) {
  if (!value.trim()) {
    return value;
  }
  return value.trim().split("").join(" ");
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

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
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

function drawBox(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
) {
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

function drawPageHeader(
  page: PDFPage,
  title: string,
  number: string,
  ctx: DrawContext,
) {
  drawText(
    page,
    `${title} ${number}`,
    PAGE_MARGIN,
    PAGE_SIZE[1] - PAGE_MARGIN + 2,
    ctx.boldFont,
    11,
  );
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
    drawText(
      page,
      column.label,
      currentX + 4,
      y - 10,
      ctx.boldFont,
      8,
      TEXT_COLOR,
    );
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

function drawStackedField(
  page: PDFPage,
  label: string,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  ctx: DrawContext,
  options?: { size?: number; valueBold?: boolean; gap?: number },
) {
  const size = options?.size ?? 9;
  const gap = options?.gap ?? 4;
  drawText(page, `${label}:`, x, y, ctx.boldFont, size);
  const lines = drawWrappedText(
    page,
    value,
    x,
    y - (size + gap),
    maxWidth,
    options?.valueBold ? ctx.boldFont : ctx.regularFont,
    size,
    size + 2,
    MUTED_COLOR,
  );
  return size + gap + lines * (size + 2);
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
  drawText(
    page,
    value,
    x + width - valueWidth - 8,
    y - 12,
    ctx.regularFont,
    8.5,
  );
}

function measureSimpleFieldHeight(
  label: string,
  value: string,
  maxWidth: number,
  ctx: DrawContext,
  options?: { size?: number; valueBold?: boolean },
) {
  const size = options?.size ?? 9;
  const labelText = `${label}: `;
  const labelWidth = ctx.boldFont.widthOfTextAtSize(labelText, size);
  const lines = wrapText(
    value,
    options?.valueBold ? ctx.boldFont : ctx.regularFont,
    size,
    Math.max(20, maxWidth - labelWidth),
  );

  return lines.length * (size + 2);
}

export async function buildSalePdf(
  data: SaleInvoicePrintData,
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
      console.error("No se pudo incrustar el logo en el PDF de venta", error);
    }
  }

  const ctx: DrawContext = { pdfDoc, regularFont, boldFont, logoImage };
  let page = addPage(pdfDoc);
  let y = PAGE_SIZE[1] - PAGE_MARGIN;

  const gutter = 12;
  const leftBoxWidth = Math.min(250, CONTENT_WIDTH * 0.46);
  const rightBoxWidth = CONTENT_WIDTH - leftBoxWidth - gutter;
  const rightBoxHeight = data.claveAcceso ? 236 : 214;
  const leftBoxX = PAGE_MARGIN;
  const rightBoxX = PAGE_MARGIN + leftBoxWidth + gutter;
  const logoGap = 10;
  const maxLogoWidth = leftBoxWidth * 1.9;
  const maxLogoHeight = 119;
  let logoWidth = 0;
  let logoHeight = 0;
  const companyTitle = data.companyLegalName || data.companyName;
  const titleLines = wrapText(companyTitle, boldFont, 13, leftBoxWidth - 24);
  let leftBoxContentHeight = titleLines.length * 15 + 10;

  if (data.companyAddress) {
    leftBoxContentHeight +=
      measureSimpleFieldHeight(
        "Dir Matriz",
        data.companyAddress,
        leftBoxWidth - 24,
        ctx,
      ) + 4;
  }

  if (data.companyName && data.companyName !== companyTitle) {
    leftBoxContentHeight +=
      measureSimpleFieldHeight(
        "Nombre comercial",
        data.companyName,
        leftBoxWidth - 24,
        ctx,
      ) + 4;
  }

  leftBoxContentHeight += measureSimpleFieldHeight(
    "Obligado a llevar contabilidad",
    accountingRequiredLabel(data.accountingRequired),
    leftBoxWidth - 24,
    ctx,
  );

  const leftBoxHeight = Math.max(94, leftBoxContentHeight + 28);

  if (ctx.logoImage) {
    const widthScale = maxLogoWidth / ctx.logoImage.width;
    const heightScale = maxLogoHeight / ctx.logoImage.height;
    const scale = Math.min(widthScale, heightScale, 1);
    logoWidth = ctx.logoImage.width * scale;
    logoHeight = ctx.logoImage.height * scale;
  }

  const headerTopY = y;
  const leftBoxTopY = ctx.logoImage
    ? headerTopY - logoHeight - logoGap
    : headerTopY - 10;
  const leftBoxY = leftBoxTopY - leftBoxHeight;
  const rightBoxTopY = headerTopY - 2;
  const rightBoxY = rightBoxTopY - rightBoxHeight;

  if (ctx.logoImage) {
    page.drawImage(ctx.logoImage, {
      x: leftBoxX + (leftBoxWidth - logoWidth) / 2,
      y: headerTopY - logoHeight,
      width: logoWidth,
      height: logoHeight,
    });
  }

  drawBox(page, leftBoxX, leftBoxY, leftBoxWidth, leftBoxHeight);
  drawBox(page, rightBoxX, rightBoxY, rightBoxWidth, rightBoxHeight);

  let leftY = leftBoxTopY - 18;
  drawWrappedText(
    page,
    companyTitle,
    leftBoxX + 12,
    leftY,
    leftBoxWidth - 24,
    boldFont,
    13,
    15,
  );
  leftY -= titleLines.length * 15 + 10;
  if (data.companyAddress) {
    leftY -=
      drawSimpleField(
        page,
        "Dir Matriz",
        data.companyAddress,
        leftBoxX + 12,
        leftY,
        leftBoxWidth - 24,
        ctx,
      ) *
        11 +
      4;
  }
  if (data.companyName && data.companyName !== companyTitle) {
    leftY -=
      drawSimpleField(
        page,
        "Nombre comercial",
        data.companyName,
        leftBoxX + 12,
        leftY,
        leftBoxWidth - 24,
        ctx,
      ) *
        11 +
      4;
  }
  leftY -=
    drawSimpleField(
      page,
      "Obligado a llevar contabilidad",
      accountingRequiredLabel(data.accountingRequired),
      leftBoxX + 12,
      leftY,
      leftBoxWidth - 24,
      ctx,
      { valueBold: false },
    ) * 11;

  let rightY = rightBoxTopY - 18;
  if (data.companyRuc) {
    drawText(
      page,
      `R.U.C.: ${data.companyRuc}`,
      rightBoxX + 12,
      rightY,
      boldFont,
      12,
    );
    rightY -= 22;
  }
  drawText(
    page,
    spacedDocumentTitle(data.documentTitle),
    rightBoxX + 12,
    rightY,
    boldFont,
    13,
  );
  rightY -= 20;
  rightY -=
    drawSimpleField(
      page,
      "No.",
      data.documentNumber ?? `VENTA-${data.saleNumber}`,
      rightBoxX + 12,
      rightY,
      rightBoxWidth - 24,
      ctx,
      { valueBold: true },
    ) *
      11 +
    4;
  if (data.numeroAutorizacion) {
    rightY -=
      drawStackedField(
        page,
        "Numero de autorizacion",
        data.numeroAutorizacion,
        rightBoxX + 12,
        rightY,
        rightBoxWidth - 24,
        ctx,
      ) + 8;
  }
  if (data.fechaAutorizacion) {
    rightY -=
      drawSimpleField(
        page,
        "Fecha y hora de autorizacion",
        data.fechaAutorizacion,
        rightBoxX + 12,
        rightY,
        rightBoxWidth - 24,
        ctx,
      ) *
        11 +
      4;
  }
  rightY -=
    drawSimpleField(
      page,
      "Ambiente",
      ambienteLabel(data.ambiente),
      rightBoxX + 12,
      rightY,
      rightBoxWidth - 24,
      ctx,
    ) *
      11 +
    4;
  rightY -=
    drawSimpleField(
      page,
      "Emision",
      "NORMAL",
      rightBoxX + 12,
      rightY,
      rightBoxWidth - 24,
      ctx,
    ) *
      11 +
    4;
  if (!data.numeroAutorizacion && data.documentStatus !== "ISSUED") {
    rightY -=
      drawSimpleField(
        page,
        "Estado",
        data.documentStatusLabel,
        rightBoxX + 12,
        rightY,
        rightBoxWidth - 24,
        ctx,
        { valueBold: true },
      ) *
        11 +
      4;
  }
  if (data.claveAcceso) {
    rightY -=
      drawStackedField(
        page,
        "Clave de acceso",
        data.claveAcceso,
        rightBoxX + 12,
        rightY,
        rightBoxWidth - 24,
        ctx,
      ) + 8;
  }

  y = Math.min(leftBoxY, rightBoxY) - 18;

  const customerNameLines = wrapText(
    data.customerName,
    regularFont,
    9,
    CONTENT_WIDTH - 170,
  );
  const customerAddressLines = data.customerAddress
    ? wrapText(data.customerAddress, regularFont, 9, CONTENT_WIDTH - 110)
    : [];
  const customerBoxHeight =
    60 + (customerNameLines.length - 1) * 11 + customerAddressLines.length * 11;
  drawBox(page, PAGE_MARGIN, y - customerBoxHeight, CONTENT_WIDTH, customerBoxHeight);
  let customerY = y - 18;
  customerY -=
    drawSimpleField(
      page,
      "Razon Social / Nombres y Apellidos",
      data.customerName,
      PAGE_MARGIN + 12,
      customerY,
      CONTENT_WIDTH - 24,
      ctx,
    ) *
      11 +
    5;
  customerY -=
    drawSimpleField(
      page,
      "Identificacion",
      data.customerIdentification,
      PAGE_MARGIN + 12,
      customerY,
      220,
      ctx,
    ) * 11;
  drawSimpleField(
    page,
    "Fecha Emision",
    data.fechaEmision,
    PAGE_MARGIN + 260,
    y - 34,
    220,
    ctx,
  );
  if (data.customerAddress) {
    drawSimpleField(
      page,
      "Direccion",
      data.customerAddress,
      PAGE_MARGIN + 12,
      customerY - 5,
      CONTENT_WIDTH - 24,
      ctx,
    );
  }
  y = y - customerBoxHeight - 22;

  drawTableHeader(page, y, ctx);
  y -= 24;

  for (const item of data.items) {
    const descriptionLines = wrapText(
      item.productName,
      regularFont,
      8.5,
      TABLE_COLUMNS[1].width - 8,
    );
    const rowHeight = Math.max(20, descriptionLines.length * 10 + 8);

    if (y - rowHeight < PAGE_MARGIN + 110) {
      page = addPage(pdfDoc);
      drawPageHeader(
        page,
        data.documentTitle,
        data.documentNumber ?? `VENTA-${data.saleNumber}`,
        ctx,
      );
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
    drawPageHeader(
      page,
      data.documentTitle,
      data.documentNumber ?? `VENTA-${data.saleNumber}`,
      ctx,
    );
    y = PAGE_SIZE[1] - PAGE_MARGIN - 26;
  }

  const taxableSubtotal = data.items.reduce(
    (acc, item) => acc + (item.valorIva > 0 ? item.subtotal : 0),
    0,
  );
  const zeroSubtotal = data.items.reduce(
    (acc, item) => acc + (item.valorIva <= 0 ? item.subtotal : 0),
    0,
  );
  const additionalWidth = 260;
  const totalsWidth = 210;
  const totalsRows: TotalsRow[] = [];
  if (taxableSubtotal > 0) {
    totalsRows.push({
      label: "SUBTOTAL 15%",
      value: money(taxableSubtotal),
    });
  }
  if (zeroSubtotal > 0) {
    totalsRows.push({
      label: "SUBTOTAL 0%",
      value: money(zeroSubtotal),
    });
  }
  totalsRows.push({
    label: "SUBTOTAL SIN IMPUESTOS",
    value: money(data.subtotal),
  });
  totalsRows.push({
    label: "TOTAL DESCUENTO",
    value: money(data.discountTotal),
  });
  totalsRows.push({
    label: "IVA 15%",
    value: money(data.taxTotal),
  });
  totalsRows.push({
    label: "VALOR TOTAL",
    value: money(data.total),
    fillColor: HEADER_FILL,
  });
  const summaryHeight = totalsRows.length * 18;
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
  drawText(
    page,
    "Informacion Adicional",
    additionalX + 8,
    y - 12,
    boldFont,
    8.5,
  );
  let additionalY = y - 34;
  drawText(
    page,
    `Moneda: ${data.moneda}`,
    additionalX + 8,
    additionalY,
    regularFont,
    8.5,
  );
  additionalY -= 16;
  drawWrappedText(
    page,
    `Forma de pago: ${data.paymentMethodLabels.join(", ") || "No registradas"}`,
    additionalX + 8,
    additionalY,
    additionalWidth - 16,
    regularFont,
    8.5,
    10,
  );

  drawBox(page, totalsX, y - summaryHeight, totalsWidth, summaryHeight);
  let totalsY = y;
  for (const totalsRow of totalsRows) {
    drawTotalsRow(
      page,
      totalsRow.label,
      totalsRow.value,
      totalsX,
      totalsY,
      totalsWidth,
      ctx,
      totalsRow.fillColor,
    );
    totalsY -= 18;
  }

  return pdfDoc.save();
}

export async function buildSaleInvoicePdfBuffer(
  saleId: string,
  businessId: string,
  logoStorageKey?: string | null,
) {
  const sale = await getSaleInvoicePrintData(saleId, businessId);
  const logoAsset = await getBusinessLogoAsset(logoStorageKey);
  return buildSalePdf(sale, logoAsset?.bytes ?? null);
}
