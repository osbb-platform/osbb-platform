import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type InsertHouseSectionVersionInput = {
  sectionId: string;
  title: string | null;
  status: "draft" | "in_review" | "published" | "archived";
  content: Record<string, unknown>;
};

function isDuplicateVersionError(error: {
  message?: string | null;
  code?: string | null;
}) {
  return (
    error.code === "23505" ||
    (typeof error.message === "string" &&
      error.message.includes("content_versions_unique_version"))
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function insertHouseSectionVersion(
  supabase: SupabaseClient,
  input: InsertHouseSectionVersionInput,
) {
  const maxAttempts = 10;

  const { data: existingVersions, error: versionsError } = await supabase
    .from("content_versions")
    .select("version_number")
    .eq("entity_type", "house_section")
    .eq("entity_id", input.sectionId)
    .order("version_number", { ascending: false })
    .limit(1);

  if (versionsError) {
    throw new Error(`Ошибка чтения версии контента: ${versionsError.message}`);
  }

  let candidateVersionNumber =
    existingVersions && existingVersions.length > 0
      ? Number(existingVersions[0].version_number) + 1
      : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { error: versionInsertError } = await supabase
      .from("content_versions")
      .insert({
        entity_type: "house_section",
        entity_id: input.sectionId,
        version_number: candidateVersionNumber,
        snapshot: {
          title: input.title,
          status: input.status,
          content: input.content,
        },
      });

    if (!versionInsertError) {
      return;
    }

    if (!isDuplicateVersionError(versionInsertError)) {
      throw new Error(
        `Версия не сохранена: ${versionInsertError.message}`,
      );
    }

    candidateVersionNumber += 1;
    await sleep(40 + attempt * 20);
  }

  throw new Error(
    "Не удалось сохранить новую версию секции после нескольких попыток.",
  );
}
