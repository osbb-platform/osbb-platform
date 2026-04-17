import * as XLSX from "xlsx";

export const APARTMENTS_IMPORT_HEADERS = [
  "Лицевой счет",
  "Квартира",
  "Владелец",
  "Квадраты",
] as const;

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
): Promise<ApartmentsImportParseResult> {
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

  const missingHeaders = APARTMENTS_IMPORT_HEADERS.filter(
    (header) => !headerRow.includes(header),
  );

  if (missingHeaders.length > 0) {
    throw new Error(
      `В файле отсутствуют обязательные колонки: ${missingHeaders.join(", ")}.`,
    );
  }

  const headerIndexes = {
    accountNumber: headerRow.indexOf("Лицевой счет"),
    apartmentLabel: headerRow.indexOf("Квартира"),
    ownerName: headerRow.indexOf("Владелец"),
    area: headerRow.indexOf("Квадраты"),
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

    const apartmentKey = row.apartmentLabel.toLowerCase();
    const accountKey = row.accountNumber.toLowerCase();

    if (duplicateApartmentSet.has(apartmentKey)) {
      throw new Error(
        `Строка ${rowNumber}: дубликат значения «Квартира» внутри файла (${row.apartmentLabel}).`,
      );
    }

    if (duplicateAccountSet.has(accountKey)) {
      throw new Error(
        `Строка ${rowNumber}: дубликат значения «Лицевой счет» внутри файла (${row.accountNumber}).`,
      );
    }

    duplicateApartmentSet.add(apartmentKey);
    duplicateAccountSet.add(accountKey);
    parsedRows.push(row);
  }

  if (parsedRows.length === 0) {
    throw new Error("Файл не содержит валидных строк для импорта.");
  }

  return {
    rows: parsedRows,
    totalRows: parsedRows.length,
  };
}
