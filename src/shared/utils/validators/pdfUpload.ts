export const MAX_PDF_FILE_SIZE_BYTES = 15 * 1024 * 1024;
export const MAX_PDF_FILE_SIZE_LABEL = "15 МБ";

type SinglePdfValidationOptions = {
  required?: boolean;
  requiredMessage?: string;
};

type MultiplePdfValidationOptions = {
  maxCount?: number;
  maxCountMessage?: string;
};

type PdfValidationResult = {
  isValid: boolean;
  error: string | null;
};

function isPdfFile(file: File) {
  const fileName = file.name.toLowerCase();
  return file.type === "application/pdf" || fileName.endsWith(".pdf");
}

export function getPdfFormatErrorMessage(fileName?: string) {
  return fileName
    ? `Файл «${fileName}» не подходит. Загрузите PDF-файл.`
    : "Загрузите PDF-файл. Другие форматы здесь не поддерживаются.";
}

export function getPdfSizeErrorMessage(fileName?: string) {
  return fileName
    ? `Файл «${fileName}» слишком большой. Максимальный размер PDF — ${MAX_PDF_FILE_SIZE_LABEL}.`
    : `Файл слишком большой. Максимальный размер PDF — ${MAX_PDF_FILE_SIZE_LABEL}.`;
}

export function getSinglePdfHintMessage() {
  return `Можно загрузить один PDF до ${MAX_PDF_FILE_SIZE_LABEL}.`;
}

export function getMultiplePdfHintMessage(maxCount: number) {
  return `Можно прикрепить до ${maxCount} PDF, каждый — до ${MAX_PDF_FILE_SIZE_LABEL}.`;
}

export function validateSinglePdfFile(
  file: File | null | undefined,
  options: SinglePdfValidationOptions = {},
): PdfValidationResult {
  if (!file) {
    if (options.required) {
      return {
        isValid: false,
        error:
          options.requiredMessage ??
          "Добавьте PDF-файл, чтобы продолжить.",
      };
    }

    return {
      isValid: true,
      error: null,
    };
  }

  if (!isPdfFile(file)) {
    return {
      isValid: false,
      error: getPdfFormatErrorMessage(file.name),
    };
  }

  if (file.size > MAX_PDF_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: getPdfSizeErrorMessage(file.name),
    };
  }

  return {
    isValid: true,
    error: null,
  };
}

export function validateMultiplePdfFiles(
  files: File[],
  options: MultiplePdfValidationOptions = {},
): PdfValidationResult {
  const maxCount = options.maxCount ?? 1;

  if (files.length > maxCount) {
    return {
      isValid: false,
      error:
        options.maxCountMessage ??
        `Можно прикрепить не более ${maxCount} PDF-файлов.`,
    };
  }

  for (const file of files) {
    const validation = validateSinglePdfFile(file);

    if (!validation.isValid) {
      return validation;
    }
  }

  return {
    isValid: true,
    error: null,
  };
}
