"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { assertRegistryActionAccess } from "@/src/shared/permissions/actionAccess";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";
import { bootstrapHouseContent } from "@/src/modules/houses/services/bootstrapHouseContent";
import { slugify } from "@/src/shared/utils/slug/slugify";
import { normalizeHouseObjectKind } from "@/src/shared/utils/houses/houseUnitTerminology";

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
  let coverImagePathForCleanup: string | null = uploadedImagePath || null;

  async function failWithCleanup(error: string): Promise<CreateHouseState> {
    if (coverImagePathForCleanup) {
      await supabase.storage.from(HOUSE_COVER_BUCKET).remove([coverImagePathForCleanup]);
    }

    return { error };
  }

  async function cleanupCreatedHouse(houseId: string) {
    const { error: archiveError } = await supabase
      .from("houses")
      .update({
        archived_at: new Date().toISOString(),
        is_active: false,
      })
      .eq("id", houseId);

    if (archiveError) {
      console.error("createHouse compensation archive error:", {
        houseId,
        code: archiveError.code,
        message: archiveError.message,
      });
      return;
    }

    const { error: deleteError } = await supabase
      .from("houses")
      .delete()
      .eq("id", houseId);

    if (deleteError) {
      console.error("createHouse compensation delete error:", {
        houseId,
        code: deleteError.code,
        message: deleteError.message,
      });
    }
  }

  async function finalizePendingCoverImage(params: {
    houseId: string;
    uploadedPath: string;
  }) {
    const { houseId, uploadedPath } = params;

    if (!uploadedPath.startsWith("pending/")) {
      return uploadedPath;
    }

    const fileName = uploadedPath.split("/").pop();

    if (!fileName) {
      return uploadedPath;
    }

    const finalPath = `${houseId}/${fileName}`;

    const { error: moveError } = await supabase.storage
      .from(HOUSE_COVER_BUCKET)
      .move(uploadedPath, finalPath);

    if (moveError) {
      console.error("house cover pending move failed:", moveError);
      return uploadedPath;
    }

    coverImagePathForCleanup = finalPath;

    const { error: updateCoverError } = await supabase
      .from("houses")
      .update({ cover_image_path: finalPath })
      .eq("id", houseId);

    if (updateCoverError) {
      console.error("createHouse cover path update error:", {
        houseId,
        code: updateCoverError.code,
        message: updateCoverError.message,
      });
      await supabase.storage.from(HOUSE_COVER_BUCKET).remove([finalPath]);
      coverImagePathForCleanup = null;
      throw new Error("Не вдалося прив’язати фото будинку.");
    }

    return finalPath;
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
  const objectKind = normalizeHouseObjectKind(formData.get("objectKind"));

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
    console.error("createHouse slug resolution error:", error);
    return failWithCleanup(
      "Не вдалося сформувати унікальне посилання будинку. Оновіть сторінку та повторіть дію.",
    );
  }

  const defaultAccessCode = "123456";
  const houseId = randomUUID();

  // P09 RLS note:
  // houses_admin_select_scoped calls the STABLE admin_has_house_access(id)
  // helper, which re-reads public.houses. During the INSERT statement that
  // helper cannot see the row being inserted. Do not combine this INSERT with
  // RETURNING/.select(); read the row in a separate statement after INSERT.
  const { error: insertError } = await supabase
    .from("houses")
    .insert({
      id: houseId,
      district_id: districtId,
      management_company_id: managementCompanyId,
      name,
      slug,
      address,
      osbb_name: osbbName || null,
      short_description: shortDescription || null,
      public_description: publicDescription || null,
      object_kind: objectKind,
      cover_image_path: uploadedImagePath || null,
      is_active: true,
      current_access_code: defaultAccessCode,
    });

  if (insertError) {
    console.error("createHouse insert error:", {
      houseId,
      districtId,
      managementCompanyId,
      code: insertError.code,
      message: insertError.message,
    });
    return failWithCleanup(
      "Не вдалося створити будинок у вибраному районі. Оновіть сторінку та повторіть дію.",
    );
  }

  const { data: createdHouse, error: createdHouseReadError } = await supabase
    .from("houses")
    .select("id, name, slug, public_description, district:districts(theme_color)")
    .eq("id", houseId)
    .single();

  if (createdHouseReadError || !createdHouse) {
    console.error("createHouse post-insert read error:", {
      houseId,
      code: createdHouseReadError?.code,
      message: createdHouseReadError?.message,
    });
    await cleanupCreatedHouse(houseId);
    return failWithCleanup(
      "Будинок не вдалося підтвердити після створення. Оновіть сторінку та повторіть дію.",
    );
  }

  if (uploadedImagePath) {
    try {
      await finalizePendingCoverImage({
        houseId: createdHouse.id,
        uploadedPath: uploadedImagePath,
      });
    } catch (error) {
      await cleanupCreatedHouse(createdHouse.id);

      console.error("createHouse cover finalize error:", error);
      return failWithCleanup("Не вдалося прив’язати фото будинку.");
    }
  }

  try {
    await bootstrapHouseContent({
      houseId: createdHouse.id,
      houseName: createdHouse.name,
      houseSlug: createdHouse.slug,
      publicDescription: createdHouse.public_description,
    });
  } catch (error) {
    console.error("house bootstrap error:", error);

    await cleanupCreatedHouse(createdHouse.id);

    return failWithCleanup(
      "Будинок не створено: не вдалося ініціалізувати розділи будинку.",
    );
  }

  const { error: accessUpsertError } = await supabase.rpc("upsert_house_access", {
    target_house_id: createdHouse.id,
    raw_password: defaultAccessCode,
  });

  if (accessUpsertError) {
    console.error("createHouse access bootstrap error:", {
      houseId: createdHouse.id,
      code: accessUpsertError.code,
      message: accessUpsertError.message,
    });
    await cleanupCreatedHouse(createdHouse.id);

    return failWithCleanup(
      "Будинок не створено: не вдалося ініціалізувати доступ.",
    );
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
