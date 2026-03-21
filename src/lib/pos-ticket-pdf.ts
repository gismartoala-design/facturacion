"use client";

import type { PosTicketData } from "@/lib/pos-ticket-template";

const TICKET_WIDTH = 42;
const MONEY_WIDTH = 10;
const LEFT_WIDTH = TICKET_WIDTH - MONEY_WIDTH;

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
  const total = width - text.length;
  const left = Math.floor(total / 2);
  const right = total - left;
  return repeat(" ", left) + text + repeat(" ", right);
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
    esc.line(centerText(line, TICKET_WIDTH));
  }
  esc.boldOff();

  if (data.documentLabel) {
    for (const line of wrapText(data.documentLabel, TICKET_WIDTH)) {
      esc.line(centerText(line, TICKET_WIDTH));
    }
  }

  if (data.documentNumber) {
    for (const line of wrapText(
      `Documento: ${data.documentNumber}`,
      TICKET_WIDTH,
    )) {
      esc.line(centerText(line, TICKET_WIDTH));
    }
  }

  if (data.saleNumber) {
    esc.line(centerText(`Venta #${data.saleNumber}`, TICKET_WIDTH));
  }

  esc.alignLeft();
  esc.line(divider("="));

  for (const line of wrapText(`Fecha: ${data.createdAt ?? ""}`, TICKET_WIDTH)) {
    esc.line(line);
  }

  for (const line of wrapText(
    `Operador: ${data.operatorName ?? ""}`,
    TICKET_WIDTH,
  )) {
    esc.line(line);
  }

  for (const line of wrapText(
    `Cliente: ${data.customerName ?? ""}`,
    TICKET_WIDTH,
  )) {
    esc.line(line);
  }

  for (const line of wrapText(
    `Pago: ${data.paymentMethodLabel ?? ""}`,
    TICKET_WIDTH,
  )) {
    esc.line(line);
  }

  esc.line(divider("="));
  esc.line(twoColumns("DESCRIP", "P.TOTAL"));
  esc.line(twoColumns("CANT  P.UNIT", ""));
  esc.line(divider("-"));

  for (const item of data.lines ?? []) {
    const itemName = normalizePrintableText((item.name ?? "").toUpperCase());

    for (const line of wrapText(itemName, TICKET_WIDTH)) {
      esc.boldOn();
      esc.line(line);
      esc.boldOff();
    }

    esc.line(
      twoColumns(
        `${item.quantity.toFixed(2)}  ${formatMoney(item.unitPrice)}`,
        formatMoney(item.total),
      ),
    );
  }

  esc.line(divider("-"));
  esc.line(twoColumns("Subtotal", formatMoney(data.subtotal ?? 0)));
  esc.line(twoColumns("IVA", formatMoney(data.taxTotal ?? 0)));

  esc.boldOn();
  esc.line(twoColumns("TOTAL", formatMoney(data.total ?? 0)));
  esc.boldOff();

  esc.line(divider("="));
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
