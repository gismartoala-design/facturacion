type AccountGroupKey = "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
type AccountNature = "DEBIT" | "CREDIT";

export type ParsedAccountingImportRow = {
  lineNumber: number;
  code: string;
  name: string;
  groupKey: AccountGroupKey;
  defaultNature: AccountNature;
  parentCode: string | null;
  acceptsPostings: boolean;
  active: boolean;
  description: string | null;
};

export type ParsedAccountingImportResult = {
  delimiter: "," | ";" | "\t";
  rows: ParsedAccountingImportRow[];
  errors: Array<{
    lineNumber: number;
    message: string;
  }>;
};

export const ACCOUNTING_IMPORT_TEMPLATE = [
  "code,name,groupKey,defaultNature,parentCode,acceptsPostings,active,description",
  "110101,Caja general,ASSET,DEBIT,11,true,true,Cuenta de efectivo principal",
  "110102,Caja chica,ASSET,DEBIT,11,true,true,Fondo fijo operativo",
  "210301,Prestamo bancario corto plazo,LIABILITY,CREDIT,21,true,true,Obligacion financiera vigente",
  "410201,Ingresos por servicios,INCOME,CREDIT,4102,true,true,Facturacion de servicios",
  "510302,Publicidad y promocion,EXPENSE,DEBIT,5103,true,true,Gastos comerciales del periodo",
].join("\n");

const HEADER_ALIASES: Record<string, keyof Omit<ParsedAccountingImportRow, "lineNumber">> = {
  code: "code",
  codigo: "code",
  codigocuenta: "code",
  codcta: "code",
  name: "name",
  nombre: "name",
  nombrecuenta: "name",
  cuenta: "name",
  groupkey: "groupKey",
  grupo: "groupKey",
  nature: "defaultNature",
  naturaleza: "defaultNature",
  defaultnature: "defaultNature",
  parentcode: "parentCode",
  codigopadre: "parentCode",
  padre: "parentCode",
  acceptspostings: "acceptsPostings",
  postable: "acceptsPostings",
  aceptamovimientos: "acceptsPostings",
  active: "active",
  activo: "active",
  description: "description",
  descripcion: "description",
  detalle: "description",
};

const GROUP_ALIASES: Record<string, AccountGroupKey> = {
  asset: "ASSET",
  activo: "ASSET",
  liability: "LIABILITY",
  pasivo: "LIABILITY",
  equity: "EQUITY",
  patrimonio: "EQUITY",
  income: "INCOME",
  ingreso: "INCOME",
  ingresos: "INCOME",
  expense: "EXPENSE",
  gasto: "EXPENSE",
  gastos: "EXPENSE",
};

const NATURE_ALIASES: Record<string, AccountNature> = {
  debit: "DEBIT",
  debito: "DEBIT",
  debe: "DEBIT",
  credit: "CREDIT",
  credito: "CREDIT",
  haber: "CREDIT",
};

const TRUE_VALUES = new Set(["true", "1", "si", "sí", "yes", "y", "x"]);
const FALSE_VALUES = new Set(["false", "0", "no", "n"]);

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[\s_\-.]+/g, "")
    .toLowerCase();
}

function detectDelimiter(headerLine: string): "," | ";" | "\t" {
  const delimiters: Array<"," | ";" | "\t"> = [",", ";", "\t"];
  let bestDelimiter: "," | ";" | "\t" = ",";
  let bestScore = -1;

  for (const delimiter of delimiters) {
    const score = headerLine.split(delimiter).length;
    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
}

function parseDelimitedText(text: string, delimiter: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = "";
      continue;
    }

    currentValue += char;
  }

  currentRow.push(currentValue);
  rows.push(currentRow);

  return rows.filter((row) => row.some((cell) => cell.trim() !== ""));
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (!normalized) {
    return fallback;
  }

  if (TRUE_VALUES.has(normalized)) {
    return true;
  }

  if (FALSE_VALUES.has(normalized)) {
    return false;
  }

  throw new Error(`Valor booleano invalido: ${value}`);
}

function parseGroup(value: string | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";
  const resolved = GROUP_ALIASES[normalized] ?? GROUP_ALIASES[normalizeHeader(normalized)];

  if (!resolved) {
    throw new Error(`Grupo invalido: ${value}`);
  }

  return resolved;
}

function parseNature(value: string | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";
  const resolved =
    NATURE_ALIASES[normalized] ?? NATURE_ALIASES[normalizeHeader(normalized)];

  if (!resolved) {
    throw new Error(`Naturaleza invalida: ${value}`);
  }

  return resolved;
}

export function parseAccountingAccountsImport(
  text: string,
): ParsedAccountingImportResult {
  const normalizedText = text.replace(/^\uFEFF/, "").trim();
  if (!normalizedText) {
    return {
      delimiter: ",",
      rows: [],
      errors: [{ lineNumber: 1, message: "El archivo esta vacio" }],
    };
  }

  const firstLine = normalizedText.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = detectDelimiter(firstLine);
  const rawRows = parseDelimitedText(normalizedText, delimiter);
  const [headerRow, ...dataRows] = rawRows;

  if (!headerRow || headerRow.length === 0) {
    return {
      delimiter,
      rows: [],
      errors: [{ lineNumber: 1, message: "No se encontro la fila de encabezados" }],
    };
  }

  const headerMap = new Map<number, keyof Omit<ParsedAccountingImportRow, "lineNumber">>();
  for (const [index, header] of headerRow.entries()) {
    const resolved = HEADER_ALIASES[normalizeHeader(header)];
    if (resolved) {
      headerMap.set(index, resolved);
    }
  }

  const requiredHeaders: Array<keyof Omit<ParsedAccountingImportRow, "lineNumber">> = [
    "code",
    "name",
    "groupKey",
    "defaultNature",
  ];

  const missingHeaders = requiredHeaders.filter(
    (field) => ![...headerMap.values()].includes(field),
  );

  if (missingHeaders.length > 0) {
    return {
      delimiter,
      rows: [],
      errors: [
        {
          lineNumber: 1,
          message: `Faltan columnas requeridas: ${missingHeaders.join(", ")}`,
        },
      ],
    };
  }

  const rows: ParsedAccountingImportRow[] = [];
  const errors: ParsedAccountingImportResult["errors"] = [];

  for (const [rowIndex, rawRow] of dataRows.entries()) {
    const lineNumber = rowIndex + 2;
    const record: Partial<Record<keyof Omit<ParsedAccountingImportRow, "lineNumber">, string>> =
      {};

    for (const [cellIndex, value] of rawRow.entries()) {
      const field = headerMap.get(cellIndex);
      if (!field) continue;
      record[field] = value?.trim() ?? "";
    }

    try {
      if (!record.code?.trim()) {
        throw new Error("Codigo requerido");
      }

      if (!record.name?.trim()) {
        throw new Error("Nombre requerido");
      }

      rows.push({
        lineNumber,
        code: record.code.trim(),
        name: record.name.trim(),
        groupKey: parseGroup(record.groupKey),
        defaultNature: parseNature(record.defaultNature),
        parentCode: record.parentCode?.trim() ? record.parentCode.trim() : null,
        acceptsPostings: parseBoolean(record.acceptsPostings, true),
        active: parseBoolean(record.active, true),
        description: record.description?.trim() ? record.description.trim() : null,
      });
    } catch (error) {
      errors.push({
        lineNumber,
        message:
          error instanceof Error ? error.message : "No se pudo interpretar la fila",
      });
    }
  }

  return {
    delimiter,
    rows,
    errors,
  };
}
