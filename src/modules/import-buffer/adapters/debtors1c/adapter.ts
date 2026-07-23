import {
  normalizeAccountNumber,
  normalizeLocalizedNumber,
} from "../../normalization";
import type {
  HeaderMap,
  ImportAdapter,
  ImportResult,
  ParsedRow,
  PeriodGuess,
  RawSheet,
} from "../../types";
import {
  DEBTORS_1C_ACCOUNT_PREFIXES,
  DEBTORS_1C_ACCOUNT_SYMBOLS,
  DEBTORS_1C_ADAPTER_KEY,
  DEBTORS_1C_HEADER_LABELS,
  DEBTORS_1C_NON_RESIDENTIAL_MARKER,
  DEBTORS_1C_PROVEN_MONTHS,
  DEBTORS_1C_PROVIDER_MARKER,
  DEBTORS_1C_SERVICE_LABEL_PREFIXES,
  DEBTORS_1C_TITLE_MARKER,
  DEBTORS_1C_TOTAL_MARKER,
} from "./constants";
import type {
  Debtors1cGroupKind,
  Debtors1cRow,
} from "./types";

const REQUIRED_HEADER_KEYS = [
  "account",
  "apartment",
  "owner",
  "area",
  "opening",
  "accrued",
  "paid",
  "closing",
  "debt",
] as const;

type HeaderKey = (typeof REQUIRED_HEADER_KEYS)[number];

export const debtors1cAdapter: ImportAdapter<Debtors1cRow> = {
  key: DEBTORS_1C_ADAPTER_KEY,
  title: "Боржники — 1С",

  detect(sheet) {
    const period = extractDebtors1cPeriod(sheet);
    const header = locateDebtors1cHeader(sheet);

    const matched = period !== null && header.ok;

    return {
      matched,
      confidence: matched ? 100 : 0,
      reason: matched
        ? undefined
        : "Файл не відповідає підтвердженому формату боржників 1С",
    };
  },

  extractPeriod: extractDebtors1cPeriod,

  locateHeader: locateDebtors1cHeader,

  parseRows(sheet, header) {
    return parseDebtors1cRows(sheet, header);
  },
};

export function extractDebtors1cPeriod(
  sheet: RawSheet,
): PeriodGuess | null {
  for (const row of sheet.rows) {
    const rowText = row.map(toCellText).filter(Boolean).join(" ");

    if (!rowText.includes(DEBTORS_1C_TITLE_MARKER)) {
      continue;
    }

    const match = rowText.match(
      /за\s+([А-ЯІЇЄҐа-яіїєґ]+)\s+(\d{4})\s*р\.?/u,
    );

    if (!match) {
      return null;
    }

    const monthName = match[1].toLocaleLowerCase("uk-UA");
    const month = DEBTORS_1C_PROVEN_MONTHS[monthName];
    const year = Number(match[2]);

    if (!month || !Number.isInteger(year)) {
      return null;
    }

    return {
      year,
      month,
      sourceText: match[0],
    };
  }

  return null;
}

export function locateDebtors1cHeader(
  sheet: RawSheet,
): ImportResult<HeaderMap> {
  for (
    let rowIndex = 0;
    rowIndex < sheet.rows.length - 1;
    rowIndex += 1
  ) {
    const topRow = sheet.rows[rowIndex];
    const secondRow = sheet.rows[rowIndex + 1];

    const columns = resolveHeaderColumns(
      topRow,
      secondRow,
    );

    if (
      REQUIRED_HEADER_KEYS.every(
        (key) => columns[key] !== undefined,
      )
    ) {
      return {
        ok: true,
        value: {
          rowIndex: rowIndex + 1,
          columns,
        },
      };
    }
  }

  return {
    ok: false,
    error: {
      code: "HEADER_NOT_FOUND",
      message:
        "Не вдалося знайти підтверджені колонки файлу 1С",
    },
  };
}

