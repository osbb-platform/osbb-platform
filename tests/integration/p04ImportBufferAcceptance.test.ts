import { describe, expect, it, vi } from "vitest";

import {
  buildDebtorsMonthTransferRows,
  confirmImportBufferPeriod,
  discardImportBuffer,
  reconcileDebtors1cRows,
  transferImportBufferToDebtors,
  validateImportFileDescriptor,
} from "../../src/modules/import-buffer";
import type { Debtors1cRow } from "../../src/modules/import-buffer/adapters/debtors1c";
import type {
  ImportBufferPreview,
  ImportBufferRepository,
  ImportBufferUploadRecord,
  ParsedDebtors1cPreviewInput,
} from "../../src/modules/import-buffer";

function createSourceRow(accountNumber: string, debtValue = 100): Debtors1cRow {
  return {
    accountNumberRaw: `л/с №${accountNumber}`,
    accountNumberNormalized: accountNumber,
    apartmentLabel: "1",
    ownerName: "Власник",
    area: 50,
    openingBalance: debtValue,
    accrued: 0,
    paid: 0,
    closingBalance: debtValue,
    debtValue,
    osbbBalance: -debtValue,
  };
}

function createParsedInput(
  accounts: readonly string[],
): ParsedDebtors1cPreviewInput {
  return {
    period: {
      year: 2026,
      month: 5,
      sourceText: "за Травень 2026 р.",
    },
    rows: accounts.map((account, index) => ({
      rowIndex: index + 11,
      classification: "data" as const,
      value: createSourceRow(account),
      warnings: [],
    })),
  };
}

function createUpload(
  overrides: Partial<ImportBufferUploadRecord> = {},
): ImportBufferUploadRecord {
  return {
    id: "upload-1",
    houseId: "house-1",
    adapterKey: "debtors_1c",
    status: "confirmed",
    detectedPeriod: {
      year: 2026,
      month: 5,
      sourceText: "за Травень 2026 р.",
    },
    confirmedPeriod: {
      year: 2026,
      month: 5,
      sourceText: "confirmed_by_admin",
    },
    lockVersion: 3,
    ...overrides,
  };
}

function createRepository(
  upload: ImportBufferUploadRecord | null,
): ImportBufferRepository {
  return {
    getUpload: vi.fn(async () => upload),
    confirmPeriod: vi.fn(async ({ period }) =>
      createUpload({
        status: "confirmed",
        confirmedPeriod: period,
        lockVersion: 4,
      }),
    ),
    discard: vi.fn(async () =>
      createUpload({
        status: "discarded",
        lockVersion: 4,
      }),
    ),
    markTransferred: vi.fn(async () =>
      createUpload({
        status: "transferred",
        lockVersion: 4,
      }),
    ),
  };
}

