export const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp";
export const MAX_IMAGE_FILE_SIZE_BYTES = 15 * 1024 * 1024;
export const MAX_IMAGE_FILE_SIZE_LABEL = "15 МБ";

type ImageValidationOptions = {
  label?: string;
  maxSizeBytes?: number;
  maxSizeLabel?: string;
};

type ImageValidationResult = {
  isValid: boolean;
  error: string | null;
};

const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const SUPPORTED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

function isSupportedImageFile(file: File) {
  const fileName = file.name.toLowerCase();

  return (
    SUPPORTED_IMAGE_MIME_TYPES.has(file.type) ||
    SUPPORTED_IMAGE_EXTENSIONS.some((extension) => fileName.endsWith(extension))
  );
}

function getImageLabel(options: ImageValidationOptions) {
  return options.label?.trim() || "Зображення";
}

export function getImageFormatErrorMessage(
  fileName?: string,
  options: ImageValidationOptions = {},
) {
  const label = getImageLabel(options);

  return fileName
    ? `Файл «${fileName}» не підходить. ${label} має бути у форматі JPG, PNG або WebP.`
    : `${label} має бути у форматі JPG, PNG або WebP.`;
}

export function getImageSizeErrorMessage(
  fileName?: string,
  options: ImageValidationOptions = {},
) {
  const label = getImageLabel(options);
  const maxSizeLabel = options.maxSizeLabel?.trim() || MAX_IMAGE_FILE_SIZE_LABEL;

  return fileName
    ? `Файл «${fileName}» занадто великий. ${label} має бути не більшим за ${maxSizeLabel}.`
    : `${label} має бути не більшим за ${maxSizeLabel}.`;
}

export function validateSingleImageFile(
  file: File | null | undefined,
  options: ImageValidationOptions = {},
): ImageValidationResult {
  if (!file) {
    return {
      isValid: true,
      error: null,
    };
  }

  if (!isSupportedImageFile(file)) {
    return {
      isValid: false,
      error: getImageFormatErrorMessage(file.name, options),
    };
  }

  const maxSizeBytes = options.maxSizeBytes ?? MAX_IMAGE_FILE_SIZE_BYTES;

  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: getImageSizeErrorMessage(file.name, options),
    };
  }

  return {
    isValid: true,
    error: null,
  };
}
