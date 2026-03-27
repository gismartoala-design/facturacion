type SaleInvoicePrintItem = {
  productCode: string;
  productName: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
  valorIva: number;
  total: number;
};

export type SaleInvoicePrintData = {
  saleNumber: string;
  documentTitle: string;
  documentType: "NONE" | "INVOICE";
  documentStatus: "NOT_REQUIRED" | "PENDING" | "ISSUED" | "ERROR" | "VOIDED";
  documentStatusLabel: string;
  documentNumber: string | null;
  fechaEmision: string;
  moneda: string;
  accountingRequired?: boolean | null;
  customerName: string;
  customerIdentification: string;
  customerAddress?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  items: SaleInvoicePrintItem[];
  paymentMethodLabels: string[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  companyName: string;
  companyLegalName?: string | null;
  companyRuc?: string | null;
  companyAddress?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  issuerName?: string | null;
  ambiente?: string | null;
  numeroAutorizacion?: string | null;
  fechaAutorizacion?: string | null;
  claveAcceso?: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function money(value: number): string {
  return value.toFixed(2);
}

function inferIvaRate(items: SaleInvoicePrintItem[]): number | null {
  const taxableBase = items.reduce(
    (acc, item) => acc + (item.valorIva > 0 ? item.subtotal : 0),
    0,
  );
  const tax = items.reduce((acc, item) => acc + item.valorIva, 0);

  if (taxableBase <= 0 || tax <= 0) {
    return null;
  }

  return Math.round((tax / taxableBase) * 10000) / 100;
}

function ambienteLabel(ambiente?: string | null) {
  return ambiente === "PRODUCCION" ? "PRODUCCION" : "PRUEBAS";
}

export function buildSaleInvoiceHtml(
  data: SaleInvoicePrintData,
  autoPrint = false,
): string {
  const subtotalTaxed = data.items.reduce(
    (acc, item) => acc + (item.valorIva > 0 ? item.subtotal : 0),
    0,
  );
  const subtotalZero = data.items.reduce(
    (acc, item) => acc + (item.valorIva <= 0 ? item.subtotal : 0),
    0,
  );
  const ivaRate = inferIvaRate(data.items);
  const rows = data.items
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.productCode)}</td>
        <td>${item.cantidad.toFixed(3)}</td>
        <td style="text-align:left;">${escapeHtml(item.productName)}</td>
        <td>${money(item.precioUnitario)}</td>
        <td>${money(item.descuento)}</td>
        <td>${money(item.subtotal)}</td>
      </tr>
    `,
    )
    .join("");
  const additionalRows = [
    { label: "Estado", value: data.documentStatusLabel },
    { label: "Moneda", value: data.moneda },
    {
      label: "Formas de pago",
      value: data.paymentMethodLabels.length
        ? data.paymentMethodLabels.join(", ")
        : "No registradas",
    },
    ...(data.customerEmail
      ? [{ label: "Email cliente", value: data.customerEmail }]
      : []),
    ...(data.customerPhone
      ? [{ label: "Telefono cliente", value: data.customerPhone }]
      : []),
  ]
    .map(
      (row) =>
        `<tr><td><strong>${escapeHtml(row.label)}:</strong> ${escapeHtml(row.value)}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(data.documentTitle)} ${escapeHtml(data.documentNumber ?? data.saleNumber)}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 10px;
      margin: 20px;
      color: #111827;
      background: #fff;
    }
    .header-table, .details-table, .info-table, .totals-table {
      width: 100%;
      border-collapse: collapse;
    }
    .header-table td {
      vertical-align: top;
    }
    .box {
      border: 1px solid #111827;
      border-radius: 6px;
      padding: 10px;
    }
    .details-table {
      margin-top: 20px;
    }
    .details-table th, .details-table td,
    .info-table th, .info-table td,
    .totals-table th, .totals-table td {
      border: 1px solid #111827;
      padding: 5px 6px;
      text-align: center;
    }
    .details-table th,
    .info-table th,
    .totals-table th {
      background-color: #f3efe8;
    }
    .totals-wrap {
      display: flex;
      justify-content: flex-end;
      margin-top: 20px;
    }
    .totals-table {
      width: 320px;
    }
    .totals-table th, .totals-table td {
      text-align: right;
    }
    .print-actions {
      margin-bottom: 14px;
      text-align: right;
    }
    .print-actions button {
      border: 1px solid #111827;
      background: #fff;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 11px;
      cursor: pointer;
    }
    .status-pill {
      display: inline-block;
      border-radius: 999px;
      padding: 4px 8px;
      font-size: 10px;
      font-weight: 700;
      background: #efe7d6;
    }
    @media print {
      body { margin: 8mm; }
      .print-actions { display: none; }
    }
  </style>
