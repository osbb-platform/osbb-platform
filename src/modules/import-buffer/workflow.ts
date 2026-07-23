import {
  buildDebtorsMonthTransferRows,
} from "./debtors1cTransfer";
import type {
  PeriodGuess,
} from "./types";
import type {
  DebtorsMonthTransferGateway,
  ImportBufferPreview,
  ImportBufferRepository,
} from "./workflowTypes";

export type WorkflowResult<TValue> =
  | {
      ok: true;
      value: TValue;
    }
  | {
      ok: false;
      error: string;
    };

export async function confirmImportBufferPeriod(
  repository: ImportBufferRepository,
  params: {
    uploadId: string;
    year: number;
    month: number;
    expectedLockVersion: number;
  },
): Promise<WorkflowResult<unknown>> {
  const period = normalizeConfirmedPeriod(
    params.year,
    params.month,
  );

  if (!period.ok) {
    return period;
  }

  const upload = await repository.getUpload(params.uploadId);

  if (!upload) {
    return {
      ok: false,
      error: "Буфер імпорту не знайдено.",
    };
  }

  if (upload.status !== "parsed") {
    return {
      ok: false,
      error:
        "Період можна підтвердити лише для обробленого файлу.",
    };
  }

  if (upload.lockVersion !== params.expectedLockVersion) {
    return {
      ok: false,
      error: "Дані застаріли, оновіть буфер імпорту.",
    };
  }

  const confirmed = await repository.confirmPeriod({
    uploadId: params.uploadId,
    period: period.value,
    expectedLockVersion: params.expectedLockVersion,
  });

  return {
    ok: true,
    value: confirmed,
  };
}

export async function discardImportBuffer(
  repository: ImportBufferRepository,
  params: {
    uploadId: string;
    expectedLockVersion: number;
  },
): Promise<WorkflowResult<unknown>> {
  const upload = await repository.getUpload(params.uploadId);

  if (!upload) {
    return {
      ok: false,
      error: "Буфер імпорту не знайдено.",
    };
  }

  if (
    upload.status === "transferred" ||
    upload.status === "discarded"
  ) {
    return {
      ok: false,
      error:
        "Завершений буфер не можна скасувати повторно.",
    };
  }

  if (upload.lockVersion !== params.expectedLockVersion) {
    return {
      ok: false,
      error: "Дані застаріли, оновіть буфер імпорту.",
    };
  }

  const discarded = await repository.discard({
    uploadId: params.uploadId,
    expectedLockVersion: params.expectedLockVersion,
  });

  return {
    ok: true,
    value: discarded,
  };
}

export async function transferImportBufferToDebtors(
  repository: ImportBufferRepository,
  gateway: DebtorsMonthTransferGateway,
  params: {
    uploadId: string;
    expectedLockVersion: number;
    preview: ImportBufferPreview;
  },
): Promise<WorkflowResult<{ snapshotId: string }>> {
  const upload = await repository.getUpload(params.uploadId);

  if (!upload) {
    return {
      ok: false,
      error: "Буфер імпорту не знайдено.",
    };
  }

  if (upload.status !== "confirmed") {
    return {
      ok: false,
      error:
        "Перед передачею підтвердьте місяць і рік.",
    };
  }

  if (upload.lockVersion !== params.expectedLockVersion) {
    return {
      ok: false,
      error: "Дані застаріли, оновіть буфер імпорту.",
    };
  }

  const period = upload.confirmedPeriod;

  if (!period) {
    return {
      ok: false,
      error:
        "Підтверджений період буфера відсутній.",
    };
  }

  const transferRows = buildDebtorsMonthTransferRows(
    params.preview.reconciliation,
  );

  if (!transferRows.ok) {
    return transferRows;
  }

  const transfer = await gateway.importMonthDraft({
    houseId: upload.houseId,
    periodYear: period.year,
    periodMonth: period.month,
    source: "buffer_1c",
    importMeta: {
      importBufferUploadId: upload.id,
      adapterKey: upload.adapterKey,
      detectedPeriod: upload.detectedPeriod,
      confirmedPeriod: upload.confirmedPeriod,
      rowsCount: transferRows.rows.length,
      reconciliationWarnings:
        params.preview.reconciliation.warningCount,
      registryAccountsMissingFromFile:
        params.preview.reconciliation
          .registryAccountsMissingFromFile,
    },
    rows: transferRows.rows,
  });

  if (!transfer.ok) {
    return transfer;
  }

  await repository.markTransferred({
    uploadId: upload.id,
    expectedLockVersion: upload.lockVersion,
    snapshotId: transfer.snapshotId,
  });

  return {
    ok: true,
    value: {
      snapshotId: transfer.snapshotId,
    },
  };
}

function normalizeConfirmedPeriod(
  year: number,
  month: number,
): WorkflowResult<PeriodGuess> {
  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    return {
      ok: false,
      error:
        "Вкажіть коректний місяць і рік з 2000 до 2100.",
    };
  }

  return {
    ok: true,
    value: {
      year,
      month,
      sourceText: "confirmed_by_admin",
    },
  };
}
