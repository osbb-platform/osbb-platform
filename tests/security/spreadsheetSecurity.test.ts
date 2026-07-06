import {
  File as NodeFile,
} from "node:buffer";

import {
  readFileSync,
} from "node:fs";

import {
  resolve,
} from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  parseApartmentsImportFile,
} from "@/src/modules/apartments/utils/parseApartmentsImportFile";

import {
  parseDebtorsImportFile,
} from "@/src/modules/houses/utils/debtorsSpreadsheet";

import {
  escapeSpreadsheetFormula,
  SPREADSHEET_MAX_CELLS,
  SPREADSHEET_MAX_COLUMNS,
  SPREADSHEET_MAX_DATA_ROWS,
  SPREADSHEET_MAX_FILE_BYTES,
} from "@/src/shared/utils/spreadsheets/spreadsheetSecurity";

function fixture(
  name: string,
) {
  return readFileSync(
    resolve(
      process.cwd(),
      "tests/fixtures/spreadsheets",
      name,
    ),
  );
}

function browserFile(
  data: string | Uint8Array,
  name: string,
  type: string,
): File {
  return new NodeFile(
    [data],
    name,
    {
      type,
    },
  ) as unknown as File;
}

describe(
  "S1.T8 spreadsheet security",
  () => {
    it(
      "locks official SheetJS 0.20.3",
      () => {
        const lock = JSON.parse(
          readFileSync(
            resolve(
              process.cwd(),
              "package-lock.json",
            ),
            "utf8",
          ),
        ) as {
          packages?: Record<
            string,
            {
              version?: string;
              resolved?: string;
            }
          >;
        };

        const xlsx =
          lock.packages?.[
            "node_modules/xlsx"
          ];

        expect(xlsx?.version)
          .toBe("0.20.3");

        expect(xlsx?.resolved)
          .toContain(
            "cdn.sheetjs.com/xlsx-0.20.3",
          );
      },
    );

    it(
      "parses real UTF-8 CSV",
      async () => {
        const result =
          await parseApartmentsImportFile(
            browserFile(
              fixture(
                "apartments-valid.csv",
              ),
              "apartments-valid.csv",
              "text/csv",
            ),
          );

        expect(result.totalRows).toBe(2);

        expect(result.rows[0]).toEqual({
          accountNumber: "ACC-001",
          apartmentLabel: "1",
          ownerName:
            "Іваненко Іван",
          area: "45,5",
        });
      },
    );

    it(
      "parses real XLSX",
      async () => {
        const result =
          await parseApartmentsImportFile(
            browserFile(
              fixture(
                "apartments-valid.xlsx",
              ),
              "apartments-valid.xlsx",
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ),
          );

        expect(result.totalRows).toBe(2);
      },
    );

    it(
      "parses real debtors XLS",
      async () => {
        const result =
          await parseDebtorsImportFile({
            file: browserFile(
              fixture(
                "debtors-valid.xls",
              ),
              "debtors-valid.xls",
              "application/vnd.ms-excel",
            ),
            referenceRows: [
              {
                apartmentLabel: "1",
                accountNumber:
                  "ACC-001",
                ownerName:
                  "Іваненко Іван",
                area: "45,5",
                amount: "",
                days: "",
              },
              {
                apartmentLabel: "2",
                accountNumber:
                  "ACC-002",
                ownerName:
                  "Петренко Олена",
                area: "52",
                amount: "",
                days: "",
              },
            ],
          });

        expect(result.totalRows).toBe(2);

        expect(result.rows[0]?.amount)
          .toBe("-500.25");
      },
    );

    it(
      "rejects files larger than 5 MB",
      async () => {
        await expect(
          parseApartmentsImportFile(
            browserFile(
              new Uint8Array(
                SPREADSHEET_MAX_FILE_BYTES
                  + 1,
              ),
              "large.csv",
              "text/csv",
            ),
          ),
        ).rejects.toThrow(
          "Максимальний розмір — 5 МБ",
        );
      },
    );

    it(
      "rejects invalid MIME and XLSX signature",
      async () => {
        await expect(
          parseApartmentsImportFile(
            browserFile(
              "not xlsx",
              "bad.xlsx",
              "text/plain",
            ),
          ),
        ).rejects.toThrow(
          "Тип файлу не відповідає",
        );

        await expect(
          parseApartmentsImportFile(
            browserFile(
              "not xlsx",
              "bad.xlsx",
              "application/octet-stream",
            ),
          ),
        ).rejects.toThrow(
          "XLSX має некоректний формат",
        );
      },
    );

    it(
      "enforces row and column limits",
      async () => {
        const header =
          "Особовий рахунок,Квартира,Власник,Площа";

        const rows = Array.from(
          {
            length:
              SPREADSHEET_MAX_DATA_ROWS
              + 1,
          },
          (_, index) =>
            `ACC-${index},${index + 1},Owner ${index},50`,
        );

        await expect(
          parseApartmentsImportFile(
            browserFile(
              [
                header,
                ...rows,
              ].join("\n"),
              "rows.csv",
              "text/csv",
            ),
          ),
        ).rejects.toThrow(
          `більше ${SPREADSHEET_MAX_DATA_ROWS} рядків`,
        );

        const headers = [
          "Особовий рахунок",
          "Квартира",
          "Власник",
          "Площа",
          ...Array.from(
            {
              length:
                SPREADSHEET_MAX_COLUMNS
                - 3,
            },
            (_, index) =>
              `Extra ${index}`,
          ),
        ];

        await expect(
          parseApartmentsImportFile(
            browserFile(
              [
                headers.join(","),
                [
                  "ACC-1",
                  "1",
                  "Owner",
                  "50",
                ].join(","),
              ].join("\n"),
              "columns.csv",
              "text/csv",
            ),
          ),
        ).rejects.toThrow(
          `більше ${SPREADSHEET_MAX_COLUMNS} колонок`,
        );
      },
    );

    it(
      "enforces cell limit",
      async () => {
        const headers = [
          "Особовий рахунок",
          "Квартира",
          "Власник",
          "Площа",
          ...Array.from(
            {
              length: 47,
            },
            (_, index) =>
              `Extra ${index}`,
          ),
        ];

        const rows = Array.from(
          {
            length: 2_000,
          },
          (_, index) => [
            `ACC-${index}`,
            String(index + 1),
            `Owner ${index}`,
            "50",
            ...Array.from(
              {
                length: 47,
              },
              () => "x",
            ),
          ].join(","),
        );

        expect(
          (rows.length + 1)
            * headers.length,
        ).toBeGreaterThan(
          SPREADSHEET_MAX_CELLS,
        );

        await expect(
          parseApartmentsImportFile(
            browserFile(
              [
                headers.join(","),
                ...rows,
              ].join("\n"),
              "cells.csv",
              "text/csv",
            ),
          ),
        ).rejects.toThrow(
          `більше ${SPREADSHEET_MAX_CELLS} комірок`,
        );
      },
    );

    it(
      "escapes formula prefixes in exports",
      () => {
        expect(
          escapeSpreadsheetFormula(
            "=SUM(A1:A2)",
          ),
        ).toBe(
          "'=SUM(A1:A2)",
        );

        expect(
          escapeSpreadsheetFormula(
            "  +cmd",
          ),
        ).toBe(
          "'  +cmd",
        );

        expect(
          escapeSpreadsheetFormula(
            "-payload",
          ),
        ).toBe(
          "'-payload",
        );

        expect(
          escapeSpreadsheetFormula(
            "@payload",
          ),
        ).toBe(
          "'@payload",
        );

        expect(
          escapeSpreadsheetFormula(
            "Safe",
          ),
        ).toBe("Safe");
      },
    );

    it(
      "wires formula escaping into both exports",
      () => {
        const apartments =
          readFileSync(
            resolve(
              process.cwd(),
              "src/modules/apartments/utils/apartmentsSpreadsheet.ts",
            ),
            "utf8",
          );

        const debtors =
          readFileSync(
            resolve(
              process.cwd(),
              "src/modules/houses/utils/debtorsSpreadsheet.ts",
            ),
            "utf8",
          );

        expect(apartments)
          .toContain(
            "escapeSpreadsheetFormula(item.owner_name)",
          );

        expect(debtors)
          .toContain(
            "escapeSpreadsheetFormula(row.ownerName)",
          );
      },
    );
  },
);
