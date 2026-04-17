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
  houses: "Дома",
  districts: "Районы",
  apartments: "Квартиры",
  employees: "Сотрудники",
  house_portal: "Дома",
  settings: "Районы",
  company: "Сайт компании",
  system: "Система",
};

const SUB_SECTION_LABELS: Record<string, string> = {
  house_settings: "Настройки дома",
  announcements: "Объявления",
  board: "Правление",
  information: "Информация",
  specialists: "Специалисты",
  plan: "План работ",
  reports: "Отчеты",
  requisites: "Реквизиты",
  debtors: "Должники",
  meetings: "Собрания",
  apartments: "Квартиры",
  access: "Доступ",
  requests: "Обращения",
  districts: "Районы",
  company_pages: "Сайт компании",
  company_sections: "Секции сайта компании",
  employees: "Сотрудники",
  unknown: "Без подраздела",
};

const ACTION_LABELS: Record<string, string> = {
  create_house: "Создание",
  update_house: "Редактирование",
  change_access_code: "Смена кода доступа",
  create_house_announcement: "Создание",
  publish_house_announcement: "Подтверждение",
  archive_house_announcement: "Архивация",
  delete_archived_house_announcements: "Удаление",
  create_house_information_post: "Создание",
  create_house_information_faq: "Создание",
  publish_house_information_post: "Подтверждение",
  archive_house_information_post: "Архивация",
  delete_house_section: "Удаление",
  update_house_section: "Редактирование",
  create_house_document: "Создание",
  update_house_document: "Редактирование",
  delete_house_document: "Удаление",
  create_specialist_contact_request: "Входящее событие",
  create_specialist: "Создание",
  update_specialist: "Редактирование",
  confirm_specialist: "Подтверждение",
  archive_specialist: "Архивация",
  restore_specialist: "Восстановление",
  delete_specialist: "Удаление",
  create_district: "Создание",
  update_district: "Редактирование",
  archive_district: "Архивация",
  restore_district: "Восстановление",
  delete_district: "Удаление",
  create_company_page: "Создание",
  update_company_page: "Редактирование",
  update_company_section: "Редактирование",
  create_employee: "Создание",
  invite_employee: "Приглашение",
  activate_employee: "Подтверждение",
  house_login: "Вход в дом",
  update_employee_profile: "Редактирование профиля",
};

export function getMainSectionLabel(value: string | null | undefined) {
  if (!value) return "Без раздела";
  return MAIN_SECTION_LABELS[value] ?? value;
}

export function getSubSectionLabel(value: string | null | undefined) {
  if (!value) return "Без подраздела";
  return SUB_SECTION_LABELS[value] ?? value;
}

export function getActionLabel(value: string | null | undefined) {
  if (!value) return "Действие";
  return ACTION_LABELS[value] ?? value;
}

export function getActionTone(value: string | null | undefined): HistoryActionTone {
  const label = getActionLabel(value).toLowerCase();

  if (label.includes("входящее")) return "incoming";
  if (label.includes("создание")) return "create";
  if (label.includes("редактирование")) return "edit";
  if (label.includes("подтверждение")) return "confirm";
  if (label.includes("архивация")) return "archive";
  if (label.includes("восстановление")) return "restore";
  if (label.includes("удаление")) return "delete";
  if (label.includes("смена")) return "access";

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
