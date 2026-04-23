"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { bootstrapCompanyPageContent } from "@/src/modules/company/services/bootstrapCompanyPageContent";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";

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
  return params.fullName ?? params.email ?? "Адміністратор";
}

export async function createCompanyPage(formData: FormData): Promise<void> {
  const title = String(formData.get("title") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const seoTitle = String(formData.get("seoTitle") ?? "").trim();
  const seoDescription = String(formData.get("seoDescription") ?? "").trim();

  if (!title) {
    throw new Error("Назва сторінки не заповнена.");
  }

  const slug = normalizeSlug(slugInput || title);

  if (!slug) {
    throw new Error("Не вдалося сформувати slug сторінки.");
  }

  const supabase = await createSupabaseServerClient();

  const { count: primaryCount, error: primaryCountError } = await supabase
    .from("company_pages")
    .select("id", { count: "exact", head: true })
    .eq("is_primary", true);

  if (primaryCountError) {
    throw new Error(
      `Помилка перевірки primary page strategy: ${primaryCountError.message}`,
    );
  }

  const shouldBecomePrimary = (primaryCount ?? 0) === 0;

  const insertPayload = {
    slug,
    title,
    status: shouldBecomePrimary ? "published" : "draft",
    seo_title: seoTitle || null,
    seo_description: seoDescription || null,
    is_primary: shouldBecomePrimary,
    published_at: shouldBecomePrimary ? new Date().toISOString() : null,
  };

  const { data: createdPage, error: insertError } = await supabase
    .from("company_pages")
    .insert(insertPayload)
    .select("id, title, slug, status, is_primary")
    .single();

  if (insertError) {
    throw new Error(`Помилка створення сторінки: ${insertError.message}`);
  }

  await bootstrapCompanyPageContent({
    companyPageId: createdPage.id,
    pageTitle: createdPage.title,
    pageSlug: createdPage.slug,
    seoDescription,
  });

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
    entityId: createdPage.id,
    entityLabel: createdPage.title,
    actionType: "create_company_page",
    description: `Створено сторінку компанії «${createdPage.title}».`,
    metadata: {
      sourceType: "cms",
      sourceModule: "company",
      mainSectionKey: "company",
      subSectionKey: "company_pages",
      entityType: "company_page",
      entityId: createdPage.id,
      entityTitle: createdPage.title,
      pageSlug: createdPage.slug,
      pageStatus: createdPage.status,
      isPrimary: createdPage.is_primary,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin/company-pages");
  revalidatePath(`/admin/company-pages/${createdPage.id}`);

  redirect(`/admin/company-pages/${createdPage.id}`);
}
