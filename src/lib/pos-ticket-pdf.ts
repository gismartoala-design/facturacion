"use client";

import type { PosTicketData } from "@/lib/pos-ticket-template";

function readEnvInt(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : fallback;
}

const TICKET_WIDTH = readEnvInt("NEXT_PUBLIC_POS_TICKET_WIDTH", 32);

// Columnas del detalle
const DESC_WIDTH = readEnvInt("NEXT_PUBLIC_POS_TICKET_DESC_WIDTH", 12);
const QTY_WIDTH = readEnvInt("NEXT_PUBLIC_POS_TICKET_QTY_WIDTH", 5);
const UNIT_WIDTH = readEnvInt("NEXT_PUBLIC_POS_TICKET_UNIT_WIDTH", 7);
const TOTAL_WIDTH = readEnvInt("NEXT_PUBLIC_POS_TICKET_TOTAL_WIDTH", 8);

// Totales
const MONEY_WIDTH = readEnvInt("NEXT_PUBLIC_POS_TICKET_MONEY_WIDTH", 10);
const LABEL_WIDTH = readEnvInt("NEXT_PUBLIC_POS_TICKET_LABEL_WIDTH", 22);


// const TICKET_WIDTH = 32;

// // Columnas del detalle
// const DESC_WIDTH = 12;
// const QTY_WIDTH = 5;
// const UNIT_WIDTH = 7;
// const TOTAL_WIDTH = 8;

// // Totales
// const MONEY_WIDTH = 10;
// const LABEL_WIDTH = 22;

function formatMoney(value: number) {
  return value.toFixed(2);
}

function repeat(char: string, times: number) {
  return new Array(times + 1).join(char);
}

function safeText(text: string) {
  return (text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function normalizePrintableText(text: string) {
  return safeText(text)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/–/g, "-")
    .replace(/—/g, "-");
}

function wrapText(text: string, width: number): string[] {
  const normalized = normalizePrintableText(text).trim();
  if (!normalized) return [""];

  const words = normalized.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      if (word.length <= width) {
        current = word;
      } else {
        let rest = word;
        while (rest.length > width) {
          lines.push(rest.slice(0, width));
          rest = rest.slice(width);
        }
        current = rest;
      }
      continue;
    }

    const candidate = `${current} ${word}`;
    if (candidate.length <= width) {
      current = candidate;
    } else {
      lines.push(current);

      if (word.length <= width) {
        current = word;
      } else {
        let rest = word;
        while (rest.length > width) {
          lines.push(rest.slice(0, width));
          rest = rest.slice(width);
        }
        current = rest;
      }
    }
  }

  if (current) lines.push(current);

  return lines;
}

function padRight(text: string, width: number) {
  if (text.length >= width) return text.slice(0, width);
  return text + repeat(" ", width - text.length);
}

function padLeft(text: string, width: number) {
  if (text.length >= width) return text.slice(0, width);
  return repeat(" ", width - text.length) + text;
}

function centerText(text: string, width: number) {
  if (text.length >= width) return text.slice(0, width);
  const remaining = width - text.length;
  const left = Math.floor(remaining / 2);
  const right = remaining - left;
  return repeat(" ", left) + text + repeat(" ", right);
}

function divider(char = "=") {
  return repeat(char, TICKET_WIDTH);
}

function dividerThin() {
  return repeat("-", TICKET_WIDTH);
}

function amountLine(label: string, value: string) {
  return padRight(label, LABEL_WIDTH) + padLeft(value, MONEY_WIDTH);
}

function labelValueLines(label: string, value: string, width = TICKET_WIDTH) {
  const prefix = `${label}: `;
  const contentWidth = Math.max(8, width - prefix.length);
  const wrapped = wrapText(value, contentWidth);

  return wrapped.map((line, index) =>
    index === 0 ? `${prefix}${line}` : `${repeat(" ", prefix.length)}${line}`,
  );
}

function centeredFieldLines(label: string, value: string, width = TICKET_WIDTH) {
  return wrapText(`${label}: ${value}`, width).map((line) =>
    centerText(line, width),
  );
}

function inferDocumentTitle(documentLabel: string, documentNumber: string | null) {
  const label = normalizePrintableText(documentLabel).trim();
  const number = normalizePrintableText(documentNumber ?? "").trim();

  if (!label) {
    return number ? "DOCUMENTO" : "TICKET";
  }

  if (number && label.includes(number)) {
    if (label.toUpperCase().includes("FACTURA")) return "FACTURA";
    if (label.toUpperCase().includes("NOTA DE VENTA")) return "NOTA DE VENTA";
    if (label.toUpperCase().includes("TICKET")) return "TICKET";
    return "DOCUMENTO";
  }

  return label.toUpperCase();
}

