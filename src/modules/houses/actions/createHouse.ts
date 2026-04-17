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
const MAX_COVER_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_COVER_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function sanitizeFileName(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");

  return normalized || "house-cover-image";
}

function isFileLike(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

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
  const currentUser = await getCurrentAdminUser();
  const accessError = assertRegistryActionAccess({ role: currentUser?.role, area: "houses", action: "create" });
  if (accessError) return { error: accessError.error };

  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const osbbName = String(formData.get("osbbName") ?? "").trim();
  const districtId = String(formData.get("districtId") ?? "").trim();
  const shortDescription = String(formData.get("shortDescription") ?? "").trim();
  const publicDescription = String(formData.get("publicDescription") ?? "").trim();
  const fileEntry = formData.get("coverImage");
  const coverImage =
    isFileLike(fileEntry) && fileEntry.size > 0 ? fileEntry : null;

  if (!name || !address) {
    return { error: "Заполните название дома и адрес." };
  }

  if (!districtId) {
    return { error: "Выберите район для дома." };
  }

  if (coverImage) {
    if (!ALLOWED_COVER_IMAGE_TYPES.has(coverImage.type)) {
      return {
        error: "Для фото дома допускаются только JPG, PNG или WebP.",
      };
    }

    if (coverImage.size > MAX_COVER_IMAGE_SIZE_BYTES) {
      return {
        error: "Фото дома должно быть не больше 5 МБ.",
      };
    }
  }

  const baseSlug = slugify(name);

  if (!baseSlug) {
    return { error: "Не удалось сформировать slug дома." };
  }

  const supabase = await createSupabaseServerClient();

  let slug = baseSlug;

  try {
    slug = await resolveUniqueHouseSlug({ baseSlug });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Не удалось сформировать уникальный slug дома.",
    };
  }

  const defaultAccessCode = "123456";

  const { data: createdHouse, error: insertError } = await supabase
    .from("houses")
    .insert({
      district_id: districtId,
      name,
      slug,
      address,
      osbb_name: osbbName || null,
      short_description: shortDescription || null,
      public_description: publicDescription || null,
      is_active: true,
      current_access_code: defaultAccessCode,
    })
    .select("id, name, slug, public_description")
    .single();

  if (insertError) {
    return { error: `Ошибка создания дома: ${insertError.message}` };
  }

  if (coverImage) {
    const safeFileName = sanitizeFileName(coverImage.name);
    const coverImagePath = `${createdHouse.id}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(HOUSE_COVER_BUCKET)
      .upload(coverImagePath, coverImage, {
        upsert: true,
        contentType: coverImage.type || undefined,
      });

    if (uploadError) {
      await supabase.from("houses").delete().eq("id", createdHouse.id);

      return {
        error: `Дом не создан: не удалось загрузить фото дома (${uploadError.message}).`,
      };
    }

    const { error: coverUpdateError } = await supabase
      .from("houses")
      .update({
        cover_image_path: coverImagePath,
      })
      .eq("id", createdHouse.id);

    if (coverUpdateError) {
      await supabase.storage.from(HOUSE_COVER_BUCKET).remove([coverImagePath]);
      await supabase.from("houses").delete().eq("id", createdHouse.id);

      return {
        error: `Дом не создан: не удалось сохранить фото дома (${coverUpdateError.message}).`,
      };
    }
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
      error: `Дом создан, но не удалось инициализировать доступ: ${accessUpsertError.message}`,
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
      description: `Создан дом ${createdHouse.name}.`,
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

  return { error: null };
}