export function parseDebtors1cRows(
  sheet: RawSheet,
  header: HeaderMap,
): readonly ParsedRow<Debtors1cRow>[] {
  const parsed: ParsedRow<Debtors1cRow>[] = [];
  let group: Debtors1cGroupKind = "none";

  for (
    let rowIndex = header.rowIndex + 1;
    rowIndex < sheet.rows.length;
    rowIndex += 1
  ) {
    const row = sheet.rows[rowIndex];
    const rowText = row.map(toCellText).filter(Boolean).join(" ");

    if (!rowText) {
      continue;
    }

    if (rowText.startsWith(DEBTORS_1C_TOTAL_MARKER)) {
      parsed.push({
        rowIndex,
        classification: "skip_total",
        value: null,
        warnings: [],
      });
      continue;
    }

    const nextGroup = classifyGroupRow(rowText);

    if (nextGroup) {
      group = nextGroup;

      parsed.push({
        rowIndex,
        classification:
          group === "providers"
            ? "skip_provider"
            : "skip_group",
        value: null,
        warnings: [],
      });
      continue;
    }

    const accountRaw = getTextCell(
      row,
      header.columns.account,
    );

    if (!accountRaw) {
      continue;
    }

    const accountNumberNormalized =
      normalizeAccountNumber(accountRaw, {
        prefixes: DEBTORS_1C_ACCOUNT_PREFIXES,
        removableSymbols: DEBTORS_1C_ACCOUNT_SYMBOLS,
      });

    if (!accountNumberNormalized) {
      continue;
    }

    const apartmentLabel = getTextCell(
      row,
      header.columns.apartment,
    );

    if (group === "non_residential") {
      parsed.push({
        rowIndex,
        classification: "skip_group",
        value: null,
        warnings: [],
      });
      continue;
    }

    if (
      group === "providers" ||
      isServiceLabel(apartmentLabel)
    ) {
      parsed.push({
        rowIndex,
        classification:
          group === "providers"
            ? "skip_provider"
            : "skip_service",
        value: null,
        warnings: [],
      });
      continue;
    }

    if (group !== "residential") {
      continue;
    }

    const debtValue = getNumberCell(
      row,
      header.columns.debt,
    );

    parsed.push({
      rowIndex,
      classification: "data",
      value: {
        accountNumberRaw: accountRaw,
        accountNumberNormalized,
        apartmentLabel,
        ownerName: getTextCell(
          row,
          header.columns.owner,
        ),
        area: getNumberCell(
          row,
          header.columns.area,
        ),
        openingBalance: getNumberCell(
          row,
          header.columns.opening,
        ),
        accrued: getNumberCell(
          row,
          header.columns.accrued,
        ),
        paid: getNumberCell(
          row,
          header.columns.paid,
        ),
        closingBalance: getNumberCell(
          row,
          header.columns.closing,
        ),
        debtValue,
        osbbBalance: toOsbbBalance(debtValue),
      },
      warnings: [],
    });
  }

  return parsed;
}

/**
 * The only sign-conversion point for 1C debt values.
 *
 * 1C source debt is positive for debt and negative for credit.
 * OSBB signed balance is negative for debt and positive for credit.
 */
export function toOsbbBalance(
  debtValue: number | null,
): number | null {
  return debtValue === null ? null : -debtValue;
}

function resolveHeaderColumns(
  topRow: readonly unknown[],
  secondRow: readonly unknown[],
): Record<string, number> {
  const columns: Partial<Record<HeaderKey, number>> = {};

  for (
    let columnIndex = 0;
    columnIndex < Math.max(topRow.length, secondRow.length);
    columnIndex += 1
  ) {
    const top = toCellText(topRow[columnIndex]);
    const second = toCellText(secondRow[columnIndex]);

    for (const key of REQUIRED_HEADER_KEYS) {
      const expected = DEBTORS_1C_HEADER_LABELS[key];

      if (top === expected || second === expected) {
        columns[key] = columnIndex;
      }
    }
  }

  return columns as Record<string, number>;
}

function classifyGroupRow(
  rowText: string,
): Debtors1cGroupKind | null {
  if (rowText.includes(DEBTORS_1C_NON_RESIDENTIAL_MARKER)) {
    return "non_residential";
  }

  if (rowText.includes(DEBTORS_1C_PROVIDER_MARKER)) {
    return "providers";
  }

  if (
    rowText.includes("м.Запоріжжя") &&
    rowText.includes("пр.Соборний") &&
    rowText.includes("№ 186")
  ) {
    return "residential";
  }

  return null;
}

function isServiceLabel(
  apartmentLabel: string | null,
): boolean {
  if (!apartmentLabel) {
    return false;
  }

  return DEBTORS_1C_SERVICE_LABEL_PREFIXES.some(
    (prefix) => apartmentLabel.startsWith(prefix),
  );
}

function getTextCell(
  row: readonly unknown[],
  column: number | undefined,
): string | null {
  if (column === undefined) {
    return null;
  }

  const value = toCellText(row[column]);
  return value || null;
}

function getNumberCell(
  row: readonly unknown[],
  column: number | undefined,
): number | null {
  if (column === undefined) {
    return null;
  }

  return normalizeLocalizedNumber(row[column]);
}

function toCellText(value: unknown): string {
  return String(value ?? "").trim();
}
