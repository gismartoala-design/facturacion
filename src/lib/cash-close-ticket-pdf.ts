"use client";

import type { CashCloseTicketData } from "@/lib/cash-close-ticket-template";

function readEnvInt(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : fallback;
}

const TICKET_WIDTH = readEnvInt("NEXT_PUBLIC_POS_TICKET_WIDTH", 32);
const MONEY_WIDTH = readEnvInt("NEXT_PUBLIC_POS_TICKET_MONEY_WIDTH", 10);
const LABEL_WIDTH = readEnvInt("NEXT_PUBLIC_POS_TICKET_LABEL_WIDTH", 22);

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

function ticketFieldValue(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : "-";
}

function businessContact(data: CashCloseTicketData) {
  const values = [data.businessPhone?.trim(), data.businessEmail?.trim()].filter(
    (value): value is string => Boolean(value),
  );
  return values.length > 0 ? values.join(" / ") : "-";
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

function differenceLabel(value: number) {
  if (value === 0) return "Sin diferencia";
  return value > 0 ? "Sobrante" : "Faltante";
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

export function buildCashCloseTicketEscPos(
  data: CashCloseTicketData,
): EscPosBuildResult {
  const esc = new EscPos();

  esc.initialize();
  esc.codePagePc858();

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

  esc.line(centerText("CIERRE DE CAJA", TICKET_WIDTH));

  for (const line of labelValueLines("RUC", ticketFieldValue(data.businessRuc))) {
    esc.line(centerText(line, TICKET_WIDTH));
  }
  for (const line of labelValueLines("Direccion", ticketFieldValue(data.businessAddress))) {
    esc.line(centerText(line, TICKET_WIDTH));
  }
  for (const line of labelValueLines("Contacto", businessContact(data))) {
    esc.line(centerText(line, TICKET_WIDTH));
  }

  esc.line(divider());
  for (const line of labelValueLines("Cajero", data.operatorName)) {
    esc.line(line);
  }
  for (const line of labelValueLines("Sesion", data.sessionId)) {
    esc.line(line);
  }
  for (const line of labelValueLines("Apertura", data.openedAt)) {
    esc.line(line);
  }
  for (const line of labelValueLines("Cierre", data.closedAt)) {
    esc.line(line);
  }

  esc.line(divider());
  esc.line(amountLine("Fondo inicial", formatMoney(data.openingAmount)));
  esc.line(amountLine("Ventas efectivo", formatMoney(data.salesCashTotal)));
  esc.line(amountLine("Mov. netos caja", formatMoney(data.movementsTotal)));
  esc.line(amountLine("Esperado", formatMoney(data.expectedClosing)));
  esc.line(amountLine("Declarado", formatMoney(data.declaredClosing)));
  esc.line(
    amountLine(
      differenceLabel(data.difference),
      formatMoney(Math.abs(data.difference)),
    ),
  );

  esc.line(divider());
  esc.line("Cierre considera solo caja fisica");
  esc.line("efectivo y movimientos manuales");
  esc.line("No incluye tarjeta/transfer.");

  if (data.notes?.trim()) {
    esc.line(divider());
    esc.line("Notas:");
    for (const line of wrapText(data.notes.trim(), TICKET_WIDTH)) {
      esc.line(line);
    }
  }

  esc.line(divider());
  esc.feed(4);
  esc.cut();

  return esc.build();
}
