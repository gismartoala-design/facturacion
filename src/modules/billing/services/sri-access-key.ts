export type SriAccessKeyInput = {
  fecha: string;
  tipoComprobante: string;
  ruc: string;
  ambiente: string;
  serie: string;
  numeroComprobante: string;
  codigoNumerico: string;
  tipoEmision: string;
};

function calculateModulo11(clave: string): number {
  let suma = 0;
  let factor = 2;

  for (let index = clave.length - 1; index >= 0; index -= 1) {
    suma += Number(clave.charAt(index)) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }

  const modulo = suma % 11;
  const resultado = 11 - modulo;

  if (resultado === 11) return 0;
  if (resultado === 10) return 1;

  return resultado;
}

function formatIssueDate(fecha: string) {
  const [day = "", month = "", year = ""] = fecha.split("/");
  return `${day}${month}${year}`;
}

function normalizeDocumentNumber(value: string, length: number) {
  return value.replace(/\D/g, "").padStart(length, "0").slice(-length);
}

export function buildSriNumericCode(seed: string) {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 100000000;
  }

  return String(hash).padStart(8, "0");
}

export function generateAccessKey(data: SriAccessKeyInput): string {
  const claveBase =
    formatIssueDate(data.fecha) +
    data.tipoComprobante +
    data.ruc +
    data.ambiente +
    data.serie +
    normalizeDocumentNumber(data.numeroComprobante, 9) +
    normalizeDocumentNumber(data.codigoNumerico, 8) +
    data.tipoEmision;

  return `${claveBase}${calculateModulo11(claveBase)}`;
}
