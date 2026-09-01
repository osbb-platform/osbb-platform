export const SPECIALIST_SERVICE_NUMBERS = new Set([
  "101",
  "102",
  "103",
  "104",
  "112",
  "1545",
]);

const ALLOWED_PHONE_CHARACTERS = /^[+\d\s().-]+$/;

export function normalizeSpecialistPhone(value: unknown): string {
  if (typeof value !== "string") return "";

  const input = value.trim();
  if (!input) return "";

  const hasPlus = input.startsWith("+");
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";

  return hasPlus ? `+${digits}` : digits;
}

export function isValidSpecialistPhone(value: unknown): boolean {
  if (typeof value !== "string") return false;

  const input = value.trim();
  if (!input || !ALLOWED_PHONE_CHARACTERS.test(input)) return false;

  const normalized = normalizeSpecialistPhone(input);
  if (!normalized) return false;

  if (normalized.startsWith("+")) {
    const digits = normalized.slice(1);

    if (SPECIALIST_SERVICE_NUMBERS.has(digits)) return false;

    return digits.length >= 8 && digits.length <= 15;
  }

  if (SPECIALIST_SERVICE_NUMBERS.has(normalized)) return true;

  return normalized.length >= 5 && normalized.length <= 15;
}

export function normalizeSpecialistPhones(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((phone) => normalizeSpecialistPhone(phone))
    .filter(Boolean)
    .filter((phone, index, array) => array.indexOf(phone) === index);
}

export function validateSpecialistPhones(
  value: unknown,
): { ok: true; phones: string[] } | { ok: false; phones: string[] } {
  if (!Array.isArray(value)) return { ok: true, phones: [] };

  const rawPhones = value.filter(
    (phone): phone is string =>
      typeof phone === "string" && phone.trim().length > 0,
  );

  const phones = normalizeSpecialistPhones(rawPhones);

  if (rawPhones.some((phone) => !isValidSpecialistPhone(phone))) {
    return { ok: false, phones };
  }

  return { ok: true, phones };
}

export function toSpecialistTelephoneHref(value: unknown): string | null {
  if (!isValidSpecialistPhone(value)) return null;
  return `tel:${normalizeSpecialistPhone(value)}`;
}
