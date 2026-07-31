import type {
  ParsedDebtors1cPreviewInput,
  ActiveApartmentRegistryRow,
  ImportReconciliationResult,
  ImportReconciliationWarning,
  MatchedDebtors1cRow,
  SkippedImportRow,
} from "./workflowTypes";

const AREA_TOLERANCE = 0.01;

export function reconcileDebtors1cRows(
  input: ParsedDebtors1cPreviewInput,
  registryRows: readonly ActiveApartmentRegistryRow[],
): ImportReconciliationResult {
  const registryByAccount = new Map(
    registryRows.map((row) => [
      row.accountNumber.trim(),
      row,
    ]),
  );

  const sourceAccounts = new Set<string>();
  const unknownSourceAccounts = new Set<string>();
  const rows: Array<
    MatchedDebtors1cRow | SkippedImportRow
  > = [];

  let matchedCount = 0;
  let warningCount = 0;

  for (const row of input.rows) {
    if (
      row.classification !== "data" ||
      row.value === null
    ) {
      rows.push({
        rowIndex: row.rowIndex,
        classification:
          row.classification === "data"
            ? "skip_group"
            : row.classification,
      });
      continue;
    }

    const account =
      row.value.accountNumberNormalized.trim();

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
    .map((row) => row.accountNumber.trim())
    .filter(
      (accountNumber) =>
        accountNumber &&
        !sourceAccounts.has(accountNumber),
    )
    .sort(compareAccountNumbers);

  const unknownSourceAccountNumbers = [
    ...unknownSourceAccounts,
  ].sort(compareAccountNumbers);

  return {
    rows,
    unknownSourceAccountNumbers,
    registryAccountsMissingFromFile,
    matchedCount,
    warningCount,
    blocked: unknownSourceAccountNumbers.length > 0,
  };
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

function normalizeComparableText(
  value: string | null,
): string {
  return (value ?? "")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("uk-UA");
}

function areasEqual(
  source: number | null,
  registry: number | null,
): boolean {
  if (source === null || registry === null) {
    return source === registry;
  }

  return Math.abs(source - registry) <= AREA_TOLERANCE;
}

function compareAccountNumbers(
  left: string,
  right: string,
): number {
  return left.localeCompare(right, "uk", {
    numeric: true,
  });
}
