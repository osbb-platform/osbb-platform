type PublicContentReadErrorLike = {
  code?: string | null;
  message: string;
};

type PublicContentReadContext = {
  section: string;
  resource: string;
  houseId: string;
  error: PublicContentReadErrorLike;
  details?: Record<string, unknown>;
};

export function throwRequiredPublicReadError({
  section,
  resource,
  houseId,
  error,
  details,
}: PublicContentReadContext): never {
  console.error("PUBLIC_CONTENT_READ_FAILED", {
    section,
    resource,
    houseId,
    code: error.code ?? null,
    message: error.message,
    ...details,
  });

  throw new Error(
    `Failed to load public ${section} resource ${resource} for house ${houseId}: ${error.message}`,
  );
}

export function logOptionalPublicReadError({
  section,
  resource,
  houseId,
  error,
  details,
}: PublicContentReadContext): void {
  console.error("PUBLIC_CONTENT_OPTIONAL_READ_FAILED", {
    section,
    resource,
    houseId,
    code: error.code ?? null,
    message: error.message,
    ...details,
  });
}
