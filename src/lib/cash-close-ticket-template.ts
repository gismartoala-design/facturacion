export type CashCloseTicketData = {
  businessName: string;
  businessLegalName?: string | null;
  businessRuc?: string | null;
  businessAddress?: string | null;
  businessPhone?: string | null;
  businessEmail?: string | null;
  operatorName: string;
  sessionId: string;
  openedAt: string;
  closedAt: string;
  openingAmount: number;
  salesCashTotal: number;
  salesLabel?: string;
  salesCount?: number | null;
  movementsTotal?: number | null;
  expectedClosing?: number | null;
  declaredClosing: number;
  declaredClosingLabel?: string;
  difference?: number | null;
  footerNotes?: string[];
  notes?: string | null;
};

type CashCloseTicketHtmlOptions = {
  autoPrint?: boolean;
  autoClose?: boolean;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMoney(value: number) {
  return value.toFixed(2);
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

function differenceLabel(value: number) {
  if (value === 0) return "Sin diferencia";
  return value > 0 ? "Sobrante" : "Faltante";
}

function declaredClosingLabel(value?: string) {
  return value?.trim() || "Declarado";
}

export function buildCashCloseTicketHtml(
  data: CashCloseTicketData,
  options: CashCloseTicketHtmlOptions = {},
) {
  const autoPrint = options.autoPrint ?? true;
  const autoClose = options.autoClose ?? autoPrint;

  return `<!DOCTYPE html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <title>Cierre de caja ${escapeHtml(data.sessionId)}</title>
      <style>
        :root { color-scheme: light; }
        @page { size: 78mm auto; margin: 0; }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 0;
          font-family: "Courier New", Courier, monospace;
          background: #fff;
          color: #111827;
        }
        .ticket {
          width: 78mm;
          margin: 0 auto;
          padding: 4px 6px 6px;
        }
        .center { text-align: center; }
        .divider {
          border-top: 1px dashed #9ca3af;
          margin: 6px 0;
        }
        h1 {
          margin: 0 0 3px;
          font-size: 15px;
          font-weight: 400;
          text-transform: uppercase;
        }
        p {
          margin: 2px 0;
          font-size: 13px;
          line-height: 1.3;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        td {
          padding: 2px 0;
          font-size: 13px;
          vertical-align: top;
        }
        .right {
          text-align: right;
          white-space: nowrap;
          padding-left: 8px;
        }
        .print-actions {
          display: flex;
          justify-content: center;
          margin-bottom: 12px;
        }
        .print-actions button {
          border: 1px solid #d1d5db;
          background: #fff;
          color: #111827;
          border-radius: 999px;
          padding: 8px 14px;
          font: inherit;
          cursor: pointer;
        }
        @media print {
          html, body { margin: 0; padding: 0; }
          .print-actions { display: none; }
        }
      </style>
    </head>
    <body${
      autoPrint
        ? ` onload="window.print();${autoClose ? " window.close();" : ""}"`
        : ""
    }>
      <main class="ticket">
        ${
          autoPrint
            ? ""
            : `<div class="print-actions"><button onclick="window.print()">Imprimir cierre</button></div>`
        }
        <div class="center">
          <h1>${escapeHtml(data.businessLegalName || data.businessName)}</h1>
          ${
            data.businessLegalName &&
            data.businessName &&
            data.businessLegalName !== data.businessName
              ? `<p>${escapeHtml(data.businessName)}</p>`
              : ""
          }
          <p>CIERRE DE CAJA</p>
          <p>RUC: ${escapeHtml(ticketFieldValue(data.businessRuc))}</p>
          <p>Direccion: ${escapeHtml(ticketFieldValue(data.businessAddress))}</p>
          <p>Contacto: ${escapeHtml(businessContact(data))}</p>
        </div>
        <div class="divider"></div>
        <p>Cajero: ${escapeHtml(data.operatorName)}</p>
        <p>Sesion: ${escapeHtml(data.sessionId)}</p>
        <p>Apertura: ${escapeHtml(data.openedAt)}</p>
        <p>Cierre: ${escapeHtml(data.closedAt)}</p>
        <div class="divider"></div>
        <table>
          <tbody>
            <tr><td>Fondo inicial</td><td class="right">$${formatMoney(data.openingAmount)}</td></tr>
            <tr><td>${escapeHtml(data.salesLabel?.trim() || "Ventas efectivo")}</td><td class="right">$${formatMoney(data.salesCashTotal)}</td></tr>
            ${
              data.salesCount != null
                ? `<tr><td>Ventas registradas</td><td class="right">${escapeHtml(String(data.salesCount))}</td></tr>`
                : ""
            }
            ${
              data.movementsTotal != null
                ? `<tr><td>Mov. netos caja</td><td class="right">$${formatMoney(data.movementsTotal)}</td></tr>`
                : ""
            }
            ${
              data.expectedClosing != null
                ? `<tr><td>Esperado en caja</td><td class="right">$${formatMoney(data.expectedClosing)}</td></tr>`
                : ""
            }
            <tr><td>${escapeHtml(declaredClosingLabel(data.declaredClosingLabel))}</td><td class="right">$${formatMoney(data.declaredClosing)}</td></tr>
            ${
              data.difference != null
                ? `<tr><td>${escapeHtml(differenceLabel(data.difference))}</td><td class="right">$${formatMoney(Math.abs(data.difference))}</td></tr>`
                : ""
            }
          </tbody>
        </table>
        ${
          data.footerNotes && data.footerNotes.length > 0
            ? `<div class="divider"></div>${data.footerNotes.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}`
            : ""
        }
        ${
          data.notes?.trim()
            ? `<div class="divider"></div><p>Notas:</p><p>${escapeHtml(data.notes.trim())}</p>`
            : ""
        }
      </main>
    </body>
  </html>`;
}
