import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type PlatformHistoryFilterOptions = {
  cmsActors: string[];
  cmsSections: ReadonlyArray<{
    key: string;
    label: string;
    subSections: ReadonlyArray<{ key: string; label: string }>;
  }>;
  incomingSections: ReadonlyArray<{ key: string; label: string }>;
};

const CMS_SECTIONS = [
  {
    key: "districts",
    label: "Райони",
    subSections: [],
  },
  {
    key: "houses",
    label: "Будинки",
    subSections: [
      { key: "house_settings", label: "Налаштування будинку" },
      { key: "announcements", label: "Оголошення" },
      { key: "board", label: "Правління" },
      { key: "information", label: "Інформація" },
      { key: "specialists", label: "Спеціалісти" },
      { key: "plan", label: "План робіт" },
      { key: "reports", label: "Звіти" },
      { key: "requisites", label: "Реквізити" },
      { key: "debtors", label: "Боржники" },
      { key: "meetings", label: "Збори" },
      { key: "access", label: "Доступ" },
    ],
  },
  {
    key: "apartments",
    label: "Квартири",
    subSections: [],
  },
  {
    key: "employees",
    label: "Співробітники",
    subSections: [],
  },
] as const;

const DEFAULT_INCOMING_SECTIONS = [
  { key: "access", label: "Вхід до будинку" },
  { key: "requests", label: "Звернення" },
  { key: "specialists", label: "Запити до спеціалістів" },
  { key: "meetings", label: "Збори та голосування" },
  { key: "information", label: "Дії в розділах будинку" },
] as const;

const INCOMING_SECTION_LABELS: Record<string, string> = {
  access: "Вхід до будинку",
  requests: "Звернення",
  specialists: "Запити до спеціалістів",
  meetings: "Збори та голосування",
  information: "Дії в розділах будинку",
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