function accountingRequiredLabel(value?: boolean) {
  return value ? "SI" : "NO";
}

function environmentLabel(value?: string | null) {
  return value === "PRODUCCION" ? "PRODUCCION" : "PRUEBAS";
}

function authorizationReference(data: PosTicketData) {
  return data.authorizationNumber || data.accessKey || "";
}

function ticketFieldValue(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : "-";
}

function ticketBusinessContact(data: PosTicketData) {
  const values = [data.businessPhone?.trim(), data.businessEmail?.trim()].filter(
    (value): value is string => Boolean(value),
  );
  return values.length > 0 ? values.join("  ") : "-";
}

function paymentLines(paymentMethodLabel: string) {
  const lines = wrapText(paymentMethodLabel, TICKET_WIDTH - 2);
  return [
    "Forma de pago:",
    ...lines.map((line, index) => (index === 0 ? line : ` ${line}`)),
  ];
}

function stackedLabelValueLines(label: string, value: string, width = TICKET_WIDTH) {
  return [
    `${label}:`,
    ...wrapText(value, width).map((line) => line),
  ];
}

function itemHeaderLine1() {
  return (
    padRight("DESCRIP", DESC_WIDTH) +
    padLeft("CANT", QTY_WIDTH) +
    padLeft("P.UNIT", UNIT_WIDTH) +
    padLeft("P.TOTAL", TOTAL_WIDTH)
  );
}

function itemLines(
  description: string,
  quantity: number,
  unitPrice: number,
  total: number,
) {
  const descLines = wrapText(description, DESC_WIDTH);

  return descLines.map((line, index) => {
    const qty = index === 0 ? quantity.toFixed(2) : "";
    const unit = index === 0 ? `$${formatMoney(unitPrice)}` : "";
    const tot = index === 0 ? `$${formatMoney(total)}` : "";

    return (
      padRight(line, DESC_WIDTH) +
      padLeft(qty, QTY_WIDTH) +
      padLeft(unit, UNIT_WIDTH) +
      padLeft(tot, TOTAL_WIDTH)
    );
  });
}

export type EscPosBuildResult = {
  rawText: string;
  bytes: Uint8Array;
};

class EscPos {
  private out = "";

  private write(value: string) {
    this.out += value;
    return this;
  }

  initialize() {
    return this.write("\x1B\x40");
  }

  fontA() {
    return this.write("\x1B\x4D\x00");
  }

  fontB() {
    return this.write("\x1B\x4D\x01");
  }

  alignLeft() {
    return this.write("\x1B\x61\x00");
  }

  alignCenter() {
    return this.write("\x1B\x61\x01");
  }

  alignRight() {
    return this.write("\x1B\x61\x02");
  }

  boldOn() {
    return this.write("\x1B\x45\x01");
  }

  boldOff() {
    return this.write("\x1B\x45\x00");
  }

  normalSize() {
    return this.write("\x1D\x21\x00");
  }

  doubleHeight() {
    return this.write("\x1D\x21\x10");
  }

  doubleWidth() {
    return this.write("\x1D\x21\x01");
  }

  doubleSize() {
    return this.write("\x1D\x21\x11");
  }

  codePagePc858() {
    return this.write("\x1B\x74\x12");
  }

  line(text = "") {
    this.write(normalizePrintableText(text));
    this.write("\n");
    return this;
  }

  feed(lines = 1) {
    for (let i = 0; i < lines; i += 1) {
      this.write("\n");
    }
    return this;
  }

  cut() {
    return this.write("\x1D\x56\x00");
  }

  build(): EscPosBuildResult {
    const bytes = new Uint8Array(
      Array.from(this.out).map((char) => char.charCodeAt(0)),
    );

    return {
      rawText: this.out,
      bytes,
    };
  }
}

