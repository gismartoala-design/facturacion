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
