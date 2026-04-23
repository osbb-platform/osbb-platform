export type HistorySourceType = "cms" | "house_portal";

export type HistoryMainSectionKey =
  | "houses"
  | "districts"
  | "apartments"
  | "employees"
  | "company"
  | "system"
  | "settings"
  | "house_portal";

export type HistorySubSectionKey =
  | "house_settings"
  | "announcements"
  | "board"
  | "information"
  | "specialists"
  | "plan"
  | "reports"
  | "requisites"
  | "debtors"
  | "meetings"
  | "apartments"
  | "access"
  | "requests"
  | "districts"
  | "company_pages"
  | "company_sections"
  | "employees"
  | "unknown";

export type HistoryActionTone =
  | "create"
  | "edit"
  | "confirm"
  | "archive"
  | "restore"
  | "delete"
  | "incoming"
  | "access"
  | "neutral";

const MAIN_SECTION_LABELS: Record<string, string> = {
  houses: "Будинки",
  districts: "Райони",
  apartments: "Квартири",
  employees: "Співробітники",
  house_portal: "Будинки",
  settings: "Райони",
  company: "Сайт компанії",
  system: "Система",
};

const SUB_SECTION_LABELS: Record<string, string> = {
  house_settings: "Налаштування будинку",
  announcements: "Оголошення",
  board: "Правління",
  information: "Інформація",
  specialists: "Спеціалісти",
  plan: "План робіт",
  reports: "Звіти",
  requisites: "Реквізити",
  debtors: "Боржники",
  meetings: "Збори",
  apartments: "Квартири",
  access: "Доступ",
  requests: "Звернення",
  districts: "Райони",
  company_pages: "Сайт компанії",
  company_sections: "Секції сайту компанії",
  employees: "Співробітники",
  unknown: "Без підрозділу",
};

const ACTION_LABELS: Record<string, string> = {
  create_house: "Створення",
  update_house: "Редагування",
  change_access_code: "Зміна коду доступу",
  create_house_announcement: "Створення",
  publish_house_announcement: "Підтвердження",
  archive_house_announcement: "Архівація",
  delete_archived_house_announcements: "Видалення",
  create_house_information_post: "Створення",
  create_house_information_faq: "Створення",
  publish_house_information_post: "Підтвердження",
  archive_house_information_post: "Архівація",
  delete_house_section: "Видалення",
  update_house_section: "Редагування",
  create_house_document: "Створення",
  update_house_document: "Редагування",
  delete_house_document: "Видалення",
  create_specialist_contact_request: "Вхідна подія",
  create_specialist: "Створення",
  update_specialist: "Редагування",
  confirm_specialist: "Підтвердження",
  archive_specialist: "Архівація",
  restore_specialist: "Відновлення",
  delete_specialist: "Видалення",
  create_district: "Створення",
  update_district: "Редагування",
  archive_district: "Архівація",
  restore_district: "Відновлення",
  delete_district: "Видалення",
  create_company_page: "Створення",
  update_company_page: "Редагування",
  update_company_section: "Редагування",
  create_employee: "Створення",
  invite_employee: "Запрошення",
  activate_employee: "Підтвердження",
  house_login: "Вхід до будинку",
  update_employee_profile: "Редагування профілю",
};

export function getMainSectionLabel(value: string | null | undefined) {
  if (!value) return "Без розділу";
  return MAIN_SECTION_LABELS[value] ?? value;
}

export function getSubSectionLabel(value: string | null | undefined) {
  if (!value) return "Без підрозділу";
  return SUB_SECTION_LABELS[value] ?? value;
}

export function getActionLabel(value: string | null | undefined) {
  if (!value) return "Дія";
  return ACTION_LABELS[value] ?? value;
}

export function getActionTone(value: string | null | undefined): HistoryActionTone {
  const label = getActionLabel(value).toLowerCase();

  if (label.includes("вхідна")) return "incoming";
  if (label.includes("створення")) return "create";
  if (label.includes("редагування")) return "edit";
  if (label.includes("підтвердження")) return "confirm";
  if (label.includes("архівація")) return "archive";
  if (label.includes("відновлення")) return "restore";
  if (label.includes("видалення")) return "delete";
  if (label.includes("зміна")) return "access";

  return "neutral";
}

export function getActionIcon(value: string | null | undefined) {
  const tone = getActionTone(value);

  if (tone === "incoming") return "↗";
  if (tone === "create") return "+";
  if (tone === "edit") return "✎";
  if (tone === "confirm") return "✓";
  if (tone === "archive") return "↓";
  if (tone === "restore") return "↺";
  if (tone === "delete") return "×";
  if (tone === "access") return "🔑";

  return "•";
}

export function inferMainSectionKey(params: {
  entityType?: string | null;
  sourceType?: string | null;
}) {
  const { entityType, sourceType } = params;

  if (sourceType === "house_portal") {
    return "houses";
  }

  if (
    entityType === "house" ||
    entityType === "house_section" ||
    entityType === "house_document" ||
    entityType === "specialist" ||
    entityType === "specialist_contact_request" ||
    entityType === "house_access_session"
  ) {
    return "houses";
  }

  if (entityType === "district") {
    return "districts";
  }

  if (entityType === "apartment") {
    return "apartments";
  }

  if (entityType === "employee") {
    return "employees";
  }

  if (entityType === "company_page" || entityType === "company_section") {
    return "company";
  }

  return "system";
}

export function inferSubSectionKey(params: {
  entityType?: string | null;
  actionType?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { entityType, actionType, metadata } = params;

  const metadataSubSection =
    typeof metadata?.subSectionKey === "string" ? metadata.subSectionKey : null;

  if (metadataSubSection) {
    return metadataSubSection;
  }

  if (entityType === "employee" || actionType?.includes("employee")) {
    return "employees";
  }

  if (entityType === "district" || actionType?.includes("district")) {
    return "districts";
  }

  if (entityType === "company_page" || actionType?.includes("company_page")) {
    return "company_pages";
  }

  if (
    entityType === "company_section" ||
    actionType?.includes("company_section")
  ) {
    return "company_sections";
  }

  if (
    actionType?.includes("announcement") ||
    entityType === "announcement" ||
    metadata?.kind === "announcements"
  ) {
    return "announcements";
  }

  if (
    actionType?.includes("information") ||
    entityType === "information" ||
    metadata?.kind === "rich_text"
  ) {
    return "information";
  }

  if (actionType?.includes("faq") || metadata?.kind === "faq") {
    return "information";
  }

  if (actionType?.includes("document") || entityType === "house_document") {
    return "information";
  }

  if (
    actionType?.includes("specialist") ||
    entityType === "specialist" ||
    entityType === "specialist_contact_request"
  ) {
    return entityType === "specialist_contact_request"
      ? "requests"
      : "specialists";
  }

  if (actionType?.includes("access")) {
    return "access";
  }

  if (entityType === "house") {
    return "house_settings";
  }

  if (metadata?.kind === "contacts") {
    return "board";
  }

  if (metadata?.kind === "plan" || actionType?.includes("plan")) {
    return "plan";
  }

  if (metadata?.kind === "reports" || actionType?.includes("report")) {
    return "reports";
  }

  if (metadata?.kind === "requisites") {
    return "requisites";
  }

  if (metadata?.kind === "debtors") {
    return "debtors";
  }

  if (metadata?.kind === "meetings" || actionType?.includes("meeting")) {
    return "meetings";
  }

  if (actionType?.includes("apartment") || entityType === "apartment") {
    return "apartments";
  }

  return "unknown";
}