export function buildPosTicketEscPos(data: PosTicketData): EscPosBuildResult {
  const esc = new EscPos();
  const documentTitle = inferDocumentTitle(
    data.documentLabel ?? "",
    data.documentNumber,
  );

  esc.initialize();
  esc.codePagePc858();

  esc.fontA();
  esc.normalSize();
  esc.feed(1);

  esc.alignCenter();
  for (const line of wrapText(
    (data.businessLegalName ?? data.businessName ?? "").toUpperCase(),
    TICKET_WIDTH,
  )) {
    esc.line(centerText(line, TICKET_WIDTH));
  }

  if (
    data.businessLegalName &&
    data.businessName &&
    data.businessLegalName !== data.businessName
  ) {
    for (const line of wrapText(data.businessName.toUpperCase(), TICKET_WIDTH)) {
      esc.line(centerText(line, TICKET_WIDTH));
    }
  }

  for (const line of centeredFieldLines("RUC", ticketFieldValue(data.businessRuc))) {
    esc.line(line);
  }

  for (const line of centeredFieldLines("Direccion", ticketFieldValue(data.businessAddress))) {
    esc.line(line);
  }

  for (const line of centeredFieldLines("Contacto", ticketBusinessContact(data))) {
    esc.line(line);
  }

  if (documentTitle) {
    for (const line of wrapText(documentTitle, TICKET_WIDTH)) {
      esc.line(centerText(line, TICKET_WIDTH));
    }
  }

  if (data.documentNumber) {
    for (const line of wrapText(
      `${data.documentType === "INVOICE" ? "FAC #:" : "COMP #:"}${data.documentNumber}`,
      TICKET_WIDTH,
    )) {
      esc.line(centerText(line, TICKET_WIDTH));
    }
  }

  if (data.documentType === "INVOICE") {
    for (const line of centeredFieldLines("Ambiente", environmentLabel(data.environment))) {
      esc.line(line);
    }

    for (const line of centeredFieldLines("Emision", "NORMAL")) {
      esc.line(line);
    }

    for (const line of stackedLabelValueLines(
      "No. de autorizacion",
      ticketFieldValue(data.authorizationNumber),
    )) {
      esc.line(centerText(line.trim(), TICKET_WIDTH));
    }

    for (const line of stackedLabelValueLines(
      "Clave de acceso",
      ticketFieldValue(data.accessKey),
    )) {
      esc.line(centerText(line.trim(), TICKET_WIDTH));
    }
  } else if (data.saleNumber) {
    esc.line(centerText(`Venta #${data.saleNumber}`, TICKET_WIDTH));
  }

  esc.alignLeft();
  esc.line(divider());

  for (const line of labelValueLines("Cajero", data.operatorName ?? "")) {
    esc.line(line);
  }

  for (const line of labelValueLines("Fecha", data.createdAt ?? "")) {
    esc.line(line);
  }

  for (const line of labelValueLines("Cliente", data.customerName ?? "")) {
    esc.line(line);
  }

  for (const line of labelValueLines(
    "Email",
    ticketFieldValue(data.customerEmail),
  )) {
    esc.line(line);
  }

  for (const line of labelValueLines(
    "Telefono",
    ticketFieldValue(data.customerPhone),
  )) {
    esc.line(line);
  }

  for (const line of labelValueLines(
    "Direccion",
    ticketFieldValue(data.customerAddress),
  )) {
    esc.line(line);
  }

  for (const line of labelValueLines(
    "Cedula/RUC",
    ticketFieldValue(data.customerIdentification),
  )) {
    esc.line(line);
  }

  esc.line(divider());

  esc.line(itemHeaderLine1());
  esc.line(dividerThin());

  for (const item of data.lines ?? []) {
    const itemName = normalizePrintableText((item.name ?? "").toUpperCase());

    for (const line of itemLines(
      itemName,
      item.quantity,
      item.unitPrice,
      item.total,
    )) {
      esc.line(line);
    }

    esc.line(dividerThin());
  }

  esc.line(amountLine("Subtotal", formatMoney(data.subtotal ?? 0)));
  esc.line(amountLine("Dcto", formatMoney(data.discountTotal ?? 0)));
  esc.line(amountLine("IVA", formatMoney(data.taxTotal ?? 0)));
  esc.line(amountLine("TOTAL", formatMoney(data.total ?? 0)));

  esc.line(divider());

  for (const line of paymentLines(data.paymentMethodLabel ?? "")) {
    esc.line(line);
  }

  esc.line(divider());

  esc.feed(4);
  esc.cut();

  return esc.build();
}

export function buildPosTicketEscPosBase64(data: PosTicketData): string {
  const ticket = buildPosTicketEscPos(data);

  let binary = "";
  for (let i = 0; i < ticket.bytes.length; i += 1) {
    binary += String.fromCharCode(ticket.bytes[i] ?? 0);
  }

  if (typeof window !== "undefined") {
    return window.btoa(binary);
  }

  return Buffer.from(ticket.bytes).toString("base64");
}
