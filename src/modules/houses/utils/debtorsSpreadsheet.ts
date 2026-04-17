import * as XLSX from "xlsx";

export const DEBTORS_IMPORT_HEADERS = [
  "Квартира",
  "Лицевой счет",
  "Владелец",
  "Квадраты",
  "Сумма долга",
  "Срок долга",
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
  if (!value) {
    return true;
  }

  return /^-?\d+(?:[.,]\d+)?$/.test(value);
}

function isAmountValid(value: string) {
  if (!value) {
    return true;
  }

  return /^\d+(?:[.,]\d+)?$/.test(value);
}

function isDaysValid(value: string) {
  if (!value) {
    return true;
  }

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

export function exportDebtorsRegistry(params: {
  houseName: string;
  rows: DebtorsExportItem[];
}) {
  const { houseName, rows } = params;

  const sheetRows = rows.map((row) => ({
    "Квартира": row.apartmentLabel,
    "Лицевой счет": row.accountNumber,
    "Владелец": row.ownerName,
    "Квадраты": formatAreaForSheet(row.area),
    "Сумма долга": row.amount,
    "Срок долга": row.days,
  }));

  const worksheet = XLSX.utils.json_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Должники");

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
    throw new Error("Поддерживаются только файлы CSV, XLS и XLSX.");
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: "array",
    raw: false,
  });

  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("Файл не содержит листов для импорта.");
  }

  const worksheet = workbook.Sheets[firstSheetName];

  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, {
    header: 1,
    blankrows: false,
    defval: "",
  });

  if (!rows.length) {
    throw new Error("Файл пустой.");
  }

  const headerRow = (rows[0] ?? []).map((cell) => normalizeCellValue(cell));

  const missingHeaders = DEBTORS_IMPORT_HEADERS.filter(
    (header) => !headerRow.includes(header),
  );

  if (missingHeaders.length > 0) {
    throw new Error(
      `В файле отсутствуют обязательные колонки: ${missingHeaders.join(", ")}.`,
    );
  }

  const headerIndexes = {
    apartmentLabel: headerRow.indexOf("Квартира"),
    accountNumber: headerRow.indexOf("Лицевой счет"),
    ownerName: headerRow.indexOf("Владелец"),
    area: headerRow.indexOf("Квадраты"),
    amount: headerRow.indexOf("Сумма долга"),
    days: headerRow.indexOf("Срок долга"),
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

    if (isCompletelyEmpty) {
      continue;
    }

    const rowNumber = index + 1;

    if (!row.accountNumber) {
      throw new Error(`Строка ${rowNumber}: поле «Лицевой счет» обязательно.`);
    }

    if (!row.apartmentLabel) {
      throw new Error(`Строка ${rowNumber}: поле «Квартира» обязательно.`);
    }

    if (!row.ownerName) {
      throw new Error(`Строка ${rowNumber}: поле «Владелец» обязательно.`);
    }

    if (!isAreaValid(row.area)) {
      throw new Error(
        `Строка ${rowNumber}: поле «Квадраты» должно быть числом, например 45, 45.5 или 45,5.`,
      );
    }

    if (!isAmountValid(row.amount)) {
      throw new Error(
        `Строка ${rowNumber}: поле «Сумма долга» должно быть числом, например 1250, 1250.50 или 1250,50.`,
      );
    }

    if (!isDaysValid(row.days)) {
      throw new Error(
        `Строка ${rowNumber}: поле «Срок долга» должно быть целым числом или пустым.`,
      );
    }

    parsedRows.push(row);
  }

  if (parsedRows.length === 0) {
    throw new Error("Файл не содержит валидных строк для импорта.");
  }

  if (parsedRows.length !== referenceRows.length) {
    throw new Error(
      "Импорт отклонен: количество строк не совпадает с текущим списком квартир.",
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
        `Строка ${index + 2}: readonly-данные квартиры не совпадают с текущим реестром. Импорт отклонен.`,
      );
    }
  }

  return {
    rows: parsedRows,
    totalRows: parsedRows.length,
  };
}
