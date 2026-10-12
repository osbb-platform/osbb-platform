import * as XLSX from "xlsx";

import { debtors1cAdapter } from "./adapters/debtors1c";
import type { RawSheet } from "./types";

const MAX_SHEETS = 20;
const MAX_ROWS_PER_SHEET = 5_000;
const MAX_COLUMNS_PER_SHEET = 64;
const MAX_CELLS_PER_SHEET = 200_000;

export function readDebtors1cWorkbook(buffer: ArrayBuffer): RawSheet {
  let workbook: XLSX.WorkBook;

  try {
    workbook = XLSX.read(buffer, {
      type: "array",
      raw: true,
      cellDates: false,
      cellFormula: false,
      dense: true,
      sheetRows: MAX_ROWS_PER_SHEET + 1,
    });
  } catch {
    throw new Error("Не вдалося прочитати файл 1С.");
  }

  if (
    workbook.SheetNames.length === 0 ||
    workbook.SheetNames.length > MAX_SHEETS
  ) {
    throw new Error("Файл має некоректну кількість аркушів.");
  }

  let firstDetectionReason: string | null = null;

  for (const name of workbook.SheetNames) {
    const worksheet = workbook.Sheets[name];
    if (!worksheet) continue;

    assertSafeSheetDimensions(worksheet);

    const sheet: RawSheet = {
      name,
      rows: XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
        header: 1,
        raw: true,
        defval: null,
      }),
    };

    const detected = debtors1cAdapter.detect(sheet);
    if (detected.matched) {
      return sheet;
    }

    firstDetectionReason ??= detected.reason ?? null;
  }

  throw new Error(
    firstDetectionReason ??
      "Файл не відповідає підтвердженому формату боржників 1С.",
  );
}

function assertSafeSheetDimensions(worksheet: XLSX.WorkSheet) {
  const reference = (
    worksheet as XLSX.WorkSheet & { "!fullref"?: string }
  )["!fullref"] ?? worksheet["!ref"];
  if (!reference) return;

  let range: XLSX.Range;
  try {
    range = XLSX.utils.decode_range(reference);
  } catch {
    throw new Error("Аркуш файлу має некоректний діапазон даних.");
  }

  const rows = range.e.r - range.s.r + 1;
  const columns = range.e.c - range.s.c + 1;

  if (
    rows > MAX_ROWS_PER_SHEET ||
    columns > MAX_COLUMNS_PER_SHEET ||
    rows * columns > MAX_CELLS_PER_SHEET
  ) {
    throw new Error("Аркуш файлу перевищує безпечний розмір імпорту.");
  }
}
