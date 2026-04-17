import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type PlatformHistoryFilterOptions = {
  cmsActors: string[];
  cmsSections: Array<{
    key: string;
    label: string;
    subSections: Array<{ key: string; label: string }>;
  }>;
  incomingSections: Array<{ key: string; label: string }>;
};

const CMS_SECTIONS = [
  {
    key: "districts",
    label: "Районы",
    subSections: [],
  },
  {
    key: "houses",
    label: "Дома",
    subSections: [
      { key: "house_settings", label: "Настройки дома" },
      { key: "announcements", label: "Объявления" },
      { key: "board", label: "Правление" },
      { key: "information", label: "Информация" },
      { key: "specialists", label: "Специалисты" },
      { key: "plan", label: "План работ" },
      { key: "reports", label: "Отчеты" },
      { key: "requisites", label: "Реквизиты" },
      { key: "debtors", label: "Должники" },
      { key: "meetings", label: "Собрания" },
      { key: "access", label: "Доступ" },
    ],
  },
  {
    key: "apartments",
    label: "Квартиры",
    subSections: [],
  },
  {
    key: "employees",
    label: "Сотрудники",
    subSections: [],
  },
] as const;

const DEFAULT_INCOMING_SECTIONS = [
  { key: "access", label: "Вход в дом" },
  { key: "requests", label: "Обращения" },
  { key: "specialists", label: "Запросы к специалистам" },
  { key: "meetings", label: "Собрания и голосования" },
  { key: "information", label: "Действия в разделах дома" },
] as const;

const INCOMING_SECTION_LABELS: Record<string, string> = {
  access: "Вход в дом",
  requests: "Обращения",
  specialists: "Запросы к специалистам",
  meetings: "Собрания и голосования",
  information: "Действия в разделах дома",
};

export async function getPlatformHistoryFilterOptions(): Promise<PlatformHistoryFilterOptions> {
  noStore();

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("platform_change_history")
    .select("actor_name, actor_email, actor_role, metadata")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    const message = error.message?.toLowerCase() ?? "";
    const isMissingTable =
      message.includes("could not find the table") ||
      message.includes("schema cache");

    if (isMissingTable) {
      return {
        cmsActors: [],
        cmsSections: [...CMS_SECTIONS],
        incomingSections: [...DEFAULT_INCOMING_SECTIONS],
      };
    }

    throw new Error(
      `Failed to load platform history filter options: ${error.message}`,
    );
  }

  const cmsActors = Array.from(
    new Set<string>(
      (data ?? [])
        .filter((item) => {
          const metadata =
            item.metadata && typeof item.metadata === "object"
              ? (item.metadata as Record<string, unknown>)
              : {};

          const sourceType = String(metadata.sourceType ?? "").trim();
          const actorRole = String(item.actor_role ?? "").trim();

          return sourceType === "cms" || (!sourceType && actorRole !== "resident" && actorRole !== "resident_request");
        })
        .map((item) => {
          const actorName = String(item.actor_name ?? "").trim();
          const actorEmail = String(item.actor_email ?? "").trim();
          return actorName || actorEmail;
        })
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right, "ru"));

  const incomingSectionsFromHistory = Array.from(
    new Set<string>(
      (data ?? [])
        .filter((item) => {
          const metadata =
            item.metadata && typeof item.metadata === "object"
              ? (item.metadata as Record<string, unknown>)
              : {};

          const sourceType = String(metadata.sourceType ?? "").trim();
          const actorRole = String(item.actor_role ?? "").trim();

          return sourceType === "house_portal" || actorRole === "resident" || actorRole === "resident_request";
        })
        .map((item) => {
          const metadata =
            item.metadata && typeof item.metadata === "object"
              ? (item.metadata as Record<string, unknown>)
              : {};

          const raw = String(metadata.subSectionKey ?? "").trim();

          if (raw === "faq" || raw === "documents") {
            return "information";
          }

          return raw;
        })
        .filter(Boolean),
    ),
  );

  const incomingSections = Array.from(
    new Map<string, { key: string; label: string }>(
      [...DEFAULT_INCOMING_SECTIONS].map((item) => [item.key, item]),
    ).values(),
  ).concat(
    incomingSectionsFromHistory
      .filter(
        (key) =>
          !DEFAULT_INCOMING_SECTIONS.some(
            (defaultItem) => defaultItem.key === key,
          ),
      )
      .map((key) => ({
        key,
        label: INCOMING_SECTION_LABELS[key] ?? key,
      })),
  );

  return {
    cmsActors,
    cmsSections: [...CMS_SECTIONS],
    incomingSections,
  };
}
