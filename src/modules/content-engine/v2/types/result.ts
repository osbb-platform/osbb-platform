export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "STALE_CONTENT"
  | "VALIDATION_FAILED"
  | "HANDLER_NOT_FOUND"
  | "COMMAND_NOT_FOUND"
  | "STORAGE_ERROR"
  | "INTERNAL";

export type Result<T, E = string> =
  | { ok: true; data: T }
  | { ok: false; error: E; code?: ErrorCode };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });

export const err = (error: string, code?: ErrorCode): Result<never> => ({
  ok: false,
  error,
  code,
});
