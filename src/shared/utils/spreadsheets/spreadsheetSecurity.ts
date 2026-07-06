import * as XLSX from "xlsx";

export const SPREADSHEET_MAX_FILE_BYTES =
  5 * 1024 * 1024;

export const SPREADSHEET_MAX_DATA_ROWS =
  10_000;

export const SPREADSHEET_MAX_COLUMNS = 64;

export const SPREADSHEET_MAX_CELLS =
  100_000;

export const SPREADSHEET_MAX_SHEETS = 16;

const SUPPORTED_EXTENSIONS = [
  "csv",
  "xls",
  "xlsx",
] as const;

type SpreadsheetExtension =
  (typeof SUPPORTED_EXTENSIONS)[number];

const GENERIC_MIME_TYPES = new Set([
  "",
  "application/octet-stream",
]);

const MIME_TYPES: Record<
  SpreadsheetExtension,
  ReadonlySet<string>
> = {
  csv: new Set([
    "text/csv",
    "application/csv",
    "text/plain",
    "application/vnd.ms-excel",
  ]),
  xls: new Set([
    "application/vnd.ms-excel",
    "application/x-msexcel",
    "application/xls",
  ]),
  xlsx: new Set([
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/zip",
    "application/x-zip-compressed",
  ]),
};

const FORMULA_PREFIX =
  /^[\u0009\u000a\u000d ]*[=+\-@]/;

function extensionFromName(
  fileName: string,
): SpreadsheetExtension | null {
  const extension =
    fileName
      .split(".")
      .pop()
      ?.trim()
      .toLowerCase()
    ?? "";

  return SUPPORTED_EXTENSIONS.includes(
    extension as SpreadsheetExtension,
  )
    ? extension as SpreadsheetExtension
    : null;
}

function normalizeMimeType(
  value: string,
) {
  return value
    .split(";", 1)[0]
    ?.trim()
    .toLowerCase()
    ?? "";
}

function startsWithBytes(
  bytes: Uint8Array,
  signature: readonly number[],
) {
  return signature.every(
    (value, index) =>
      bytes[index] === value,
  );
}

function decodeCsv(
  buffer: ArrayBuffer,
) {
  const bytes = new Uint8Array(buffer);

  if (
    startsWithBytes(
      bytes,
      [0xff, 0xfe],
    )
  ) {
    return new TextDecoder(
      "utf-16le",
      {
        fatal: true,
      },
    ).decode(bytes);
  }

  if (
    startsWithBytes(
      bytes,
      [0xfe, 0xff],
    )
  ) {
    return new TextDecoder(
      "utf-16be",
      {
        fatal: true,
      },
    ).decode(bytes);
  }

  try {
    return new TextDecoder(
      "utf-8",
      {
        fatal: true,
      },
    ).decode(bytes);
  } catch {
    return new TextDecoder(
      "windows-1251",
      {
        fatal: true,
      },
    ).decode(bytes);
  }
}

function assertBinarySignature(
  extension: SpreadsheetExtension,
  buffer: ArrayBuffer,
) {
  if (extension === "csv") {
    return;
  }

  const bytes = new Uint8Array(
    buffer,
    0,
    Math.min(buffer.byteLength, 8),
  );

  if (extension === "xls") {
    const valid =
      startsWithBytes(
        bytes,
        [
          0xd0,
          0xcf,
          0x11,
          0xe0,
          0xa1,
          0xb1,
          0x1a,
          0xe1,
        ],
      );

    if (!valid) {
      throw new Error(
        "Файл XLS має некоректний формат або пошкоджений.",
      );
    }

    return;
  }

  const valid =
    startsWithBytes(
      bytes,
      [0x50, 0x4b, 0x03, 0x04],
    )
    || startsWithBytes(
      bytes,
      [0x50, 0x4b, 0x05, 0x06],
    )
    || startsWithBytes(
      bytes,
      [0x50, 0x4b, 0x07, 0x08],
    );

  if (!valid) {
    throw new Error(
      "Файл XLSX має некоректний формат або пошкоджений.",
    );
  }
}

