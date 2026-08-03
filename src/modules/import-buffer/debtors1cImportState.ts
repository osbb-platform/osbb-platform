import type {
  ImportReconciliationWarning,
} from "./workflowTypes";

export type Debtors1cPreviewRow = {
  rowIndex: number;
  accountNumber: string;
  apartmentLabel: string | null;
  ownerName: string | null;
  debtValue: number | null;
  osbbBalance: number | null;
  matchStatus: "matched" | "unmatched";
  warnings: readonly ImportReconciliationWarning[];
};

export type Debtors1cImportState =
  | {
      ok: true;
      uploadId: string;
      lockVersion: number;
      status: "parsed" | "confirmed" | "transferred" | "discarded";
      detectedPeriod: {
        year: number;
        month: number;
        sourceText: string;
      } | null;
      confirmedPeriod: {
        year: number;
        month: number;
      } | null;
      rows: readonly Debtors1cPreviewRow[];
      unknownSourceAccounts: readonly string[];
      missingRegistryAccounts: readonly string[];
      warningCount: number;
      snapshotId?: string;
      message: string;
    }
  | {
      ok: false;
      error: string;
    };

export const INITIAL_DEBTORS_1C_IMPORT_STATE: Debtors1cImportState = {
  ok: false,
  error: "",
};
