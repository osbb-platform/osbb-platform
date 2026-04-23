"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";

export type DeleteDistrictState = {
  error: string | null;
  success: string | null;
};

const DEFAULT_DISTRICT_NAME = "Без району";
const DEFAULT_DISTRICT_SLUG = "bez-rayona";
const DEFAULT_DISTRICT_COLOR = "#9CA3AF";

function getActorDisplayName(params: {
  fullName: string | null;
  email: string | null;
}) {
  return params.fullName ?? params.email ?? "Адміністратор";
}

async function ensureDefaultDistrict() {
  const supabase = await createSupabaseServerClient();

  const { data: existingDistrict, error: existingDistrictError } = await supabase
    .from("districts")
    .select("id, name, slug, theme_color")
    .eq("slug", DEFAULT_DISTRICT_SLUG)
    .maybeSingle();

  if (existingDistrictError) {
    throw new Error(
      `Не вдалося перевірити системний район: ${existingDistrictError.message}`,
    );
  }

  if (existingDistrict) {
    return existingDistrict;
  }

  const { data: createdDistrict, error: createError } = await supabase
    .from("districts")
    .insert({
      name: DEFAULT_DISTRICT_NAME,
      slug: DEFAULT_DISTRICT_SLUG,
      theme_color: DEFAULT_DISTRICT_COLOR,
    })
    .select("id, name, slug, theme_color")
    .single();

  if (createError || !createdDistrict) {
    throw new Error(
      `Не вдалося створити системний район "Без району": ${createError?.message ?? "Unknown error"}`,
    );
  }

  return createdDistrict;
}

export async function deleteDistrict(
  _prevState: DeleteDistrictState,
  formData: FormData,
): Promise<DeleteDistrictState> {
  const currentAdmin = await getCurrentAdminUser();

  if (!currentAdmin || (currentAdmin.role !== "admin" && currentAdmin.role !== "superadmin")) {
    return {
      error: "Недостатньо прав для видалення району.",
      success: null,
    };
  }

  const districtId = String(formData.get("id") ?? "").trim();

  if (!districtId) {
    return {
      error: "Не вдалося визначити район для видалення.",
      success: null,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data: district, error: districtError } = await supabase
    .from("districts")
    .select("id, name, slug, theme_color")
    .eq("id", districtId)
    .maybeSingle();

  if (districtError) {
    return {
      error: `Помилка завантаження району: ${districtError.message}`,
      success: null,
    };
  }

  if (!district) {
    return {
      error: "Район не знайдено.",
      success: null,
    };
  }

  if (district.slug === DEFAULT_DISTRICT_SLUG) {
    return {
      error: 'Системний район "Без району" не можна видалити.',
      success: null,
    };
  }

  let defaultDistrict;

  try {
    defaultDistrict = await ensureDefaultDistrict();
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Не вдалося підготувати район "Без району".',
      success: null,
    };
  }

  const { data: housesInDistrict, error: housesLookupError } = await supabase
    .from("houses")
    .select("id")
    .eq("district_id", district.id);

  if (housesLookupError) {
    return {
      error: `Не вдалося перевірити будинки району: ${housesLookupError.message}`,
      success: null,
    };
  }

  const housesCount = housesInDistrict?.length ?? 0;

  if (housesCount > 0) {
    const { error: reassignError } = await supabase
      .from("houses")
      .update({
        district_id: defaultDistrict.id,
      })
      .eq("district_id", district.id);

    if (reassignError) {
      return {
        error: `Не вдалося перенести будинки до району "Без району": ${reassignError.message}`,
        success: null,
      };
    }
  }

  const { data: deletedDistrict, error: deleteError } = await supabase
    .from("districts")
    .delete()
    .eq("id", district.id)
    .select("id, name, slug")
    .maybeSingle();

  if (deleteError) {
    return {
      error: `Помилка видалення району: ${deleteError.message}`,
      success: null,
    };
  }

  if (!deletedDistrict) {
    return {
      error:
        "Район не було видалено. Ймовірно, у поточного користувача немає прав на delete для таблиці districts.",
      success: null,
    };
  }

  const actorName = getActorDisplayName({
    fullName: currentAdmin?.fullName ?? null,
    email: currentAdmin?.email ?? null,
  });

  await logPlatformChange({
    actorAdminId: currentAdmin?.id ?? null,
    actorName,
    actorEmail: currentAdmin?.email ?? null,
    actorRole: currentAdmin?.role ?? null,
    entityType: "district",
    entityId: district.id,
    entityLabel: district.name,
    actionType: "delete_district",
    description: `Видалено район «${district.name}».`,
    metadata: {
      sourceType: "cms",
      sourceModule: "districts",
      mainSectionKey: "settings",
      subSectionKey: "districts",
      entityType: "district",
      entityId: district.id,
      entityTitle: district.name,
      districtId: district.id,
      districtName: district.name,
      districtSlug: district.slug,
      reassignedToDistrictId: defaultDistrict.id,
      reassignedToDistrictSlug: defaultDistrict.slug,
      reassignedHousesCount: housesCount,
    },
  });

  revalidatePath("/admin/districts");
  revalidatePath("/admin/houses");
  revalidatePath("/admin/history");

  return {
    error: null,
    success:
      housesCount > 0
        ? `Район «${district.name}» видалено. Будинків перенесено в «Без району»: ${housesCount}.`
        : `Район «${district.name}» видалено.`,
  };
}
