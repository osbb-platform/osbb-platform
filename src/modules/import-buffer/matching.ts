import type {
  ParsedDebtors1cPreviewInput,
  ActiveApartmentRegistryRow,
  ImportReconciliationResult,
  ImportReconciliationWarning,
  MatchedDebtors1cRow,
  SkippedImportRow,
} from "./workflowTypes";
import { normalizeAccountNumber } from "./normalization";

const AREA_TOLERANCE = 0.01;

export function reconcileDebtors1cRows(
  input: ParsedDebtors1cPreviewInput,
  registryRows: readonly ActiveApartmentRegistryRow[],
): ImportReconciliationResult {
  const registryByAccount = buildRegistryByNormalizedAccount(registryRows);

  const sourceAccounts = new Set<string>();
  const unknownSourceAccounts = new Set<string>();
  const rows: Array<MatchedDebtors1cRow | SkippedImportRow> = [];

  let matchedCount = 0;
  let warningCount = 0;

  for (const row of input.rows) {
    if (row.classification !== "data" || row.value === null) {
      rows.push({
        rowIndex: row.rowIndex,
        classification:
          row.classification === "data" ? "skip_group" : row.classification,
      });
      continue;
    }

    const account = normalizeAccountForMatching(
      row.value.accountNumberNormalized,
    );

    sourceAccounts.add(account);

    const apartment = registryByAccount.get(account) ?? null;
    const warnings = apartment
      ? buildReconciliationWarnings(row.value, apartment)
      : [];

    if (!apartment) {
      unknownSourceAccounts.add(account);
    } else {
      matchedCount += 1;
    }

    warningCount += warnings.length;

    rows.push({
      rowIndex: row.rowIndex,
      classification: "data",
      source: row.value,
      matchedApartmentId: apartment?.id ?? null,
      matchStatus: apartment ? "matched" : "unmatched",
      warnings,
    });
  }

  const registryAccountsMissingFromFile = registryRows
    .map((row) => normalizeAccountForMatching(row.accountNumber))
    .filter(
      (accountNumber) => accountNumber && !sourceAccounts.has(accountNumber),
    )
    .sort(compareAccountNumbers);

  const unknownSourceAccountNumbers = [...unknownSourceAccounts].sort(
    compareAccountNumbers,
  );

  return {
    rows,
    unknownSourceAccountNumbers,
    registryAccountsMissingFromFile,
    matchedCount,
    warningCount,
    blocked: false,
  };
}

const ACCOUNT_NUMBER_PREFIXES = [
  "л/с №",
  "л/с№",
  "л/с",
  "особ. рахунок №",
  "особ. рахунок",
  "особовий рахунок №",
  "особовий рахунок",
] as const;

const ACCOUNT_NUMBER_REMOVABLE_SYMBOLS = ["№"] as const;

function normalizeAccountForMatching(value: unknown): string {
  return (
    normalizeAccountNumber(value, {
      prefixes: ACCOUNT_NUMBER_PREFIXES,
      removableSymbols: ACCOUNT_NUMBER_REMOVABLE_SYMBOLS,
    }) ?? String(value ?? "").trim()
  );
}

function buildRegistryByNormalizedAccount(
  registryRows: readonly ActiveApartmentRegistryRow[],
): Map<string, ActiveApartmentRegistryRow> {
  const registryByAccount = new Map<string, ActiveApartmentRegistryRow>();

  for (const row of registryRows) {
    const account = normalizeAccountForMatching(row.accountNumber);

    if (!account) {
      continue;
    }

    const existing = registryByAccount.get(account);

    if (existing && existing.id !== row.id) {
      throw new Error(`DUPLICATE_NORMALIZED_ACCOUNT_NUMBER:${account}`);
    }

    registryByAccount.set(account, row);
  }

  return registryByAccount;
}

function buildReconciliationWarnings(
  source: {
    apartmentLabel: string | null;
    ownerName: string | null;
    area: number | null;
  },
  registry: ActiveApartmentRegistryRow,
): ImportReconciliationWarning[] {
  const warnings: ImportReconciliationWarning[] = [];

  if (
    normalizeComparableText(source.apartmentLabel) !==
    normalizeComparableText(registry.apartmentLabel)
  ) {
    warnings.push({
      code: "APARTMENT_LABEL_MISMATCH",
      sourceValue: source.apartmentLabel,
      registryValue: registry.apartmentLabel,
    });
  }

  if (
    normalizeComparableText(source.ownerName) !==
    normalizeComparableText(registry.ownerName)
  ) {
    warnings.push({
      code: "OWNER_NAME_MISMATCH",
      sourceValue: source.ownerName,
      registryValue: registry.ownerName,
    });
  }

  if (!areasEqual(source.area, registry.area)) {
    warnings.push({
      code: "AREA_MISMATCH",
      sourceValue: source.area,
      registryValue: registry.area,
    });
  }

  return warnings;
}

function normalizeComparableText(value: string | null): string {
  return (value ?? "").trim().replace(/\s+/gu, " ").toLocaleLowerCase("uk-UA");
}

function areasEqual(source: number | null, registry: number | null): boolean {
  if (source === null || registry === null) {
    return source === registry;
  }

  return Math.abs(source - registry) <= AREA_TOLERANCE;
}

function compareAccountNumbers(left: string, right: string): number {
  return left.localeCompare(right, "uk", {
    numeric: true,
  });
}
