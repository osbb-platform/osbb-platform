"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { assertRegistryActionAccess } from "@/src/shared/permissions/actionAccess";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";

export type UpdateHouseState = {
  error: string | null;
  successMessage: string | null;
};

const HOUSE_COVER_BUCKET = "house-cover-images";
const DEFAULT_ANNOUNCEMENT_IMAGE_URL =
  "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1600&q=80";
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

export async function updateHouse(
  _prevState: UpdateHouseState,
  formData: FormData,
): Promise<UpdateHouseState> {
  const currentUser = await getCurrentAdminUser();
  const accessError = assertRegistryActionAccess({
    role: currentUser?.role,
    area: "houses",
    action: "edit",
  });
  if (accessError) return { error: accessError.error, successMessage: null };

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const osbbName = String(formData.get("osbbName") ?? "").trim();
  const districtId = String(formData.get("districtId") ?? "").trim();
  const managementCompanyId = String(formData.get("managementCompanyId") ?? "").trim();
  const shortDescription = String(formData.get("shortDescription") ?? "").trim();
  const publicDescription = String(formData.get("publicDescription") ?? "").trim();
  const removeCoverImage =
    String(formData.get("removeCoverImage") ?? "false") === "true";
  const fileEntry = formData.get("coverImage");
  const coverImage =
    isFileLike(fileEntry) && fileEntry.size > 0 ? fileEntry : null;

  if (!id || !name || !address) {
    return {
      error: "Заповніть обов’язкові поля: назва та адреса.",
      successMessage: null,
    };
  }

  if (!districtId) {
    return {
      error: "Оберіть район для будинку.",
      successMessage: null,
    };
  }

  if (!managementCompanyId) {
    return {
      error: "Оберіть керуючу компанію для будинку.",
      successMessage: null,
    };
  }

  if (coverImage) {
    if (!ALLOWED_COVER_IMAGE_TYPES.has(coverImage.type)) {
      return {
        error: "Для фото будинку дозволені лише JPG, PNG або WebP.",
        successMessage: null,
      };
    }

    if (coverImage.size > MAX_COVER_IMAGE_SIZE_BYTES) {
      return {
        error: "Фото будинку має бути не більше 5 МБ.",
        successMessage: null,
      };
    }
  }

  const supabase = await createSupabaseServerClient();

  const { data: existingHouse, error: existingHouseError } = await supabase
    .from("houses")
    .select("id, slug, name, district_id, archived_at, cover_image_path")
    .eq("id", id)
    .maybeSingle();

  if (existingHouseError) {
    return {
      error: `Помилка завантаження будинку: ${existingHouseError.message}`,
      successMessage: null,
    };
  }

  if (!existingHouse) {
    return {
      error: "Будинок не знайдено.",
      successMessage: null,
    };
  }

  if (existingHouse.archived_at) {
    return {
      error: "Не можна редагувати архівний будинок. Спочатку відновіть його.",
      successMessage: null,
    };
  }

  let nextCoverImagePath =
    typeof existingHouse.cover_image_path === "string"
      ? existingHouse.cover_image_path
      : null;

  if ((removeCoverImage || coverImage) && nextCoverImagePath) {
    const { error: removeError } = await supabase.storage
      .from(HOUSE_COVER_BUCKET)
      .remove([nextCoverImagePath]);

    if (removeError) {
      return {
        error: `Не вдалося видалити поточне фото будинку: ${removeError.message}`,
        successMessage: null,
      };
    }

    nextCoverImagePath = null;
  }

  if (coverImage) {
    const safeFileName = sanitizeFileName(coverImage.name);
    const uploadedPath = `${id}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(HOUSE_COVER_BUCKET)
      .upload(uploadedPath, coverImage, {
        upsert: true,
        contentType: coverImage.type || undefined,
      });

    if (uploadError) {
      return {
        error: `Не вдалося завантажити фото будинку: ${uploadError.message}`,
        successMessage: null,
      };
    }

    nextCoverImagePath = uploadedPath;
  }

  const { data: updatedHouse, error: updateError } = await supabase
    .from("houses")
    .update({
      name,
      address,
      osbb_name: osbbName || null,
      district_id: districtId,
      management_company_id: managementCompanyId,
      short_description: shortDescription || null,
      public_description: publicDescription || null,
      cover_image_path: nextCoverImagePath,
    })
    .eq("id", id)
    .select("id, slug, name, district:districts(theme_color)")
    .maybeSingle();

  if (updateError) {
    return {
      error: `Помилка оновлення будинку: ${updateError.message}`,
      successMessage: null,
    };
  }

  if (!updatedHouse) {
    return {
      error: "Будинок не було оновлено.",
      successMessage: null,
    };
  }

  if (currentUser) {
    await logPlatformChange({
      actorAdminId: currentUser.id,
      actorName: currentUser.fullName,
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      entityType: "house",
      entityId: id,
      entityLabel: existingHouse.slug ?? null,
      actionType: "update_house",
      description: `Будинок ${name} оновлено.`,
      metadata: {
        houseSlug: updatedHouse.slug,
        districtChanged: existingHouse.district_id !== districtId,
      },
    });
  }

  // 🔽 Генерация PDF объявления (асинхронно)
  try {
    const { generateHouseAnnouncementPdf } = await import(
      "@/src/modules/houses/services/generateHouseAnnouncementPdf"
    );
    await generateHouseAnnouncementPdf({
      houseId: updatedHouse.id,
      houseName: name,
      address,
      osbbName,
      slug: updatedHouse.slug,
      accentColor:
        updatedHouse.district &&
        typeof updatedHouse.district === "object" &&
        "theme_color" in updatedHouse.district
          ? String(updatedHouse.district.theme_color ?? "")
          : null,
    });
  } catch (e) {
    console.error("announcement pdf trigger error", e);
  }

  revalidatePath("/admin/houses");
  revalidatePath("/admin/history");
  revalidatePath(`/admin/houses/${id}`);
  revalidatePath(`/house/${updatedHouse.slug}`);

  return {
    error: null,
    successMessage: `Будинок «${updatedHouse.name}» оновлено.`,
  };
}
