import * as XLSX from "xlsx";
import type { AdminHouseApartmentListItem } from "@/src/modules/apartments/services/getAdminHouseApartments";
import { getApartmentsImportHeaders } from "@/src/modules/apartments/utils/parseApartmentsImportFile";
import { getHouseUnitTerminology } from "@/src/shared/utils/houses/houseUnitTerminology";

function saveWorkbook(workbook: XLSX.WorkBook, fileName: string) {
  XLSX.writeFile(workbook, fileName);
}

function formatAreaForSheet(value: number | null) {
  if (value === null || value === undefined) {
    return "";
  }

  return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
}

export function downloadApartmentsImportTemplate(objectKind?: unknown) {
  const terms = getHouseUnitTerminology(objectKind);
  const rows = [getApartmentsImportHeaders(objectKind)];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, terms.nominativePluralLower);

  saveWorkbook(workbook, "apartments-import-template.xlsx");
}

export function exportApartmentsRegistry(params: {
  houseName: string;
  items: AdminHouseApartmentListItem[];
  objectKind?: unknown;
}) {
  const { houseName, items, objectKind } = params;
  const terms = getHouseUnitTerminology(objectKind);

  const rows = items.map((item) => ({
    [terms.full]: item.apartment_label,
    "Особовий рахунок": item.account_number,
    "Власник": item.owner_name,
    "Площа": formatAreaForSheet(item.area),
    "Джерело": item.source_type === "import" ? "Імпорт" : "Вручну",
    "Дата створення": item.created_at,
    "Дата оновлення": item.updated_at,
    "Архівовано": item.archived_at ?? "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    `Реєстр ${terms.genitivePluralLower}`,
  );

  const safeHouseName = houseName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9а-яА-ЯіїєґІЇЄҐ_-]/g, "");

  saveWorkbook(
    workbook,
    `apartments-registry-${safeHouseName || "house"}.xlsx`,
  );
}