function assertWorksheetLimits(
  worksheet: XLSX.WorkSheet,
) {
  const sheet =
    worksheet as XLSX.WorkSheet & {
      "!fullref"?: string;
    };

  const reference =
    sheet["!fullref"]
    ?? sheet["!ref"];

  if (!reference) {
    return;
  }

  let range: XLSX.Range;

  try {
    range =
      XLSX.utils.decode_range(reference);
  } catch {
    throw new Error(
      "Файл містить некоректний діапазон комірок.",
    );
  }

  const rows =
    range.e.r - range.s.r + 1;

  const columns =
    range.e.c - range.s.c + 1;

  const dataRows = Math.max(
    0,
    rows - 1,
  );

  if (
    dataRows > SPREADSHEET_MAX_DATA_ROWS
  ) {
    throw new Error(
      `Файл містить більше ${SPREADSHEET_MAX_DATA_ROWS} рядків даних.`,
    );
  }

  if (
    columns > SPREADSHEET_MAX_COLUMNS
  ) {
    throw new Error(
      `Файл містить більше ${SPREADSHEET_MAX_COLUMNS} колонок.`,
    );
  }

  if (
    rows * columns
      > SPREADSHEET_MAX_CELLS
  ) {
    throw new Error(
      `Файл містить більше ${SPREADSHEET_MAX_CELLS} комірок.`,
    );
  }
}

export function escapeSpreadsheetFormula(
  value: string,
) {
  return FORMULA_PREFIX.test(value)
    ? `'${value}`
    : value;
}

export async function readSpreadsheetRows(
  file: File,
): Promise<unknown[][]> {
  const extension =
    extensionFromName(file.name);

  if (!extension) {
    throw new Error(
      "Підтримуються лише файли CSV, XLS та XLSX.",
    );
  }

  if (file.size === 0) {
    throw new Error("Файл порожній.");
  }

  if (
    file.size > SPREADSHEET_MAX_FILE_BYTES
  ) {
    throw new Error(
      "Файл занадто великий. Максимальний розмір — 5 МБ.",
    );
  }

  const mimeType =
    normalizeMimeType(file.type);

  if (
    !GENERIC_MIME_TYPES.has(mimeType)
    && !MIME_TYPES[extension].has(mimeType)
  ) {
    throw new Error(
      "Тип файлу не відповідає його розширенню.",
    );
  }

  const buffer = await file.arrayBuffer();

  if (
    buffer.byteLength
      > SPREADSHEET_MAX_FILE_BYTES
  ) {
    throw new Error(
      "Файл занадто великий. Максимальний розмір — 5 МБ.",
    );
  }

  assertBinarySignature(
    extension,
    buffer,
  );

  const options = {
    sheetRows:
      SPREADSHEET_MAX_DATA_ROWS + 2,
    cellFormula: false,
    cellHTML: false,
    cellNF: false,
    cellStyles: false,
    bookDeps: false,
    bookFiles: false,
    bookVBA: false,
    WTF: false,
  } as const;

  let workbook: XLSX.WorkBook;

  try {
    workbook =
      extension === "csv"
        ? XLSX.read(
            decodeCsv(buffer),
            {
              ...options,
              type: "string",
            },
          )
        : XLSX.read(
            buffer,
            {
              ...options,
              type: "array",
            },
          );
  } catch {
    throw new Error(
      "Не вдалося безпечно прочитати файл. Перевірте його формат і кодування.",
    );
  }

  if (
    workbook.SheetNames.length
      > SPREADSHEET_MAX_SHEETS
  ) {
    throw new Error(
      `Файл містить більше ${SPREADSHEET_MAX_SHEETS} аркушів.`,
    );
  }

  const sheetName =
    workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error(
      "Файл не містить аркушів для імпорту.",
    );
  }

  const worksheet =
    workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error(
      "Не вдалося прочитати перший аркуш файлу.",
    );
  }

  assertWorksheetLimits(worksheet);

  const rows =
    XLSX.utils.sheet_to_json<unknown[]>(
      worksheet,
      {
        header: 1,
        blankrows: false,
        defval: "",
        raw: false,
      },
    );

  const maximumColumns = rows.reduce(
    (maximum, row) =>
      Math.max(
        maximum,
        Array.isArray(row)
          ? row.length
          : 0,
      ),
    0,
  );

  if (
    rows.length
      > SPREADSHEET_MAX_DATA_ROWS + 1
  ) {
    throw new Error(
      `Файл містить більше ${SPREADSHEET_MAX_DATA_ROWS} рядків даних.`,
    );
  }

  if (
    maximumColumns
      > SPREADSHEET_MAX_COLUMNS
  ) {
    throw new Error(
      `Файл містить більше ${SPREADSHEET_MAX_COLUMNS} колонок.`,
    );
  }

  if (
    rows.length * maximumColumns
      > SPREADSHEET_MAX_CELLS
  ) {
    throw new Error(
      `Файл містить більше ${SPREADSHEET_MAX_CELLS} комірок.`,
    );
  }

  return rows;
}
