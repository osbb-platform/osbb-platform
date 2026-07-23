import {
  detectAdapter,
  getAdapter,
} from "./registry";
import type {
  ImportAdapter,
  ImportAdapterKey,
  ImportPipelineResult,
  ImportPipelineStats,
  ImportResult,
  ImportRowClassification,
  RawSheet,
} from "./types";

const CLASSIFICATIONS: readonly ImportRowClassification[] = [
  "data",
  "skip_service",
  "skip_provider",
  "skip_group",
  "skip_total",
];

export function runImportPipeline<TRow>(
  sheet: RawSheet,
  adapterKey?: ImportAdapterKey,
): ImportResult<ImportPipelineResult<TRow>> {
  const adapter = resolveAdapter<TRow>(sheet, adapterKey);

  if (!adapter) {
    return {
      ok: false,
      error: {
        code: adapterKey
          ? "ADAPTER_NOT_FOUND"
          : "ADAPTER_NOT_DETECTED",
        message: adapterKey
          ? `Import adapter is not registered: ${adapterKey}`
          : "No registered import adapter detected this file",
      },
    };
  }

  const detected = adapter.detect(sheet);

  if (!detected.matched) {
    return {
      ok: false,
      error: {
        code: "ADAPTER_NOT_DETECTED",
        message:
          detected.reason ??
          `File does not match adapter ${adapter.key}`,
      },
    };
  }

  const headerResult = adapter.locateHeader(sheet);

  if (!headerResult.ok) {
    return headerResult;
  }

  try {
    const rows = adapter.parseRows(
      sheet,
      headerResult.value,
    );

    return {
      ok: true,
      value: {
        adapterKey: adapter.key,
        adapterTitle: adapter.title,
        period: adapter.extractPeriod(sheet),
        header: headerResult.value,
        rows,
        stats: buildImportPipelineStats(rows),
      },
    };
  } catch {
    return {
      ok: false,
      error: {
        code: "PARSE_FAILED",
        message: "Import adapter failed to parse the source file",
      },
    };
  }
}

export function buildImportPipelineStats(
  rows: readonly {
    classification: ImportRowClassification;
    warnings: readonly string[];
  }[],
): ImportPipelineStats {
  const byClassification = Object.fromEntries(
    CLASSIFICATIONS.map((classification) => [
      classification,
      0,
    ]),
  ) as Record<ImportRowClassification, number>;

  let warnings = 0;

  for (const row of rows) {
    byClassification[row.classification] += 1;
    warnings += row.warnings.length;
  }

  const dataRows = byClassification.data;
  const totalRows = rows.length;

  return {
    totalRows,
    dataRows,
    skippedRows: totalRows - dataRows,
    warnings,
    byClassification,
  };
}

function resolveAdapter<TRow>(
  sheet: RawSheet,
  adapterKey?: ImportAdapterKey,
): ImportAdapter<TRow> | null {
  if (adapterKey) {
    return getAdapter<TRow>(adapterKey);
  }

  return detectAdapter(sheet) as ImportAdapter<TRow> | null;
}
