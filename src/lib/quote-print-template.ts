type QuotePrintItem = {
  productCode: string;
  productName: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  valorIva: number;
  total: number;
};

type QuotePrintData = {
  quoteNumber: string;
  fechaEmision: string;
  status: string;
  moneda: string;
  formaPago: string;
  customerName: string;
  customerIdentification: string;
  customerAddress?: string | null;
  items: QuotePrintItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  companyRazonSocial?: string;
  companyNombreComercial?: string;
  companyRuc?: string;
  companyDirMatriz?: string;
  companyObligadoContabilidad?: string;
  estab?: string;
  ptoEmi?: string;
  ambiente?: string;
  tipoEmision?: string;
  numeroAutorizacion?: string;
  fechaAutorizacion?: string;
  claveAcceso?: string;
  logoBase64?: string;
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

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  "01": "Sin utilizacion del sistema financiero",
  "15": "Compensacion de deudas",
  "16": "Tarjeta de debito",
  "19": "Tarjeta de credito",
  "20": "Otros con utilizacion del sistema financiero",
};

function paymentMethodLabel(code: string): string {
  return PAYMENT_METHOD_LABELS[code] ?? code;
}

function inferIvaRate(items: QuotePrintItem[]): number | null {
  const taxableBase = items.reduce((acc, item) => acc + (item.valorIva > 0 ? item.total - item.valorIva : 0), 0);
  const tax = items.reduce((acc, item) => acc + item.valorIva, 0);
  if (taxableBase <= 0 || tax <= 0) return null;
  const rate = (tax / taxableBase) * 100;
  return Math.round(rate * 100) / 100;
}

