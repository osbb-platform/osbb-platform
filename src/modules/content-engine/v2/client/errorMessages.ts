import type { ErrorCode } from "@/src/modules/content-engine/v2/types/result";

export const errorMessages: Record<ErrorCode, string> = {
  UNAUTHENTICATED: "Сесія завершилася. Увійдіть повторно.",
  FORBIDDEN: "У вас немає прав для виконання цієї дії.",
  NOT_FOUND: "Запис не знайдено або його вже було змінено.",
  STALE_CONTENT: "Інший користувач уже змінив ці дані. Оновіть їх перед повторною дією.",
  VALIDATION_FAILED: "Перевірте заповнення полів і спробуйте ще раз.",
  HANDLER_NOT_FOUND: "Розділ тимчасово недоступний для обробки.",
  COMMAND_NOT_FOUND: "Дія тимчасово недоступна.",
  STORAGE_ERROR: "Не вдалося обробити файл. Спробуйте ще раз.",
  INTERNAL: "Сталася неочікувана помилка. Спробуйте ще раз.",
};
