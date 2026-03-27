export type PosTicketLine = {
  quantity: number;
  name: string;
  unitPrice: number;
  total: number;
};

export type PosTicketData = {
  businessName: string;
  businessLegalName?: string | null;
  businessRuc?: string | null;
  businessAddress?: string | null;
  businessPhone?: string | null;
  businessEmail?: string | null;
  accountingRequired?: boolean;
  environment?: string | null;
  operatorName: string;
  saleNumber: string;
  documentType: "INVOICE" | "NONE";
  documentNumber: string | null;
  createdAt: string;
  customerName: string;
  customerIdentification?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  paymentMethodLabel: string;
  documentLabel: string;
  authorizationNumber?: string | null;
  accessKey?: string | null;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  lines: PosTicketLine[];
};

type PosTicketHtmlOptions = {
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
  return values.length > 0 ? values.join(" / ") : "-";
}

export function buildPosTicketHtml(
  data: PosTicketData,
  options: PosTicketHtmlOptions = {},
) {
  const autoPrint = options.autoPrint ?? true;
  const autoClose = options.autoClose ?? autoPrint;
  const lines = data.lines.map((line) => `
      <tr>
        <td>
          <div class="item-name">${escapeHtml(line.name)}</div>
          <div class="item-meta">${line.quantity.toFixed(2)} x $${formatMoney(line.unitPrice)}</div>
        </td>
        <td class="right">$${formatMoney(line.total)}</td>
      </tr>
    `).join("");

  return `<!DOCTYPE html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(data.documentLabel)} ${escapeHtml(data.saleNumber)}</title>
      <style>
        :root {
          color-scheme: light;
        }
        @page {
          size: 78mm auto;
          margin: 0;
        }
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
        .muted { color: #4b5563; }
        .divider {
          border-top: 1px dashed #9ca3af;
          margin: 6px 0;
        }
        h1 {
          margin: 0 0 3px;
          font-size: 15px;
          letter-spacing: 0;
          text-transform: uppercase;
          font-weight: 400;
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
        .item-name {
          font-weight: 400;
        }
        .item-meta {
          color: #6b7280;
          font-size: 12px;
        }
        .summary td {
          padding: 2px 0;
        }
        .print-actions {
          display: flex;
          justify-content: center;
          margin-bottom: 12px;
        }
        .print-actions button {
          border: 1px solid #d1d5db;
          background: #ffffff;
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
            : `<div class="print-actions"><button onclick="window.print()">Imprimir comprobante</button></div>`
        }
        <div class="center">
          <h1>${escapeHtml(data.businessLegalName || data.businessName)}</h1>
          ${
            data.businessLegalName &&
            data.businessName &&
            data.businessLegalName !== data.businessName
              ? `<p class="muted">${escapeHtml(data.businessName)}</p>`
              : ""
          }
          <p class="muted">${escapeHtml(data.documentLabel)}</p>
          <p>RUC: ${escapeHtml(ticketFieldValue(data.businessRuc))}</p>
          <p>Direccion: ${escapeHtml(ticketFieldValue(data.businessAddress))}</p>
          <p>Contacto: ${escapeHtml(ticketBusinessContact(data))}</p>
          <p>Obligado a llevar contabilidad: ${escapeHtml(accountingRequiredLabel(data.accountingRequired))}</p>
          ${
            data.documentNumber
              ? `<p>${data.documentType === "INVOICE" ? "FAC" : "COMP"} #: ${escapeHtml(data.documentNumber)}</p>`
              : ""
          }
          ${
            data.documentType === "INVOICE"
              ? `<p>Ambiente: ${escapeHtml(environmentLabel(data.environment))}</p><p>Emision: NORMAL</p>`
              : `<p>Venta #${escapeHtml(data.saleNumber)}</p>`
          }
          ${
            data.documentType === "INVOICE"
              ? `<p>No. de autorizacion: ${escapeHtml(ticketFieldValue(data.authorizationNumber))}</p><p>Clave de acceso: ${escapeHtml(ticketFieldValue(data.accessKey))}</p>`
              : ""
          }
        </div>
        <div class="divider"></div>
        <p>Cajero: ${escapeHtml(data.operatorName)}</p>
        <p>Fecha: ${escapeHtml(data.createdAt)}</p>
        <p>Cliente: ${escapeHtml(data.customerName)}</p>
        <p>Cedula/RUC: ${escapeHtml(ticketFieldValue(data.customerIdentification))}</p>
        <p>Email: ${escapeHtml(ticketFieldValue(data.customerEmail))}</p>
        <p>Telefono: ${escapeHtml(ticketFieldValue(data.customerPhone))}</p>
        <p>Direccion: ${escapeHtml(ticketFieldValue(data.customerAddress))}</p>
        <div class="divider"></div>
        <table>
          <tbody>
            ${lines}
          </tbody>
        </table>
        <div class="divider"></div>
        <table class="summary">
          <tbody>
            <tr><td>Subtotal</td><td class="right">$${formatMoney(data.subtotal)}</td></tr>
            <tr><td>Dcto</td><td class="right">$${formatMoney(data.discountTotal)}</td></tr>
            <tr><td>IVA</td><td class="right">$${formatMoney(data.taxTotal)}</td></tr>
            <tr><td>Total</td><td class="right">$${formatMoney(data.total)}</td></tr>
          </tbody>
        </table>
        <div class="divider"></div>
        <p>Forma de pago: ${escapeHtml(data.paymentMethodLabel)}</p>
      </main>
    </body>
  </html>`;
}