export function buildQuotePrintHtml(data: QuotePrintData, autoPrint = false): string {
  const subtotalTaxed = roundMoney(data.items.reduce((acc, item) => acc + (item.valorIva > 0 ? item.total - item.valorIva : 0), 0));
  const subtotalZero = roundMoney(data.items.reduce((acc, item) => acc + (item.valorIva <= 0 ? item.total : 0), 0));
  const totalDiscount = roundMoney(data.items.reduce((acc, item) => acc + item.descuento, 0));
  const totalSinImpuestos = roundMoney(subtotalTaxed + subtotalZero);
  const ivaRate = inferIvaRate(data.items);
  const secuencial = data.quoteNumber.padStart(9, "0").slice(-9);
  const ambienteLabel = data.ambiente === "2" ? "PRODUCCION" : "PRUEBAS";

  const rows = data.items
    .map((item) => `
      <tr>
        <td>${escapeHtml(item.productCode)}</td>
        <td>${item.cantidad.toFixed(3)}</td>
        <td style="text-align:left;">${escapeHtml(item.productName)}</td>
        <td>${money(item.precioUnitario)}</td>
        <td>${money(item.descuento)}</td>
        <td>${money(item.total - item.valorIva)}</td>
      </tr>
    `)
    .join("");

  const additionalRows = [
    { label: "Moneda", value: data.moneda },
    { label: "Forma de Pago", value: paymentMethodLabel(data.formaPago) }
  ]
    .map((row) => `<tr><td><strong>${escapeHtml(row.label)}:</strong> ${escapeHtml(row.value)}</td></tr>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Cotizacion</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 10px;
      margin: 20px;
      color: #111827;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .header-table td {
      vertical-align: top;
    }
    .box {
      border: 1px solid #000;
      border-radius: 5px;
      padding: 10px;
      margin-left: 10px;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    .details-table th, .details-table td {
      border: 1px solid #000;
      padding: 5px;
      text-align: center;
    }
    .details-table th {
      background-color: #f0f0f0;
    }
    .totals-table {
      width: 40%;
      float: right;
      border-collapse: collapse;
      margin-top: 20px;
    }
    .totals-table th, .totals-table td {
      border: 1px solid #000;
      padding: 5px;
      text-align: right;
    }
    .totals-table th {
      background-color: #f0f0f0;
    }
    .clear {
      clear: both;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    .info-table th, .info-table td {
      border: 1px solid #000;
      padding: 5px;
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
      <td style="width: 20%; padding-right: 20px;">
        ${data.logoBase64 ? `<img src="${data.logoBase64}" alt="Logo" style="max-width: 150px; max-height: 100px;">` : ""}
      </td>
      <td style="width: 30%;">
        <div class="box" style="margin-left: 0; min-height: 200px;">
          <h2 style="margin: 0; font-size: 16px;">${escapeHtml(data.companyRazonSocial || "ARGSOFT")}</h2>
          ${data.companyNombreComercial ? `<p style="margin: 5px 0;"><strong>Nombre Comercial:</strong> ${escapeHtml(data.companyNombreComercial)}</p>` : ""}
          <p style="margin: 5px 0;"><strong>OBLIGADO A LLEVAR CONTABILIDAD:</strong> ${escapeHtml(data.companyObligadoContabilidad || "NO")}</p>
          <p style="margin: 5px 0;"><strong>DOCUMENTO:</strong> COTIZACION / PROFORMA</p>
        </div>
      </td>
      <td style="width: 50%;">
        <div class="box" style="min-height: 200px;">
          <h2 style="margin: 0; font-size: 16px;">R.U.C.: ${escapeHtml(data.companyRuc || "-")}</h2>
          <h2 style="margin: 10px 0;">C O T I Z A C I O N</h2>
          <p><strong>No.</strong> ${escapeHtml(data.estab || "001")}-${escapeHtml(data.ptoEmi || "001")}-${escapeHtml(secuencial)}</p>
          <p><strong>NÚMERO DE AUTORIZACIÓN:</strong></p>
          <p style="font-size: 11px;">${escapeHtml(data.numeroAutorizacion || "NO APLICA PARA COTIZACION")}</p>
          <p><strong>FECHA Y HORA:</strong> ${escapeHtml(data.fechaAutorizacion || data.fechaEmision)}</p>
          <p><strong>AMBIENTE:</strong> ${escapeHtml(ambienteLabel)}</p>
          <p><strong>EMISIÓN:</strong> ${escapeHtml(data.tipoEmision === "1" ? "NORMAL" : "NORMAL")}</p>
        </div>
      </td>
    </tr>
  </table>

  <div class="box" style="margin-left: 0; margin-bottom: 20px;">
    <p style="margin: 5px 0;"><strong>Razón Social / Nombres y Apellidos:</strong> ${escapeHtml(data.customerName)}</p>
    <p style="margin: 5px 0;"><strong>Identificación:</strong> ${escapeHtml(data.customerIdentification)}</p>
    <p style="margin: 5px 0;"><strong>Fecha Emisión:</strong> ${escapeHtml(data.fechaEmision)}</p>
  </div>

  <table class="details-table">
    <thead>
      <tr>
        <th>Cod. Principal</th>
        <th>Cant</th>
        <th>Descripción</th>
        <th>Precio Unitario</th>
        <th>Descuento</th>
        <th>Precio Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="6">Sin detalle</td></tr>`}
    </tbody>
  </table>

  <table class="totals-table">
    <tbody>
      ${subtotalTaxed > 0 ? `<tr><th>SUBTOTAL ${ivaRate ? `${ivaRate}%` : "IMP."}</th><td>${money(subtotalTaxed)}</td></tr>` : ""}
      ${subtotalZero > 0 ? `<tr><th>SUBTOTAL 0%</th><td>${money(subtotalZero)}</td></tr>` : ""}
      <tr><th>SUBTOTAL SIN IMPUESTOS</th><td>${money(totalSinImpuestos)}</td></tr>
      <tr><th>TOTAL DESCUENTO</th><td>${money(totalDiscount)}</td></tr>
      ${data.taxTotal > 0 ? `<tr><th>IVA ${ivaRate ? `${ivaRate}%` : ""}</th><td>${money(data.taxTotal)}</td></tr>` : ""}
      <tr><th>VALOR TOTAL</th><td>${money(data.total)}</td></tr>
    </tbody>
  </table>
  
  <div style="width: 50%; float: left; margin-top: 20px;">
    <table class="info-table">
      <thead>
        <tr>
          <th>Información Adicional</th>
        </tr>
      </thead>
      <tbody>
        ${additionalRows}
      </tbody>
    </table>
  </div>
  
  <div class="clear"></div>

  ${autoPrint ? `<script>window.addEventListener("load", () => window.print());</script>` : ""}
</body>
</html>`;
}

export type { QuotePrintData };
