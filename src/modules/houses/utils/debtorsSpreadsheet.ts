import * as XLSX from "xlsx";

const HEADER_ALIASES = {
  apartmentLabel: ["Квартира"],
  accountNumber: ["Особовий рахунок", "Лицевой счет"],
  ownerName: ["Власник", "Владелец"],
  area: ["Площа", "Квадраты"],
  amount: ["Сума боргу", "Сумма долга"],
  days: ["Термін боргу", "Срок долга"],
} as const;

export const DEBTORS_IMPORT_HEADERS = [
  "Квартира",
  "Особовий рахунок",
  "Власник",
  "Площа",
  "Сума боргу",
  "Термін боргу",
] as const;

export type DebtorsSpreadsheetRow = {
  apartmentLabel: string;
  accountNumber: string;
  ownerName: string;
  area: string;
  amount: string;
  days: string;
};

type DebtorsExportItem = {
  apartmentLabel: string;
  accountNumber: string;
  ownerName: string;
  area: number | null;
  amount: string;
  days: string;
};

type ParseDebtorsImportParams = {
  file: File;
  referenceRows: DebtorsSpreadsheetRow[];
};

type ParseDebtorsImportResult = {
  rows: DebtorsSpreadsheetRow[];
  totalRows: number;
};

function saveWorkbook(workbook: XLSX.WorkBook, fileName: string) {
  XLSX.writeFile(workbook, fileName);
}

function normalizeCellValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function normalizeAreaForCompare(value: string) {
  return value.replace(",", ".").trim();
}

function formatAreaForSheet(value: number | null) {
  if (value === null || value === undefined) {
    return "";
  }

  return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
}

function isAreaValid(value: string) {
  if (!value) return true;
  return /^-?\d+(?:[.,]\d+)?$/.test(value);
}

function isAmountValid(value: string) {
  if (!value) return true;
  return /^\d+(?:[.,]\d+)?$/.test(value);
}

function isDaysValid(value: string) {
  if (!value) return true;
  return /^\d+$/.test(value);
}

function buildReferenceKey(row: {
  apartmentLabel: string;
  accountNumber: string;
  ownerName: string;
  area: string;
}) {
  return [
    row.apartmentLabel.trim().toLowerCase(),
    row.accountNumber.trim().toLowerCase(),
    row.ownerName.trim().toLowerCase(),
    normalizeAreaForCompare(row.area).toLowerCase(),
  ].join("||");
}

function findHeaderIndex(
  headerRow: string[],
  aliases: readonly string[],
) {
  return aliases.find((alias) => headerRow.includes(alias)) ?? null;
}

export function exportDebtorsRegistry(params: {
  houseName: string;
  rows: DebtorsExportItem[];
}) {
  const { houseName, rows } = params;

  const sheetRows = rows.map((row) => ({
    "Квартира": row.apartmentLabel,
    "Особовий рахунок": row.accountNumber,
    "Власник": row.ownerName,
    "Площа": formatAreaForSheet(row.area),
    "Сума боргу": row.amount,
    "Термін боргу": row.days,
  }));

  const worksheet = XLSX.utils.json_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Боржники");

  const safeHouseName = houseName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9а-яА-ЯіїєґІЇЄҐ_-]/g, "");

  saveWorkbook(
    workbook,
    `debtors-registry-${safeHouseName || "house"}.xlsx`,
  );
}

