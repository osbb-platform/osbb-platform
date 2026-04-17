import * as XLSX from "xlsx";
import type { AdminHouseApartmentListItem } from "@/src/modules/apartments/services/getAdminHouseApartments";
import { APARTMENTS_IMPORT_HEADERS } from "@/src/modules/apartments/utils/parseApartmentsImportFile";

function saveWorkbook(workbook: XLSX.WorkBook, fileName: string) {
  XLSX.writeFile(workbook, fileName);
}

function formatAreaForSheet(value: number | null) {
  if (value === null || value === undefined) {
    return "";
  }

  return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
}

export function downloadApartmentsImportTemplate() {
  const rows = [
    [...APARTMENTS_IMPORT_HEADERS],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Квартиры");

  saveWorkbook(workbook, "apartments-import-template.xlsx");
}

export function exportApartmentsRegistry(params: {
  houseName: string;
  items: AdminHouseApartmentListItem[];
}) {
  const { houseName, items } = params;

  const rows = items.map((item) => ({
    "Квартира": item.apartment_label,
    "Лицевой счет": item.account_number,
    "Владелец": item.owner_name,
    "Квадраты": formatAreaForSheet(item.area),
    "Источник": item.source_type === "import" ? "Импорт" : "Вручную",
    "Дата создания": item.created_at,
    "Дата обновления": item.updated_at,
    "Архивирована": item.archived_at ?? "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Реестр квартир");

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
