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
  DEBTORS_1C_TECHNICAL_APARTMENT_LABEL,
  DEBTORS_1C_TECHNICAL_AREA,
  DEBTORS_1C_TECHNICAL_OWNER_MARKERS,
  DEBTORS_1C_TITLE_MARKER,
  DEBTORS_1C_TOTAL_MARKER,
} from "./constants";
import type { Debtors1cGroupKind, Debtors1cRow } from "./types";

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

const DEBTORS_1C_MONTH_ALIASES: Readonly<Record<string, number>> = {
  січень: 1,
  январь: 1,
  лютий: 2,
  февраль: 2,
  березень: 3,
  март: 3,
  квітень: 4,
  апрель: 4,
  травень: 5,
  май: 5,
  червень: 6,
  июнь: 6,
  липень: 7,
  июль: 7,
  серпень: 8,
  август: 8,
  вересень: 9,
  сентябрь: 9,
  жовтень: 10,
  октябрь: 10,
  листопад: 11,
  ноябрь: 11,
  грудень: 12,
  декабрь: 12,
};

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

export function extractDebtors1cPeriod(sheet: RawSheet): PeriodGuess | null {
  for (const row of sheet.rows) {
    const rowText = row
      .map(toCellText)
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/gu, " ")
      .trim();

    const normalized = rowText.toLocaleLowerCase("uk-UA");

    const isSummaryReport =
      normalized.includes("зведена відомість") ||
      normalized.includes("сводная ведомость") ||
      normalized.includes(DEBTORS_1C_TITLE_MARKER.toLocaleLowerCase("uk-UA"));

    if (!isSummaryReport) {
      continue;
    }

    const normalizedMatch = normalized.match(
      /за\s+([а-яіїєґ]+)\s+(\d{4})\s*(?:р|г)\.?/u,
    );

    const sourceMatch = rowText.match(
      /за\s+([А-ЯІЇЄҐа-яіїєґ]+)\s+(\d{4})\s*(?:р|г)\.?/u,
    );

    if (!normalizedMatch || !sourceMatch) {
      continue;
    }

    const monthName = normalizedMatch[1];
    const month =
      DEBTORS_1C_MONTH_ALIASES[monthName] ??
      DEBTORS_1C_PROVEN_MONTHS[monthName];

    const year = Number(normalizedMatch[2]);

    if (!month || !Number.isInteger(year) || year < 2000 || year > 2100) {
      continue;
    }

    return {
      year,
      month,
      sourceText: sourceMatch[0],
    };
  }

  return null;
}

