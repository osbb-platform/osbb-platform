import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  buildDebtorsMonthTransferRows,
  confirmImportBufferPeriod,
  discardImportBuffer,
  reconcileDebtors1cRows,
  transferImportBufferToDebtors,
  validateImportFileDescriptor,
} from "../../src/modules/import-buffer";
import type {
  Debtors1cRow,
} from "../../src/modules/import-buffer/adapters/debtors1c";
import type {
  ImportBufferPreview,
  ImportBufferRepository,
  ImportBufferUploadRecord,
  ParsedDebtors1cPreviewInput,
} from "../../src/modules/import-buffer";

const sourceRow: Debtors1cRow = {
  accountNumberRaw: "л/с №609740004",
  accountNumberNormalized: "609740004",
  apartmentLabel: "1",
  ownerName: "Тестовий Власник",
  area: 45.5,
  openingBalance: 100,
  accrued: 20,
  paid: 10,
  closingBalance: 110,
  debtValue: 110,
  osbbBalance: -110,
};

const parsedInput: ParsedDebtors1cPreviewInput = {
  period: {
    year: 2026,
    month: 5,
    sourceText: "за Травень 2026 р.",
  },
  rows: [
    {
      rowIndex: 11,
      classification: "data",
      value: sourceRow,
      warnings: [],
    },
    {
      rowIndex: 12,
      classification: "skip_total",
      value: null,
      warnings: [],
    },
  ],
};

function createUpload(
  overrides: Partial<ImportBufferUploadRecord> = {},
): ImportBufferUploadRecord {
  return {
    id: "upload-1",
    houseId: "house-1",
    adapterKey: "debtors_1c",
    status: "confirmed",
    detectedPeriod: parsedInput.period,
    confirmedPeriod: parsedInput.period,
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

describe("P04 import-buffer T5 workflow", () => {
  it("enforces file extension, MIME and 15 MB limit", () => {
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

    expect(
      validateImportFileDescriptor({
        name: "debtors.csv",
        size: 100,
        type: "text/csv",
      }).ok,
    ).toBe(false);

    expect(
      validateImportFileDescriptor({
        name: "debtors.xlsx",
        size: 15 * 1024 * 1024 + 1,
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }).ok,
    ).toBe(false);
  });

  it("matches by account and keeps registry fields authoritative", () => {
    const result = reconcileDebtors1cRows(
      parsedInput,
      [
        {
          id: "apartment-1",
          accountNumber: "609740004",
          apartmentLabel: "01",
          ownerName: "Інший власник",
          area: 46,
        },
        {
          id: "apartment-2",
          accountNumber: "609740005",
          apartmentLabel: "2",
          ownerName: "Другий власник",
          area: 50,
        },
      ],
    );

    expect(result.blocked).toBe(false);
    expect(result.matchedCount).toBe(1);
    expect(result.warningCount).toBe(3);
    expect(
      result.registryAccountsMissingFromFile,
    ).toEqual(["609740005"]);

    const matched = result.rows[0];

    expect(matched.classification).toBe("data");

    if (matched.classification !== "data") {
      return;
    }

    expect(matched.matchedApartmentId).toBe(
      "apartment-1",
    );
    expect(matched.warnings.map((item) => item.code))
      .toEqual([
        "APARTMENT_LABEL_MISMATCH",
        "OWNER_NAME_MISMATCH",
        "AREA_MISMATCH",
      ]);
    expect(matched.source.ownerName).toBe(
      "Тестовий Власник",
    );
  });

  it("blocks the whole transfer for an unknown source account", () => {
    const reconciliation = reconcileDebtors1cRows(
      parsedInput,
      [],
    );

    expect(reconciliation.blocked).toBe(true);
    expect(
      reconciliation.unknownSourceAccountNumbers,
    ).toEqual(["609740004"]);

    expect(
      buildDebtorsMonthTransferRows(reconciliation),
    ).toEqual({
      ok: false,
      error:
        "Файл містить невідомі особові рахунки. Передача не виконана.",
    });
  });

  it("maps debt sign once and preserves source debt", () => {
    const reconciliation = reconcileDebtors1cRows(
      parsedInput,
      [
        {
          id: "apartment-1",
          accountNumber: "609740004",
          apartmentLabel: "1",
          ownerName: "Тестовий Власник",
          area: 45.5,
        },
      ],
    );

    expect(
      buildDebtorsMonthTransferRows(reconciliation),
    ).toEqual({
      ok: true,
      rows: [
        {
          accountNumber: "609740004",
          accrued: 20,
          paid: 10,
          closingBalance: -110,
          debtSourceValue: 110,
        },
      ],
    });
  });

  it("confirms period only for parsed current uploads", async () => {
    const repository = createRepository(
      createUpload({
        status: "parsed",
        confirmedPeriod: null,
      }),
    );

    const result = await confirmImportBufferPeriod(
      repository,
      {
        uploadId: "upload-1",
        year: 2026,
        month: 5,
        expectedLockVersion: 3,
      },
    );

    expect(result.ok).toBe(true);
    expect(repository.confirmPeriod).toHaveBeenCalledWith({
      uploadId: "upload-1",
      period: {
        year: 2026,
        month: 5,
        sourceText: "confirmed_by_admin",
      },
      expectedLockVersion: 3,
    });
  });

  it("rejects stale discard attempts", async () => {
    const repository = createRepository(
      createUpload({
        status: "parsed",
        lockVersion: 5,
      }),
    );

    const result = await discardImportBuffer(
      repository,
      {
        uploadId: "upload-1",
        expectedLockVersion: 4,
      },
    );

    expect(result).toEqual({
      ok: false,
      error: "Дані застаріли, оновіть буфер імпорту.",
    });
    expect(repository.discard).not.toHaveBeenCalled();
  });

  it("transfers only a confirmed fully matched buffer", async () => {
    const reconciliation = reconcileDebtors1cRows(
      parsedInput,
      [
        {
          id: "apartment-1",
          accountNumber: "609740004",
          apartmentLabel: "1",
          ownerName: "Тестовий Власник",
          area: 45.5,
        },
      ],
    );

    const preview: ImportBufferPreview = {
      adapterKey: "debtors_1c",
      detectedPeriod: parsedInput.period,
      confirmedPeriod: parsedInput.period,
      reconciliation,
    };

    const repository = createRepository(createUpload());
    const gateway = {
      importMonthDraft: vi.fn(async () => ({
        ok: true as const,
        snapshotId: "snapshot-1",
      })),
    };

    const result = await transferImportBufferToDebtors(
      repository,
      gateway,
      {
        uploadId: "upload-1",
        expectedLockVersion: 3,
        preview,
      },
    );

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
            accrued: 20,
            paid: 10,
            closingBalance: -110,
            debtSourceValue: 110,
          },
        ],
      }),
    );

    expect(repository.markTransferred)
      .toHaveBeenCalledWith({
        uploadId: "upload-1",
        expectedLockVersion: 3,
        snapshotId: "snapshot-1",
      });
  });
});
