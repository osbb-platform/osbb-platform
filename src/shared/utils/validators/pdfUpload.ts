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
    ? `Файл «${fileName}» не підходить. Завантажте PDF-файл.`
    : "Завантажте PDF-файл. Інші формати тут не підтримуються.";
}

export function getPdfSizeErrorMessage(fileName?: string) {
  return fileName
    ? `Файл «${fileName}» занадто великий. Максимальний розмір PDF — ${MAX_PDF_FILE_SIZE_LABEL}.`
    : `Файл занадто великий. Максимальний розмір PDF — ${MAX_PDF_FILE_SIZE_LABEL}.`;
}

export function getSinglePdfHintMessage() {
  return `Можна завантажити один PDF до ${MAX_PDF_FILE_SIZE_LABEL}.`;
}

export function getMultiplePdfHintMessage(maxCount: number) {
  return `Можна прикріпити до ${maxCount} PDF, кожен — до ${MAX_PDF_FILE_SIZE_LABEL}.`;
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
          "Додайте PDF-файл, щоб продовжити.",
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
        `Можна прикріпити не більше ${maxCount} PDF-файлів.`,
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