export function locateDebtors1cHeader(
  sheet: RawSheet,
): ImportResult<HeaderMap> {
  for (let rowIndex = 0; rowIndex < sheet.rows.length - 1; rowIndex += 1) {
    const topRow = sheet.rows[rowIndex];
    const secondRow = sheet.rows[rowIndex + 1];

    const columns = resolveHeaderColumns(topRow, secondRow);

    if (REQUIRED_HEADER_KEYS.every((key) => columns[key] !== undefined)) {
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
      message: "Не вдалося знайти підтверджені колонки файлу 1С",
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

    const nextGroup = classifyGroupRow(rowText, row, header);

    if (nextGroup) {
      group = nextGroup;

      parsed.push({
        rowIndex,
        classification: group === "providers" ? "skip_provider" : "skip_group",
        value: null,
        warnings: [],
      });
      continue;
    }

    const accountRaw = getTextCell(row, header.columns.account);

    if (!accountRaw) {
      continue;
    }

    const accountNumberNormalized = normalizeAccountNumber(accountRaw, {
      prefixes: DEBTORS_1C_ACCOUNT_PREFIXES,
      removableSymbols: DEBTORS_1C_ACCOUNT_SYMBOLS,
    });

    if (!accountNumberNormalized) {
      continue;
    }

    const apartmentLabel = getTextCell(row, header.columns.apartment);
    const ownerName = getTextCell(row, header.columns.owner);
    const area = getNumberCell(row, header.columns.area);

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
      isServiceLabel(apartmentLabel) ||
      isTechnicalAccount(apartmentLabel, ownerName, area)
    ) {
      parsed.push({
        rowIndex,
        classification:
          group === "providers" ? "skip_provider" : "skip_service",
        value: null,
        warnings: [],
      });
      continue;
    }

    if (group !== "residential") {
      continue;
    }

    const debtValue = getNumberCell(row, header.columns.debt);

    parsed.push({
      rowIndex,
      classification: "data",
      value: {
        accountNumberRaw: accountRaw,
        accountNumberNormalized,
        apartmentLabel,
        ownerName,
        area,
        openingBalance: getNumberCell(row, header.columns.opening),
        accrued: getNumberCell(row, header.columns.accrued),
        paid: getNumberCell(row, header.columns.paid),
        closingBalance: getNumberCell(row, header.columns.closing),
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
export function toOsbbBalance(debtValue: number | null): number | null {
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
  row: readonly unknown[],
  header: HeaderMap,
): Debtors1cGroupKind | null {
  if (rowText.includes(DEBTORS_1C_NON_RESIDENTIAL_MARKER)) {
    return "non_residential";
  }

  if (rowText.includes(DEBTORS_1C_PROVIDER_MARKER)) {
    return "providers";
  }

  /*
   * The first aggregate building row after the header starts
   * the residential section. Its address differs for every house,
   * so detection must use the 1C row structure rather than a
   * hard-coded address such as Sobornyi 186.
   */
  const accountCell = getTextCell(row, header.columns.account);
  const apartmentCell = getTextCell(row, header.columns.apartment);
  const ownerCell = getTextCell(row, header.columns.owner);
  const closingValue = getNumberCell(row, header.columns.closing);
  const debtValue = getNumberCell(row, header.columns.debt);

  const normalizedAccount = accountCell
    ? normalizeAccountNumber(accountCell, {
        prefixes: DEBTORS_1C_ACCOUNT_PREFIXES,
        removableSymbols: DEBTORS_1C_ACCOUNT_SYMBOLS,
      })
    : "";

  const isPersonalAccountRow =
    accountCell !== null &&
    DEBTORS_1C_ACCOUNT_PREFIXES.some((prefix) =>
      accountCell.startsWith(prefix),
    ) &&
    Boolean(normalizedAccount);

  /*
   * Structural residential detection is only for a building aggregate.
   * A sparse personal-account row inside an explicit special section
   * must never switch the parser back to residential.
   *
   * Proven production shape:
   * docs/import-buffer/1c-format-notes.md
   */
  if (
    accountCell &&
    !isPersonalAccountRow &&
    !apartmentCell &&
    !ownerCell &&
    (closingValue !== null || debtValue !== null)
  ) {
    return "residential";
  }

  return null;
}

function isTechnicalAccount(
  apartmentLabel: string | null,
  ownerName: string | null,
  area: number | null,
): boolean {
  if (
    apartmentLabel !== DEBTORS_1C_TECHNICAL_APARTMENT_LABEL ||
    area !== DEBTORS_1C_TECHNICAL_AREA ||
    !ownerName
  ) {
    return false;
  }

  const normalizedOwner = ownerName
    .replace(/\s+/gu, " ")
    .trim()
    .toLocaleLowerCase("uk-UA");

  return DEBTORS_1C_TECHNICAL_OWNER_MARKERS.some(
    (marker) =>
      normalizedOwner ===
      marker.toLocaleLowerCase("uk-UA"),
  );
}

function isServiceLabel(apartmentLabel: string | null): boolean {
  if (!apartmentLabel) {
    return false;
  }

  return DEBTORS_1C_SERVICE_LABEL_PREFIXES.some((prefix) =>
    apartmentLabel.startsWith(prefix),
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
