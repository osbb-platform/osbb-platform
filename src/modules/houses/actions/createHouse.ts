"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { assertRegistryActionAccess } from "@/src/shared/permissions/actionAccess";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";
import { bootstrapHouseContent } from "@/src/modules/houses/services/bootstrapHouseContent";
import { slugify } from "@/src/shared/utils/slug/slugify";

type CreateHouseState = {
  error: string | null;
};

const HOUSE_COVER_BUCKET = "house-cover-images";

async function resolveUniqueHouseSlug(params: { baseSlug: string }) {
  const supabase = await createSupabaseServerClient();
  const { baseSlug } = params;

  const { data, error } = await supabase
    .from("houses")
    .select("id, slug")
    .ilike("slug", `${baseSlug}%`);

  if (error) {
    throw new Error(`Failed to resolve house slug: ${error.message}`);
  }

  const existingSlugs = new Set((data ?? []).map((item) => item.slug));

  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;

  while (existingSlugs.has(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseSlug}-${suffix}`;
}

export async function createHouse(
  _prevState: CreateHouseState,
  formData: FormData,
): Promise<CreateHouseState> {
  const uploadedImagePath = String(formData.get("uploadedImagePath") ?? "").trim();
  const currentUser = await getCurrentAdminUser();
  const supabase = await createSupabaseServerClient();

  async function failWithCleanup(error: string): Promise<CreateHouseState> {
    if (uploadedImagePath) {
      await supabase.storage.from(HOUSE_COVER_BUCKET).remove([uploadedImagePath]);
    }

    return { error };
  }

  const accessError = assertRegistryActionAccess({
    role: currentUser?.role,
    area: "houses",
    action: "create",
  });
  if (accessError) return failWithCleanup(accessError.error ?? "Недостатньо прав для виконання дії.");

  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const osbbName = String(formData.get("osbbName") ?? "").trim();
  const districtId = String(formData.get("districtId") ?? "").trim();
  const managementCompanyId = String(formData.get("managementCompanyId") ?? "").trim();
  const shortDescription = String(formData.get("shortDescription") ?? "").trim();
  const publicDescription = String(formData.get("publicDescription") ?? "").trim();

  if (!name || !address) {
    return failWithCleanup("Заповніть назву будинку та адресу.");
  }

  if (!districtId) {
    return failWithCleanup("Оберіть район для будинку.");
  }

  if (!managementCompanyId) {
    return failWithCleanup("Оберіть керуючу компанію для будинку.");
  }

  const baseSlug = slugify(name);

  if (!baseSlug) {
    return failWithCleanup("Не вдалося сформувати slug будинку.");
  }

  let slug = baseSlug;

  try {
    slug = await resolveUniqueHouseSlug({ baseSlug });
  } catch (error) {
    return failWithCleanup(
      error instanceof Error
        ? error.message
        : "Не вдалося сформувати унікальний slug будинку.",
    );
  }

  const defaultAccessCode = "123456";

  const { data: createdHouse, error: insertError } = await supabase
    .from("houses")
    .insert({
      district_id: districtId,
      management_company_id: managementCompanyId,
      name,
      slug,
      address,
      osbb_name: osbbName || null,
      short_description: shortDescription || null,
      public_description: publicDescription || null,
      cover_image_path: uploadedImagePath || null,
      is_active: true,
      current_access_code: defaultAccessCode,
    })
    .select("id, name, slug, public_description, district:districts(theme_color)")
    .single();

  if (insertError) {
    return failWithCleanup(`Помилка створення будинку: ${insertError.message}`);
  }

  await bootstrapHouseContent({
    houseId: createdHouse.id,
    houseName: createdHouse.name,
    houseSlug: createdHouse.slug,
    publicDescription: createdHouse.public_description,
  });

  const { error: accessUpsertError } = await supabase.rpc("upsert_house_access", {
    target_house_id: createdHouse.id,
    raw_password: defaultAccessCode,
  });

  if (accessUpsertError) {
    return {
      error: `Будинок створено, але не вдалося ініціалізувати доступ: ${accessUpsertError.message}`,
    };
  }

  if (currentUser) {
    await logPlatformChange({
      actorAdminId: currentUser.id,
      actorName: currentUser.fullName,
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      entityType: "house",
      entityId: createdHouse.id,
      entityLabel: createdHouse.slug,
      actionType: "create_house",
      description: `Створено будинок ${createdHouse.name}.`,
      metadata: {
        slug: createdHouse.slug,
        address,
        districtId,
      },
    });
  }

  revalidatePath("/admin/houses");
  revalidatePath("/admin/districts");
  revalidatePath("/admin/history");
  revalidatePath(`/house/${createdHouse.slug}`);

  try {
    const { generateHouseAnnouncementPdf } = await import(
      "@/src/modules/houses/services/generateHouseAnnouncementPdf"
    );
    await generateHouseAnnouncementPdf({
      houseId: createdHouse.id,
      houseName: createdHouse.name,
      address,
      osbbName,
      slug: createdHouse.slug,
      accentColor:
        createdHouse.district &&
        typeof createdHouse.district === "object" &&
        "theme_color" in createdHouse.district
          ? String(createdHouse.district.theme_color ?? "")
          : null,
    });
  } catch (e) {
    console.error("announcement pdf trigger error FULL:", e);
  }

  return { error: null };
}
