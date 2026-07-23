export const IMPORT_BUFFER_MAX_FILE_SIZE = 15 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  "xls",
  "xlsx",
]);

const ALLOWED_MIME_TYPES = new Set([
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
  "",
]);

export interface ImportFileDescriptor {
  name: string;
  size: number;
  type: string;
}

export type ImportFileSecurityResult =
  | {
      ok: true;
      extension: "xls" | "xlsx";
    }
  | {
      ok: false;
      error: string;
    };

export function validateImportFileDescriptor(
  file: ImportFileDescriptor,
): ImportFileSecurityResult {
  const name = file.name.trim();
  const extension = name.split(".").pop()?.toLowerCase() ?? "";

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return {
      ok: false,
      error: "Підтримуються лише файли XLS та XLSX.",
    };
  }

  if (
    !Number.isInteger(file.size) ||
    file.size <= 0 ||
    file.size > IMPORT_BUFFER_MAX_FILE_SIZE
  ) {
    return {
      ok: false,
      error: "Файл має бути непорожнім і не перевищувати 15 МБ.",
    };
  }

  if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
    return {
      ok: false,
      error: "Тип файлу не відповідає формату XLS або XLSX.",
    };
  }

  return {
    ok: true,
    extension: extension as "xls" | "xlsx",
  };
}
