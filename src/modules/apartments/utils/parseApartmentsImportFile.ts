import * as XLSX from "xlsx";
import {
  getHouseUnitTerminology,
  HOUSE_OBJECT_KIND_OPTIONS,
} from "@/src/shared/utils/houses/houseUnitTerminology";

export const APARTMENTS_IMPORT_HEADERS = [
  "Особовий рахунок",
  "Квартира",
  "Власник",
  "Площа",
] as const;

// Every unit-label header any object_kind's export template can produce.
// Accepted interchangeably on import so a garden-association template
// round-trips, and a legacy apartment-building file still imports for a
// house that was later reclassified.
const ALL_UNIT_LABEL_HEADERS = HOUSE_OBJECT_KIND_OPTIONS.map(
  (option) => getHouseUnitTerminology(option.value).full,
);

export function getApartmentsImportHeaders(
  objectKind?: unknown,
): [string, string, string, string] {
  const terms = getHouseUnitTerminology(objectKind);
  return ["Особовий рахунок", terms.full, "Власник", "Площа"];
}

export type ApartmentsImportRow = {
  accountNumber: string;
  apartmentLabel: string;
  ownerName: string;
  area: string;
};

export type ApartmentsImportParseResult = {
  rows: ApartmentsImportRow[];
  totalRows: number;
};

function normalizeCellValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function isAreaValid(value: string) {
  if (!value) {
    return true;
  }

  return /^-?\d+(?:[.,]\d+)?$/.test(value);
}

export async function parseApartmentsImportFile(
  file: File,
  objectKind?: unknown,
): Promise<ApartmentsImportParseResult> {
  const terms = getHouseUnitTerminology(objectKind);
  const unitHeader = terms.full;
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

  const hasUnitHeader = ALL_UNIT_LABEL_HEADERS.some((header) =>
    headerRow.includes(header),
  );

  const missingHeaders = [
    "Особовий рахунок",
    "Власник",
    "Площа",
  ].filter((header) => !headerRow.includes(header));

  if (!hasUnitHeader) {
    missingHeaders.splice(1, 0, unitHeader);
  }

  if (missingHeaders.length > 0) {
    throw new Error(
      `У файлі відсутні обов’язкові колонки: ${missingHeaders.join(", ")}.`,
    );
  }

  const headerIndexes = {
    accountNumber: headerRow.indexOf("Особовий рахунок"),
    apartmentLabel: ALL_UNIT_LABEL_HEADERS.map((header) =>
      headerRow.indexOf(header),
    ).find((foundIndex) => foundIndex !== -1)!,
    ownerName: headerRow.indexOf("Власник"),
    area: headerRow.indexOf("Площа"),
  };

  const parsedRows: ApartmentsImportRow[] = [];
  const duplicateApartmentSet = new Set<string>();
  const duplicateAccountSet = new Set<string>();

  for (let index = 1; index < rows.length; index += 1) {
    const sourceRow = rows[index] ?? [];

    const row: ApartmentsImportRow = {
      accountNumber: normalizeCellValue(sourceRow[headerIndexes.accountNumber]),
      apartmentLabel: normalizeCellValue(sourceRow[headerIndexes.apartmentLabel]),
      ownerName: normalizeCellValue(sourceRow[headerIndexes.ownerName]),
      area: normalizeCellValue(sourceRow[headerIndexes.area]),
    };

    const isCompletelyEmpty =
      !row.accountNumber &&
      !row.apartmentLabel &&
      !row.ownerName &&
      !row.area;

    if (isCompletelyEmpty) {
      continue;
    }

    const rowNumber = index + 1;

    if (!row.accountNumber) {
      throw new Error(`Рядок ${rowNumber}: поле «Особовий рахунок» є обов’язковим.`);
    }

    if (!row.apartmentLabel) {
      throw new Error(`Рядок ${rowNumber}: поле «${unitHeader}» є обов’язковим.`);
    }

    if (!row.ownerName) {
      throw new Error(`Рядок ${rowNumber}: поле «Власник» є обов’язковим.`);
    }

    if (!isAreaValid(row.area)) {
      throw new Error(
        `Рядок ${rowNumber}: поле «Площа» має бути числом, наприклад 45, 45.5 або 45,5.`,
      );
    }

    const apartmentKey = row.apartmentLabel.toLowerCase();
    const accountKey = row.accountNumber.toLowerCase();

    if (duplicateApartmentSet.has(apartmentKey)) {
      throw new Error(
        `Рядок ${rowNumber}: дублікат значення «${unitHeader}» всередині файлу (${row.apartmentLabel}).`,
      );
    }

    if (duplicateAccountSet.has(accountKey)) {
      throw new Error(
        `Рядок ${rowNumber}: дублікат значення «Особовий рахунок» всередині файлу (${row.accountNumber}).`,
      );
    }

    duplicateApartmentSet.add(apartmentKey);
    duplicateAccountSet.add(accountKey);
    parsedRows.push(row);
  }

  if (parsedRows.length === 0) {
    throw new Error("Файл не містить валідних рядків для імпорту.");
  }

  return {
    rows: parsedRows,
    totalRows: parsedRows.length,
  };
}
