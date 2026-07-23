import type {
  Debtors1cRow,
} from "./adapters/debtors1c";
import type {
  ImportRowClassification,
  ParsedRow,
  PeriodGuess,
} from "./types";

export interface ActiveApartmentRegistryRow {
  id: string;
  accountNumber: string;
  apartmentLabel: string;
  ownerName: string;
  area: number | null;
}

export type ImportReconciliationWarningCode =
  | "APARTMENT_LABEL_MISMATCH"
  | "OWNER_NAME_MISMATCH"
  | "AREA_MISMATCH";

export interface ImportReconciliationWarning {
  code: ImportReconciliationWarningCode;
  sourceValue: string | number | null;
  registryValue: string | number | null;
}

export interface MatchedDebtors1cRow {
  rowIndex: number;
  classification: "data";
  source: Debtors1cRow;
  matchedApartmentId: string | null;
  matchStatus: "matched" | "unmatched";
  warnings: readonly ImportReconciliationWarning[];
}

export interface SkippedImportRow {
  rowIndex: number;
  classification: Exclude<
    ImportRowClassification,
    "data"
  >;
}

export interface ImportReconciliationResult {
  rows: readonly (
    | MatchedDebtors1cRow
    | SkippedImportRow
  )[];
  unknownSourceAccountNumbers: readonly string[];
  registryAccountsMissingFromFile: readonly string[];
  matchedCount: number;
  warningCount: number;
  blocked: boolean;
}

export interface ImportBufferPreview {
  adapterKey: "debtors_1c";
  detectedPeriod: PeriodGuess | null;
  confirmedPeriod: PeriodGuess | null;
  reconciliation: ImportReconciliationResult;
}

export interface ImportBufferUploadRecord {
  id: string;
  houseId: string;
  adapterKey: "debtors_1c";
  status:
    | "parsed"
    | "confirmed"
    | "transferred"
    | "failed"
    | "discarded";
  detectedPeriod: PeriodGuess | null;
  confirmedPeriod: PeriodGuess | null;
  lockVersion: number;
}

export interface ImportBufferRepository {
  getUpload(uploadId: string): Promise<ImportBufferUploadRecord | null>;
  confirmPeriod(params: {
    uploadId: string;
    period: PeriodGuess;
    expectedLockVersion: number;
  }): Promise<ImportBufferUploadRecord>;
  discard(params: {
    uploadId: string;
    expectedLockVersion: number;
  }): Promise<ImportBufferUploadRecord>;
  markTransferred(params: {
    uploadId: string;
    expectedLockVersion: number;
    snapshotId: string;
  }): Promise<ImportBufferUploadRecord>;
}

export interface DebtorsMonthTransferGateway {
  importMonthDraft(params: {
    houseId: string;
    periodYear: number;
    periodMonth: number;
    source: "buffer_1c";
    importMeta: Record<string, unknown>;
    rows: readonly {
      accountNumber: string;
      accrued: number | null;
      paid: number | null;
      closingBalance: number;
      debtSourceValue: number | null;
    }[];
  }): Promise<
    | {
        ok: true;
        snapshotId: string;
      }
    | {
        ok: false;
        error: string;
      }
  >;
}

export interface ParsedDebtors1cPreviewInput {
  period: PeriodGuess | null;
  rows: readonly ParsedRow<Debtors1cRow>[];
}
