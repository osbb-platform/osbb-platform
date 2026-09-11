import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  getApartmentsImportHeaders,
  parseApartmentsImportFile,
} from "@/src/modules/apartments/utils/parseApartmentsImportFile";
import { getDebtorsImportHeaders } from "@/src/modules/houses/utils/debtorsSpreadsheet";
import { serializeAdminPollExportCsv } from "@/src/modules/houses/services/pollResultsModel";

function buildXlsxFile(rows: unknown[][], fileName = "import.xlsx") {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return new File([buffer], fileName, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe("Track 4 sweep: apartments/debtors CSV+XLSX headers follow object_kind", () => {
  it("getApartmentsImportHeaders uses Квартира for apartment_building and Ділянка for garden_association", () => {
    expect(getApartmentsImportHeaders("apartment_building")).toEqual([
      "Особовий рахунок",
      "Квартира",
      "Власник",
      "Площа",
    ]);
    expect(getApartmentsImportHeaders("garden_association")).toEqual([
      "Особовий рахунок",
      "Ділянка",
      "Власник",
      "Площа",
    ]);
  });

  it("getDebtorsImportHeaders uses Квартира for apartment_building and Ділянка for garden_association", () => {
    expect(getDebtorsImportHeaders("apartment_building")[0]).toBe("Квартира");
    expect(getDebtorsImportHeaders("garden_association")[0]).toBe("Ділянка");
  });

  it("parses an apartments import file with the apartment_building header", async () => {
    const file = buildXlsxFile([
      ["Особовий рахунок", "Квартира", "Власник", "Площа"],
      ["100245", "24", "Іван Іванов", "45,5"],
    ]);

    const result = await parseApartmentsImportFile(file, "apartment_building");
    expect(result.rows).toEqual([
      {
        accountNumber: "100245",
        apartmentLabel: "24",
        ownerName: "Іван Іванов",
        area: "45,5",
      },
    ]);
  });

  it("parses an apartments import file with the garden_association header (Ділянка)", async () => {
    const file = buildXlsxFile([
      ["Особовий рахунок", "Ділянка", "Власник", "Площа"],
      ["200311", "7", "Марія Петренко", "6"],
    ]);

    const result = await parseApartmentsImportFile(file, "garden_association");
    expect(result.rows).toEqual([
      {
        accountNumber: "200311",
        apartmentLabel: "7",
        ownerName: "Марія Петренко",
        area: "6",
      },
    ]);
  });

  it("still accepts a legacy Квартира-headed file for a house reclassified as garden_association", async () => {
    const file = buildXlsxFile([
      ["Особовий рахунок", "Квартира", "Власник", "Площа"],
      ["300099", "3", "Олег Ткаченко", "10"],
    ]);

    const result = await parseApartmentsImportFile(file, "garden_association");
    expect(result.totalRows).toBe(1);
  });

  it("rejects a file missing the unit-label column with a message naming the house's own terminology", async () => {
    const file = buildXlsxFile([
      ["Особовий рахунок", "Власник", "Площа"],
      ["100245", "Іван Іванов", "45,5"],
    ]);

    await expect(
      parseApartmentsImportFile(file, "garden_association"),
    ).rejects.toThrow(/Ділянка/);
  });

  it("serializeAdminPollExportCsv poll export header follows the house's object_kind", () => {
    const apartmentCsv = serializeAdminPollExportCsv({
      identityMode: "open",
      rows: [
        {
          apartmentLabel: "12",
          ownerName: "Іван",
          question: "Q1",
          questionType: "single_choice",
          answer: "Так",
        },
      ],
      objectKind: "apartment_building",
    });
    expect(apartmentCsv).toContain("Квартира");

    const gardenCsv = serializeAdminPollExportCsv({
      identityMode: "open",
      rows: [
        {
          apartmentLabel: "12",
          ownerName: "Іван",
          question: "Q1",
          questionType: "single_choice",
          answer: "Так",
        },
      ],
      objectKind: "garden_association",
    });
    expect(gardenCsv).toContain("Ділянка");
    expect(gardenCsv).not.toContain("Квартира");
  });
});