export async function parseDebtorsImportFile({
  file,
  referenceRows,
}: ParseDebtorsImportParams): Promise<ParseDebtorsImportResult> {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (!["csv", "xls", "xlsx"].includes(extension)) {
    throw new Error("Підтримуються лише файли CSV, XLS та XLSX.");
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: "array",
    raw: false,
  });

  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("Файл не містить аркушів для імпорту.");
  }

  const worksheet = workbook.Sheets[firstSheetName];

  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, {
    header: 1,
    blankrows: false,
    defval: "",
  });

  if (!rows.length) {
    throw new Error("Файл порожній.");
  }

  const headerRow = (rows[0] ?? []).map((cell) => normalizeCellValue(cell));

  const requiredFields = Object.entries(HEADER_ALIASES);

  const missingHeaders = requiredFields
    .filter(([, aliases]) => !aliases.some((alias) => headerRow.includes(alias)))
    .map(([key]) => DEBTORS_IMPORT_HEADERS[
      ["apartmentLabel", "accountNumber", "ownerName", "area", "amount", "days"].indexOf(key)
    ]);

  if (missingHeaders.length > 0) {
    throw new Error(
      `У файлі відсутні обов’язкові колонки: ${missingHeaders.join(", ")}.`,
    );
  }

  const headerIndexes = {
    apartmentLabel: headerRow.indexOf(findHeaderIndex(headerRow, HEADER_ALIASES.apartmentLabel)!),
    accountNumber: headerRow.indexOf(findHeaderIndex(headerRow, HEADER_ALIASES.accountNumber)!),
    ownerName: headerRow.indexOf(findHeaderIndex(headerRow, HEADER_ALIASES.ownerName)!),
    area: headerRow.indexOf(findHeaderIndex(headerRow, HEADER_ALIASES.area)!),
    amount: headerRow.indexOf(findHeaderIndex(headerRow, HEADER_ALIASES.amount)!),
    days: headerRow.indexOf(findHeaderIndex(headerRow, HEADER_ALIASES.days)!),
  };

  const parsedRows: DebtorsSpreadsheetRow[] = [];

  for (let index = 1; index < rows.length; index += 1) {
    const sourceRow = rows[index] ?? [];

    const row: DebtorsSpreadsheetRow = {
      apartmentLabel: normalizeCellValue(sourceRow[headerIndexes.apartmentLabel]),
      accountNumber: normalizeCellValue(sourceRow[headerIndexes.accountNumber]),
      ownerName: normalizeCellValue(sourceRow[headerIndexes.ownerName]),
      area: normalizeCellValue(sourceRow[headerIndexes.area]),
      amount: normalizeCellValue(sourceRow[headerIndexes.amount]),
      days: normalizeCellValue(sourceRow[headerIndexes.days]),
    };

    const isCompletelyEmpty =
      !row.apartmentLabel &&
      !row.accountNumber &&
      !row.ownerName &&
      !row.area &&
      !row.amount &&
      !row.days;

    if (isCompletelyEmpty) continue;

    const rowNumber = index + 1;

    if (!row.accountNumber) {
      throw new Error(`Рядок ${rowNumber}: поле «Особовий рахунок» є обов’язковим.`);
    }

    if (!row.apartmentLabel) {
      throw new Error(`Рядок ${rowNumber}: поле «Квартира» є обов’язковим.`);
    }

    if (!row.ownerName) {
      throw new Error(`Рядок ${rowNumber}: поле «Власник» є обов’язковим.`);
    }

    if (!isAreaValid(row.area)) {
      throw new Error(`Рядок ${rowNumber}: поле «Площа» має бути числом.`);
    }

    if (!isAmountValid(row.amount)) {
      throw new Error(`Рядок ${rowNumber}: поле «Сума боргу» має бути числом.`);
    }

    if (!isDaysValid(row.days)) {
      throw new Error(`Рядок ${rowNumber}: поле «Термін боргу» має бути цілим числом або порожнім.`);
    }

    parsedRows.push(row);
  }

  if (parsedRows.length === 0) {
    throw new Error("Файл не містить валідних рядків для імпорту.");
  }

  if (parsedRows.length !== referenceRows.length) {
    throw new Error(
      "Імпорт відхилено: кількість рядків не збігається з поточним списком квартир.",
    );
  }

  const referenceMap = new Map(
    referenceRows.map((row) => [buildReferenceKey(row), row]),
  );

  for (let index = 0; index < parsedRows.length; index += 1) {
    const row = parsedRows[index];
    const key = buildReferenceKey(row);

    if (!referenceMap.has(key)) {
      throw new Error(
        `Рядок ${index + 2}: readonly-дані квартири не збігаються з поточним реєстром. Імпорт відхилено.`,
      );
    }
  }

  return {
    rows: parsedRows,
    totalRows: parsedRows.length,
  };
}