describe("P04 final acceptance", () => {
  it("accepts only XLS/XLSX files within 15 MB", () => {
    expect(
      validateImportFileDescriptor({
        name: "debtors.xls",
        size: 55_808,
        type: "application/vnd.ms-excel",
      }),
    ).toEqual({
      ok: true,
      extension: "xls",
    });

    for (const invalid of [
      {
        name: "debtors.csv",
        size: 100,
        type: "text/csv",
      },
      {
        name: "debtors.xlsx",
        size: 0,
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
      {
        name: "debtors.xlsx",
        size: 15 * 1024 * 1024 + 1,
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
      {
        name: "debtors.xlsx",
        size: 100,
        type: "application/pdf",
      },
    ]) {
      expect(validateImportFileDescriptor(invalid).ok).toBe(false);
    }
  });

  it("keeps unmatched source accounts visible without blocking matched rows", () => {
    const parsed = createParsedInput(["609740004", "UNKNOWN"]);

    const reconciliation = reconcileDebtors1cRows(parsed, [
      {
        id: "apartment-1",
        accountNumber: "609740004",
        apartmentLabel: "1",
        ownerName: "Власник",
        area: 50,
      },
    ]);

    expect(reconciliation.blocked).toBe(false);
    expect(reconciliation.unknownSourceAccountNumbers).toEqual(["UNKNOWN"]);

    const transfer = buildDebtorsMonthTransferRows(reconciliation);

    expect(transfer.ok).toBe(true);

    if (transfer.ok) {
      expect(transfer.rows).toHaveLength(1);
      expect(transfer.rows[0]?.accountNumber).toBe("609740004");
    }
  });

  it("keeps apartment label, owner and area differences as warnings", () => {
    const reconciliation = reconcileDebtors1cRows(
      createParsedInput(["609740004"]),
      [
        {
          id: "apartment-1",
          accountNumber: "609740004",
          apartmentLabel: "01",
          ownerName: "Інший власник",
          area: 51,
        },
      ],
    );

    expect(reconciliation.blocked).toBe(false);
    expect(reconciliation.warningCount).toBe(3);

    const row = reconciliation.rows[0];
    expect(row.classification).toBe("data");

    if (row.classification !== "data") return;

    expect(row.matchStatus).toBe("matched");
    expect(row.warnings.map((warning) => warning.code)).toEqual([
      "APARTMENT_LABEL_MISMATCH",
      "OWNER_NAME_MISMATCH",
      "AREA_MISMATCH",
    ]);
  });

  it("treats registry accounts absent from file as warnings, not blockers", () => {
    const reconciliation = reconcileDebtors1cRows(
      createParsedInput(["609740004"]),
      [
        {
          id: "apartment-1",
          accountNumber: "609740004",
          apartmentLabel: "1",
          ownerName: "Власник",
          area: 50,
        },
        {
          id: "apartment-2",
          accountNumber: "609740005",
          apartmentLabel: "2",
          ownerName: "Другий власник",
          area: 60,
        },
      ],
    );

    expect(reconciliation.blocked).toBe(false);
    expect(reconciliation.registryAccountsMissingFromFile).toEqual([
      "609740005",
    ]);
  });

  it("rejects stale period confirmation", async () => {
    const repository = createRepository(
      createUpload({
        status: "parsed",
        confirmedPeriod: null,
        lockVersion: 7,
      }),
    );

    const result = await confirmImportBufferPeriod(repository, {
      uploadId: "upload-1",
      year: 2026,
      month: 5,
      expectedLockVersion: 6,
    });

    expect(result).toEqual({
      ok: false,
      error: "Дані застаріли, оновіть буфер імпорту.",
    });
    expect(repository.confirmPeriod).not.toHaveBeenCalled();
  });

  it("rejects discard for completed buffers", async () => {
    for (const status of ["transferred", "discarded"] as const) {
      const repository = createRepository(createUpload({ status }));

      const result = await discardImportBuffer(repository, {
        uploadId: "upload-1",
        expectedLockVersion: 3,
      });

      expect(result).toEqual({
        ok: false,
        error: "Завершений буфер не можна скасувати повторно.",
      });
      expect(repository.discard).not.toHaveBeenCalled();
    }
  });

  it("rejects transfer before period confirmation", async () => {
    const repository = createRepository(
      createUpload({
        status: "parsed",
        confirmedPeriod: null,
      }),
    );

    const gateway = {
      importMonthDraft: vi.fn(),
    };

    const preview: ImportBufferPreview = {
      adapterKey: "debtors_1c",
      detectedPeriod: {
        year: 2026,
        month: 5,
        sourceText: "за Травень 2026 р.",
      },
      confirmedPeriod: null,
      reconciliation: reconcileDebtors1cRows(createParsedInput(["609740004"]), [
        {
          id: "apartment-1",
          accountNumber: "609740004",
          apartmentLabel: "1",
          ownerName: "Власник",
          area: 50,
        },
      ]),
    };

    const result = await transferImportBufferToDebtors(repository, gateway, {
      uploadId: "upload-1",
      expectedLockVersion: 3,
      preview,
    });

    expect(result).toEqual({
      ok: false,
      error: "Перед передачею підтвердьте місяць і рік.",
    });
    expect(gateway.importMonthDraft).not.toHaveBeenCalled();
  });

  it("transfers exact P03 payload and marks staging transferred", async () => {
    const reconciliation = reconcileDebtors1cRows(
      createParsedInput(["609740004"]),
      [
        {
          id: "apartment-1",
          accountNumber: "609740004",
          apartmentLabel: "1",
          ownerName: "Власник",
          area: 50,
        },
      ],
    );

    const preview: ImportBufferPreview = {
      adapterKey: "debtors_1c",
      detectedPeriod: {
        year: 2026,
        month: 5,
        sourceText: "за Травень 2026 р.",
      },
      confirmedPeriod: {
        year: 2026,
        month: 5,
        sourceText: "confirmed_by_admin",
      },
      reconciliation,
    };

    const repository = createRepository(createUpload());
    const gateway = {
      importMonthDraft: vi.fn(async () => ({
        ok: true as const,
        snapshotId: "snapshot-1",
      })),
    };

    const result = await transferImportBufferToDebtors(repository, gateway, {
      uploadId: "upload-1",
      expectedLockVersion: 3,
      preview,
    });

    expect(result).toEqual({
      ok: true,
      value: {
        snapshotId: "snapshot-1",
      },
    });

    expect(gateway.importMonthDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        houseId: "house-1",
        periodYear: 2026,
        periodMonth: 5,
        source: "buffer_1c",
        rows: [
          {
            accountNumber: "609740004",
            accrued: 0,
            paid: 0,
            closingBalance: -100,
            debtSourceValue: 100,
          },
        ],
      }),
    );

    expect(repository.markTransferred).toHaveBeenCalledWith({
      uploadId: "upload-1",
      expectedLockVersion: 3,
      snapshotId: "snapshot-1",
    });
  });

  it("does not mutate source identity fields during transfer", () => {
    const source = createSourceRow("609740004");
    source.apartmentLabel = "1-A";
    source.ownerName = "ПІБ з 1С";
    source.area = 49.75;

    const reconciliation = reconcileDebtors1cRows(
      {
        period: {
          year: 2026,
          month: 5,
          sourceText: "fixture",
        },
        rows: [
          {
            rowIndex: 11,
            classification: "data",
            value: source,
            warnings: [],
          },
        ],
      },
      [
        {
          id: "apartment-1",
          accountNumber: "609740004",
          apartmentLabel: "1",
          ownerName: "ПІБ з реєстру",
          area: 50,
        },
      ],
    );

    const row = reconciliation.rows[0];
    expect(row.classification).toBe("data");

    if (row.classification !== "data") return;

    expect(row.source.apartmentLabel).toBe("1-A");
    expect(row.source.ownerName).toBe("ПІБ з 1С");
    expect(row.source.area).toBe(49.75);
  });
});
