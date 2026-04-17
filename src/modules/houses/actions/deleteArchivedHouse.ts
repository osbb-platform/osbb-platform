"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { assertRegistryActionAccess } from "@/src/shared/permissions/actionAccess";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";

export type DeleteArchivedHouseState = {
  error: string | null;
  successMessage: string | null;
};

export async function deleteArchivedHouse(
  _prevState: DeleteArchivedHouseState,
  formData: FormData,
): Promise<DeleteArchivedHouseState> {
  const currentUser = await getCurrentAdminUser();
  const accessError = assertRegistryActionAccess({ role: currentUser?.role, area: "houses", action: "delete" });
  if (accessError) return { error: accessError.error, successMessage: null };

  const houseId = String(formData.get("id") ?? "").trim();

  if (!houseId) {
    return {
      error: "Не удалось определить дом для удаления.",
      successMessage: null,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data: house, error: houseError } = await supabase
    .from("houses")
    .select("id, name, slug, archived_at")
    .eq("id", houseId)
    .maybeSingle();

  if (houseError || !house) {
    return {
      error: `Дом не найден: ${houseError?.message ?? "Unknown error"}`,
      successMessage: null,
    };
  }

  if (!house.archived_at) {
    return {
      error: "Окончательно удалить можно только архивный дом.",
      successMessage: null,
    };
  }

  const { error: deletePagesError } = await supabase
    .from("house_pages")
    .delete()
    .eq("house_id", house.id);

  if (deletePagesError) {
    return {
      error: `Не удалось удалить страницы дома перед финальным удалением: ${deletePagesError.message}`,
      successMessage: null,
    };
  }

  const { data: deletedHouse, error: deleteError } = await supabase
    .from("houses")
    .delete()
    .eq("id", house.id)
    .select("id, name, slug")
    .maybeSingle();

  if (deleteError) {
    return {
      error: `Ошибка окончательного удаления дома: ${deleteError.message}`,
      successMessage: null,
    };
  }

  if (!deletedHouse) {
    return {
      error:
        "Дом не был удален. Скорее всего, удаление блокируется связанными записями или у текущего пользователя нет прав на delete для таблицы houses.",
      successMessage: null,
    };
  }

  const currentAdmin = await getCurrentAdminUser();

  await logPlatformChange({
    actorAdminId: currentAdmin?.id ?? null,
    actorName: currentAdmin?.fullName ?? currentAdmin?.email ?? "Администратор",
    actorEmail: currentAdmin?.email ?? null,
    actorRole: currentAdmin?.role ?? null,
    entityType: "house",
    entityId: house.id,
    entityLabel: house.name,
    actionType: "delete_house",
    description: `Дом «${house.name}» удален из системы навсегда.`,
    metadata: {
      sourceType: "cms",
      sourceModule: "houses",
      mainSectionKey: "registry",
      subSectionKey: "archive",
      entityType: "house",
      entityId: house.id,
      entityTitle: house.name,
      houseSlug: house.slug,
      deleteMode: "permanent",
    },
  });

  revalidatePath("/admin/houses");
  revalidatePath("/admin/history");

  return {
    error: null,
    successMessage: `Дом «${house.name}» окончательно удален.`,
  };
}
