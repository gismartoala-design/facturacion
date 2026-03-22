"use client";

import type { PosTicketData } from "@/lib/pos-ticket-template";

const TICKET_WIDTH = 42;
const MONEY_WIDTH = 10;
const LEFT_WIDTH = TICKET_WIDTH - MONEY_WIDTH;
const DESC_WIDTH = 18;
const QTY_WIDTH = 5;
const UNIT_WIDTH = 9;
const TOTAL_WIDTH = 10;

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

function divider(char = "=") {
  return repeat(char, TICKET_WIDTH);
}

function twoColumns(left: string, right: string) {
  const l = normalizePrintableText(left);
  const r = normalizePrintableText(right);

  const leftTrimmed = l.length > LEFT_WIDTH ? l.slice(0, LEFT_WIDTH) : l;
  return padRight(leftTrimmed, LEFT_WIDTH) + padLeft(r, MONEY_WIDTH);
}

function labelValueLines(label: string, value: string, width = TICKET_WIDTH) {
  const prefix = `${label}: `;
  const available = Math.max(8, width - prefix.length);
  const wrapped = wrapText(value, available);

  return wrapped.map((line, index) =>
    index === 0 ? `${prefix}${line}` : `${repeat(" ", prefix.length)}${line}`,
  );
}

function itemHeaderLine() {
  return (
    padRight("DESCRIP", DESC_WIDTH) +
    padLeft("CANT", QTY_WIDTH) +
    padLeft("P.UNIT", UNIT_WIDTH) +
    padLeft("P.TOTAL", TOTAL_WIDTH)
  );
}

function itemColumnLines(
  description: string,
  quantity: number,
  unitPrice: number,
  total: number,
) {
  const wrappedDescription = wrapText(description, DESC_WIDTH);

  return wrappedDescription.map((line, index) =>
    padRight(line, DESC_WIDTH) +
    padLeft(index === 0 ? quantity.toFixed(2) : "", QTY_WIDTH) +
    padLeft(index === 0 ? `$${formatMoney(unitPrice)}` : "", UNIT_WIDTH) +
    padLeft(index === 0 ? `$${formatMoney(total)}` : "", TOTAL_WIDTH),
  );
}

function inferDocumentTitle(documentLabel: string, documentNumber: string | null) {
  const label = normalizePrintableText(documentLabel).trim();
  const normalizedNumber = normalizePrintableText(documentNumber ?? "").trim();

  if (!label) {
    return normalizedNumber ? "DOCUMENTO" : "TICKET";
  }

  if (normalizedNumber && label.includes(normalizedNumber)) {
    if (label.toUpperCase().includes("FACTURA")) {
      return "FACTURA";
    }

    if (label.toUpperCase().includes("TICKET")) {
      return "TICKET";
    }

    return "DOCUMENTO";
  }

  return label.toUpperCase();
}

function paymentLines(paymentMethodLabel: string) {
  const lines = wrapText(paymentMethodLabel, TICKET_WIDTH - 2);

  return [
    "Forma de pago:",
    ...lines.map((line, index) => (index === 0 ? line : ` ${line}`)),
  ];
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
    for (let index = 0; index < lines; index += 1) {
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

  esc.alignCenter();
  esc.boldOn();
  for (const line of wrapText(
    (data.businessName ?? "").toUpperCase(),
    TICKET_WIDTH,
  )) {
    esc.line(line);
  }
  esc.boldOff();

  if (documentTitle) {
    esc.boldOn();
    for (const line of wrapText(documentTitle, TICKET_WIDTH)) {
      esc.line(line);
    }
    esc.boldOff();
  }

  if (data.documentNumber) {
    for (const line of wrapText(data.documentNumber, TICKET_WIDTH)) {
      esc.line(line);
    }
  }

  if (
    data.documentLabel &&
    normalizePrintableText(data.documentLabel).trim() !== documentTitle
  ) {
    for (const line of wrapText(data.documentLabel, TICKET_WIDTH)) {
      esc.line(line);
    }
  }

  if (data.saleNumber) {
    esc.line(`Venta #${data.saleNumber}`);
  }

  esc.alignLeft();
  esc.line(divider("="));

  for (const line of labelValueLines("Fecha", data.createdAt ?? "")) {
    esc.line(line);
  }

  for (const line of labelValueLines("Operador", data.operatorName ?? "")) {
    esc.line(line);
  }

  for (const line of labelValueLines("Cliente", data.customerName ?? "")) {
    esc.line(line);
  }

  esc.line(divider("="));
  esc.boldOn();
  esc.line(itemHeaderLine());
  esc.boldOff();
  esc.line(divider("-"));

  for (const item of data.lines ?? []) {
    const itemName = normalizePrintableText((item.name ?? "").toUpperCase());

    esc.boldOn();
    for (const line of itemColumnLines(
      itemName,
      item.quantity,
      item.unitPrice,
      item.total,
    )) {
      esc.line(line);
    }
    esc.boldOff();
  }

  esc.line(divider("-"));
  esc.line(twoColumns("Subtotal", formatMoney(data.subtotal ?? 0)));
  esc.line(twoColumns("Dcto", "0.00"));
  esc.line(twoColumns("IVA", formatMoney(data.taxTotal ?? 0)));

  esc.boldOn();
  esc.line(twoColumns("TOTAL", formatMoney(data.total ?? 0)));
  esc.boldOff();

  esc.line(divider("-"));
  for (const line of paymentLines(data.paymentMethodLabel ?? "")) {
    esc.line(line);
  }
  esc.line(divider("-"));
  esc.alignCenter();
  esc.boldOn();
  esc.line("Gracias por su compra");
  esc.boldOff();

  esc.feed(4);
  esc.cut();

  return esc.build();
}

export function buildPosTicketEscPosBase64(data: PosTicketData): string {
  const ticket = buildPosTicketEscPos(data);

  let binary = "";
  for (let index = 0; index < ticket.bytes.length; index += 1) {
    binary += String.fromCharCode(ticket.bytes[index] ?? 0);
  }

  if (typeof window !== "undefined") {
    return window.btoa(binary);
  }

  return Buffer.from(ticket.bytes).toString("base64");
}
