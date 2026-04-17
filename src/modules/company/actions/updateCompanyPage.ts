"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";

type UpdateCompanyPageState = {
  error: string | null;
};

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");
}

function getActorDisplayName(params: {
  fullName: string | null;
  email: string | null;
}) {
  return params.fullName ?? params.email ?? "Администратор";
}

export async function updateCompanyPage(
  _prevState: UpdateCompanyPageState,
  formData: FormData,
): Promise<UpdateCompanyPageState> {
  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const statusInput = String(formData.get("status") ?? "").trim();
  const seoTitle = String(formData.get("seoTitle") ?? "").trim();
  const seoDescription = String(formData.get("seoDescription") ?? "").trim();
  const isPrimary = formData.get("isPrimary") === "true";
  const navOrder = Number(formData.get("navOrder") ?? 100);
  const showInNavigation = formData.get("showInNavigation") === "true";
  const showInFooter = formData.get("showInFooter") === "true";

  if (!id || !title) {
    return { error: "Заполните обязательные поля страницы." };
  }

  const slug = normalizeSlug(slugInput || title);

  if (!slug) {
    return { error: "Не удалось сформировать slug страницы." };
  }

  const allowedStatuses = ["draft", "in_review", "published", "archived"];
  if (!allowedStatuses.includes(statusInput)) {
    return { error: "Передан недопустимый статус страницы." };
  }

  const supabase = await createSupabaseServerClient();
  const finalStatus = isPrimary ? "published" : statusInput;

  if (isPrimary) {
    const { error: resetPrimaryError } = await supabase
      .from("company_pages")
      .update({ is_primary: false })
      .neq("id", id)
      .eq("is_primary", true);

    if (resetPrimaryError) {
      return {
        error: `Ошибка сброса предыдущей основной страницы: ${resetPrimaryError.message}`,
      };
    }
  }

  const payload = {
    title,
    slug,
    status: finalStatus,
    seo_title: seoTitle || null,
    seo_description: seoDescription || null,
    is_primary: isPrimary,
    nav_order: Number.isFinite(navOrder) ? navOrder : 100,
    show_in_navigation: showInNavigation,
    show_in_footer: showInFooter,
    published_at:
      finalStatus === "published" ? new Date().toISOString() : null,
  };

  const { error } = await supabase
    .from("company_pages")
    .update(payload)
    .eq("id", id);

  if (error) {
    return { error: `Ошибка обновления страницы компании: ${error.message}` };
  }

  const currentAdmin = await getCurrentAdminUser();
  const actorName = getActorDisplayName({
    fullName: currentAdmin?.fullName ?? null,
    email: currentAdmin?.email ?? null,
  });

  await logPlatformChange({
    actorAdminId: currentAdmin?.id ?? null,
    actorName,
    actorEmail: currentAdmin?.email ?? null,
    actorRole: currentAdmin?.role ?? null,
    entityType: "company_page",
    entityId: id,
    entityLabel: title,
    actionType: "update_company_page",
    description: `Обновлена страница компании «${title}».`,
    metadata: {
      sourceType: "cms",
      sourceModule: "company",
      mainSectionKey: "company",
      subSectionKey: "company_pages",
      entityType: "company_page",
      entityId: id,
      entityTitle: title,
      pageSlug: slug,
      pageStatus: finalStatus,
      isPrimary,
      navOrder,
      showInNavigation,
      showInFooter,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin/company-pages");
  revalidatePath(`/admin/company-pages/${id}`);

  return { error: null };
}