</head>
<body>
  <div class="print-actions">
    <button onclick="window.print()">Imprimir / Guardar PDF</button>
  </div>

  <table class="header-table">
    <tr>
      <td style="width: 48%; padding-right: 12px;">
        <div class="box" style="min-height: 185px;">
          <h2 style="margin: 0 0 8px; font-size: 16px;">${escapeHtml(data.companyLegalName || data.companyName)}</h2>
          ${data.companyName && data.companyLegalName && data.companyName !== data.companyLegalName ? `<p style="margin: 4px 0;"><strong>Nombre comercial:</strong> ${escapeHtml(data.companyName)}</p>` : ""}
          ${data.companyRuc ? `<p style="margin: 4px 0;"><strong>RUC:</strong> ${escapeHtml(data.companyRuc)}</p>` : ""}
          ${data.companyAddress ? `<p style="margin: 4px 0;"><strong>Direccion:</strong> ${escapeHtml(data.companyAddress)}</p>` : ""}
          ${data.companyPhone ? `<p style="margin: 4px 0;"><strong>Telefono:</strong> ${escapeHtml(data.companyPhone)}</p>` : ""}
          ${data.companyEmail ? `<p style="margin: 4px 0;"><strong>Email:</strong> ${escapeHtml(data.companyEmail)}</p>` : ""}
          ${data.issuerName ? `<p style="margin: 4px 0;"><strong>Emisor:</strong> ${escapeHtml(data.issuerName)}</p>` : ""}
        </div>
      </td>
      <td style="width: 52%;">
        <div class="box" style="min-height: 185px;">
          <h2 style="margin: 0 0 8px; font-size: 16px;">${escapeHtml(data.documentTitle)}</h2>
          <p style="margin: 4px 0;"><strong>No.:</strong> ${escapeHtml(data.documentNumber ?? `VENTA-${data.saleNumber}`)}</p>
          <p style="margin: 4px 0;"><strong>Fecha emision:</strong> ${escapeHtml(data.fechaEmision)}</p>
          <p style="margin: 4px 0;"><strong>Ambiente:</strong> ${escapeHtml(ambienteLabel(data.ambiente))}</p>
          <p style="margin: 8px 0 0;"><span class="status-pill">${escapeHtml(data.documentStatusLabel)}</span></p>
          ${data.numeroAutorizacion ? `<p style="margin: 10px 0 4px;"><strong>Autorizacion:</strong></p><p style="margin: 0; word-break: break-all;">${escapeHtml(data.numeroAutorizacion)}</p>` : ""}
          ${data.claveAcceso ? `<p style="margin: 10px 0 4px;"><strong>Clave de acceso:</strong></p><p style="margin: 0; word-break: break-all;">${escapeHtml(data.claveAcceso)}</p>` : ""}
          ${data.fechaAutorizacion ? `<p style="margin: 10px 0 0;"><strong>Fecha autorizacion:</strong> ${escapeHtml(data.fechaAutorizacion)}</p>` : ""}
        </div>
      </td>
    </tr>
  </table>

  <div class="box" style="margin-top: 18px;">
    <p style="margin: 5px 0;"><strong>Cliente:</strong> ${escapeHtml(data.customerName)}</p>
    <p style="margin: 5px 0;"><strong>Identificacion:</strong> ${escapeHtml(data.customerIdentification)}</p>
    ${data.customerAddress ? `<p style="margin: 5px 0;"><strong>Direccion:</strong> ${escapeHtml(data.customerAddress)}</p>` : ""}
  </div>

  <table class="details-table">
    <thead>
      <tr>
        <th>Cod. Principal</th>
        <th>Cant</th>
        <th>Descripcion</th>
        <th>Precio Unitario</th>
        <th>Descuento</th>
        <th>Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="6">Sin detalle</td></tr>`}
    </tbody>
  </table>

  <div class="totals-wrap">
    <table class="totals-table">
      <tbody>
        ${subtotalTaxed > 0 ? `<tr><th>SUBTOTAL ${ivaRate ? `${ivaRate}%` : "IMP."}</th><td>${money(subtotalTaxed)}</td></tr>` : ""}
        ${subtotalZero > 0 ? `<tr><th>SUBTOTAL 0%</th><td>${money(subtotalZero)}</td></tr>` : ""}
        <tr><th>SUBTOTAL SIN IMPUESTOS</th><td>${money(data.subtotal)}</td></tr>
        <tr><th>TOTAL DESCUENTO</th><td>${money(data.discountTotal)}</td></tr>
        ${data.taxTotal > 0 ? `<tr><th>IVA ${ivaRate ? `${ivaRate}%` : ""}</th><td>${money(data.taxTotal)}</td></tr>` : ""}
        <tr><th>VALOR TOTAL</th><td>${money(data.total)}</td></tr>
      </tbody>
    </table>
  </div>

  <table class="info-table" style="margin-top: 20px;">
    <thead>
      <tr>
        <th>Informacion adicional</th>
      </tr>
    </thead>
    <tbody>
      ${additionalRows}
    </tbody>
  </table>

  ${autoPrint ? `<script>window.addEventListener("load", () => window.print());</script>` : ""}
</body>
</html>`;
}
