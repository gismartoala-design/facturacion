import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toSequencePrefix(blockIndex: number) {
  let value = blockIndex + 1;
  let result = "";

  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }

  return result;
}

export function formatProductCode(secuencial: bigint | number | string) {
  const numeric = typeof secuencial === "bigint" ? Number(secuencial) : Number(secuencial);
  const safeNumeric = Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : 1;
  const blockSize = 99999;
  const blockIndex = Math.floor((safeNumeric - 1) / blockSize);
  const sequenceWithinBlock = ((safeNumeric - 1) % blockSize) + 1;
  return `${toSequencePrefix(blockIndex)}${sequenceWithinBlock.toString().padStart(5, "0")}`;
}

export function normalizeProductSku(value?: string | null) {
  const normalized = value?.trim().toUpperCase() ?? "";
  return normalized || null;
}

export function resolveProductCode(sku: string | null | undefined, secuencial: bigint | number | string) {
  return normalizeProductSku(sku) ?? formatProductCode(secuencial);
}

function normalizeLookupValue(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function isScaleBarcodeCandidate(value: string) {
  return value.startsWith("2") && /^\d{7,14}$/.test(value);
}

function extractScaleBarcodeFamilyPrefix(value: string) {
  const normalized = normalizeLookupValue(value);
  if (!normalized.startsWith("2") || !/^\d{7,14}$/.test(normalized)) {
    return null;
  }

  return normalized.slice(0, 7);
}

export function matchesScaleBarcodePrefix(
  query: string,
  barcodeValue: string | null | undefined,
) {
  const normalizedQuery = normalizeLookupValue(query);
  const normalizedBarcode = normalizeLookupValue(barcodeValue);

  if (!normalizedQuery || !normalizedBarcode) {
    return false;
  }

  if (!isScaleBarcodeCandidate(normalizedQuery) || !/^\d+$/.test(normalizedBarcode)) {
    return false;
  }

  if (
    normalizedBarcode.length >= 4 &&
    normalizedBarcode.length < normalizedQuery.length &&
    normalizedQuery.startsWith(normalizedBarcode)
  ) {
    return true;
  }

  const queryFamilyPrefix = extractScaleBarcodeFamilyPrefix(normalizedQuery);
  const barcodeFamilyPrefix = extractScaleBarcodeFamilyPrefix(normalizedBarcode);

  return Boolean(
    queryFamilyPrefix &&
      barcodeFamilyPrefix &&
      queryFamilyPrefix === barcodeFamilyPrefix,
  );
}

export function extractScaleBarcodeWeight(
  query: string,
  barcodeValue: string | null | undefined,
  options?: {
    familyPrefixLength?: number;
    embeddedDigits?: number;
    decimals?: number;
  },
) {
  console.log("extractScaleBarcodeWeight", { query, barcodeValue, options });
  if (!matchesScaleBarcodePrefix(query, barcodeValue)) {
    return null;
  }

  const normalizedQuery = normalizeLookupValue(query);
  const familyPrefixLength = options?.familyPrefixLength ?? 7;
  const embeddedDigits = options?.embeddedDigits ?? 5;
  const decimals = options?.decimals ?? 2;

  if (!isScaleBarcodeCandidate(normalizedQuery)) {
    return null;
  }

  const payloadStart = familyPrefixLength;
  const payloadEnd = Math.max(normalizedQuery.length - 1, payloadStart);
  const payload = normalizedQuery.slice(payloadStart, payloadEnd);
  const valueDigits = payload.slice(0, embeddedDigits);

  if (!/^\d+$/.test(valueDigits) || valueDigits.length !== embeddedDigits) {
    return null;
  }

  const weight = Number(valueDigits) / 10 ** decimals;
  return Number.isFinite(weight) && weight > 0 ? weight : null;
}

function getScaleBarcodeCandidates<T extends {
  codigoBarras?: string | null;
  codigo?: string | null;
  sku?: string | null;
}>(item: T) {
  return [item.codigoBarras, item.codigo, item.sku]
    .map((value) => normalizeLookupValue(value))
    .filter((value, index, values) => value && values.indexOf(value) === index);
}

export function resolveScaleBarcodeReference<T extends {
  codigoBarras?: string | null;
  codigo?: string | null;
  sku?: string | null;
}>(item: T, query: string) {
  return (
    getScaleBarcodeCandidates(item).find((candidate) =>
      matchesScaleBarcodePrefix(query, candidate),
    ) ?? null
  );
}

export function findBestScaleBarcodeMatch<T extends {
  codigoBarras?: string | null;
  codigo?: string | null;
  sku?: string | null;
}>(
  items: readonly T[],
  query: string,
) {
  let bestMatch: T | null = null;
  let bestPrefixLength = -1;

  for (const item of items) {
    const barcodeValue = resolveScaleBarcodeReference(item, query);
    if (!barcodeValue) {
      continue;
    }

    const matchWeight = barcodeValue.length >= 13 ? 7 : barcodeValue.length;
    if (matchWeight > bestPrefixLength) {
      bestMatch = item;
      bestPrefixLength = matchWeight;
    }
  }

  return bestMatch;
}
