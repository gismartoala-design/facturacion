"use client";

import type { PosTicketData } from "@/lib/pos-ticket-template";

const TICKET_WIDTH = 42; // Epson 80mm usualmente 42 o 48 columnas según font/modo

function formatMoney(value: number) {
  return value.toFixed(2);
}

function stripAccents(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeText(text: string) {
  return stripAccents(text)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/–/g, "-")
    .replace(/—/g, "-");
}

function repeat(char: string, times: number) {
  return new Array(times + 1).join(char);
}

function centerText(text: string, width: number) {
  if (text.length >= width) return text.slice(0, width);
  const total = width - text.length;
  const left = Math.floor(total / 2);
  const right = total - left;
  return repeat(" ", left) + text + repeat(" ", right);
}

function wrapText(text: string, width: number): string[] {
  const normalized = normalizeText(text).trim();

  if (!normalized) return [""];

  const words = normalized.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      if (word.length <= width) {
        current = word;
      } else {
        let remaining = word;
        while (remaining.length > width) {
          lines.push(remaining.slice(0, width));
          remaining = remaining.slice(width);
        }
        current = remaining;
      }
      continue;
    }

    const candidate = `${current} ${word}`;
    if (candidate.length <= width) {
      current = candidate;
      continue;
    }

    lines.push(current);

    if (word.length <= width) {
      current = word;
      continue;
    }

    let remaining = word;
    while (remaining.length > width) {
      lines.push(remaining.slice(0, width));
      remaining = remaining.slice(width);
    }
    current = remaining;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function twoColumn(left: string, right: string, width = TICKET_WIDTH) {
  const l = normalizeText(left);
  const r = normalizeText(right);

  if (r.length >= width) {
    return r.slice(0, width);
  }

  const availableLeft = width - r.length - 1;
  if (availableLeft <= 0) {
    return l.slice(0, width);
  }

  const leftText =
    l.length > availableLeft ? l.slice(0, availableLeft) : l;

  return leftText + repeat(" ", width - leftText.length - r.length) + r;
}

function itemPriceLine(quantity: number, unitPrice: number, total: number) {
  const left = `${quantity.toFixed(2)} x $${formatMoney(unitPrice)}`;
  const right = `$${formatMoney(total)}`;
  return twoColumn(left, right);
}

class EscPosBuilder {
  private chunks: number[] = [];

  private push(...bytes: number[]) {
    this.chunks.push(...bytes);
  }

  private pushTextRaw(text: string) {
    const normalized = normalizeText(text);
    for (let i = 0; i < normalized.length; i++) {
      const code = normalized.charCodeAt(i);
      this.chunks.push(code <= 255 ? code : 63);
    }
  }

  initialize() {
    this.push(0x1b, 0x40); // ESC @
    return this;
  }

  alignLeft() {
    this.push(0x1b, 0x61, 0x00); // ESC a 0
    return this;
  }

  alignCenter() {
    this.push(0x1b, 0x61, 0x01); // ESC a 1
    return this;
  }

  alignRight() {
    this.push(0x1b, 0x61, 0x02); // ESC a 2
    return this;
  }

  bold(on = true) {
    this.push(0x1b, 0x45, on ? 0x01 : 0x00); // ESC E n
    return this;
  }

  fontA() {
    this.push(0x1b, 0x4d, 0x00); // ESC M 0
    return this;
  }

  fontB() {
    this.push(0x1b, 0x4d, 0x01); // ESC M 1
    return this;
  }

  normalSize() {
    this.push(0x1d, 0x21, 0x00); // GS ! 0
    return this;
  }

  doubleHeight() {
    this.push(0x1d, 0x21, 0x01 << 4); // GS ! 16
    return this;
  }

  doubleWidth() {
    this.push(0x1d, 0x21, 0x01); // GS ! 1
    return this;
  }

  doubleSize() {
    this.push(0x1d, 0x21, 0x11); // GS ! 17
    return this;
  }

  text(text: string) {
    this.pushTextRaw(text);
    return this;
  }

  line(text = "") {
    this.pushTextRaw(text);
    this.push(0x0a); // LF
    return this;
  }

  blank(lines = 1) {
    for (let i = 0; i < lines; i++) {
      this.push(0x0a);
    }
    return this;
  }

  divider(char = "-") {
    this.line(repeat(char, TICKET_WIDTH));
    return this;
  }

  feed(lines = 3) {
    return this.blank(lines);
  }

  cut() {
    this.push(0x1d, 0x56, 0x00); // GS V 0
    return this;
  }

  build() {
    return new Uint8Array(this.chunks);
  }
}

export function buildPosTicketEscPos(data: PosTicketData): Uint8Array {
  const b = new EscPosBuilder();

  b.initialize();
  b.fontA();
  b.normalSize();
  b.alignCenter();
  b.bold(true);

  for (const line of wrapText(data.businessName.toUpperCase(), TICKET_WIDTH)) {
    b.line(centerText(line, TICKET_WIDTH));
  }

  b.bold(false);

  for (const line of wrapText(data.documentLabel, TICKET_WIDTH)) {
    b.line(centerText(line, TICKET_WIDTH));
  }

  if (data.documentNumber) {
    for (const line of wrapText(`Documento: ${data.documentNumber}`, TICKET_WIDTH)) {
      b.line(centerText(line, TICKET_WIDTH));
    }
  }

  b.line(centerText(`Venta #${normalizeText(data.saleNumber)}`, TICKET_WIDTH));

  b.alignLeft();
  b.divider();

  for (const line of wrapText(`Fecha: ${data.createdAt}`, TICKET_WIDTH)) {
    b.line(line);
  }
  for (const line of wrapText(`Operador: ${data.operatorName}`, TICKET_WIDTH)) {
    b.line(line);
  }
  for (const line of wrapText(`Cliente: ${data.customerName}`, TICKET_WIDTH)) {
    b.line(line);
  }
  for (const line of wrapText(`Pago: ${data.paymentMethodLabel}`, TICKET_WIDTH)) {
    b.line(line);
  }

  b.divider();

  for (const item of data.lines) {
    b.bold(true);
    for (const line of wrapText(item.name.toUpperCase(), TICKET_WIDTH)) {
      b.line(line);
    }
    b.bold(false);

    b.line(itemPriceLine(item.quantity, item.unitPrice, item.total));
  }

  b.divider();

  b.line(twoColumn("Subtotal", `$${formatMoney(data.subtotal)}`));
  b.line(twoColumn("IVA", `$${formatMoney(data.taxTotal)}`));

  b.bold(true);
  b.line(twoColumn("TOTAL", `$${formatMoney(data.total)}`));
  b.bold(false);

  b.divider();
  b.alignCenter();
  b.bold(true);
  b.line("Gracias por su compra");
  b.bold(false);

  b.feed(4);
  b.cut();

  return b.build();
}

export function buildPosTicketEscPosBase64(data: PosTicketData): string {
  const bytes = buildPosTicketEscPos(data);

  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  if (typeof window !== "undefined") {
    return window.btoa(binary);
  }

  return Buffer.from(bytes).toString("base64");
}
