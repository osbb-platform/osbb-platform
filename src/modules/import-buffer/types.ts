export type ImportAdapterKey = "debtors_1c";

export type ImportRowClassification =
  | "data"
  | "skip_service"
  | "skip_provider"
  | "skip_group"
  | "skip_total";

export type ImportMatchStatus =
  | "matched"
  | "unmatched"
  | "skipped";

export interface RawSheet {
  name: string;
  rows: readonly (readonly unknown[])[];
}

export interface DetectResult {
  matched: boolean;
  confidence: number;
  reason?: string;
}

export interface PeriodGuess {
  year: number;
  month: number;
  sourceText: string;
}

export interface HeaderMap {
  rowIndex: number;
  columns: Readonly<Record<string, number>>;
}

export interface ImportAdapterError {
  code:
    | "ADAPTER_NOT_FOUND"
    | "ADAPTER_NOT_DETECTED"
    | "PERIOD_NOT_FOUND"
    | "HEADER_NOT_FOUND"
    | "PARSE_FAILED";
  message: string;
}

export type ImportResult<TValue> =
  | {
      ok: true;
      value: TValue;
    }
  | {
      ok: false;
      error: ImportAdapterError;
    };

export interface ParsedRow<TRow> {
  rowIndex: number;
  classification: ImportRowClassification;
  value: TRow | null;
  warnings: readonly string[];
}

export interface ImportAdapter<TRow> {
  key: ImportAdapterKey;
  title: string;
  detect(sheet: RawSheet): DetectResult;
  extractPeriod(sheet: RawSheet): PeriodGuess | null;
  locateHeader(sheet: RawSheet): ImportResult<HeaderMap>;
  parseRows(
    sheet: RawSheet,
    header: HeaderMap,
  ): readonly ParsedRow<TRow>[];
}

export interface ImportPipelineResult<TRow> {
  adapterKey: ImportAdapterKey;
  adapterTitle: string;
  period: PeriodGuess | null;
  header: HeaderMap;
  rows: readonly ParsedRow<TRow>[];
  stats: ImportPipelineStats;
}

export interface ImportPipelineStats {
  totalRows: number;
  dataRows: number;
  skippedRows: number;
  warnings: number;
  byClassification: Readonly<Record<ImportRowClassification, number>>;
}
