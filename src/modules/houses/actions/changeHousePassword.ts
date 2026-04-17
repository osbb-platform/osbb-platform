"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { assertRegistryActionAccess } from "@/src/shared/permissions/actionAccess";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";

type ChangeHousePasswordState = {
  error: string | null;
  successMessage: string | null;
};

function normalizeAccessCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

export async function changeHousePassword(
  _prevState: ChangeHousePasswordState,
  formData: FormData,
): Promise<ChangeHousePasswordState> {
  const currentUser = await getCurrentAdminUser();
  const accessError = assertRegistryActionAccess({
    role: currentUser?.role,
    area: "houses",
    action: "security",
  });

  if (accessError) {
    return { error: accessError.error, successMessage: null };
  }

  const houseId = String(formData.get("houseId") ?? "").trim();
  const houseSlug = String(formData.get("houseSlug") ?? "").trim();
  const oldAccessCode = normalizeAccessCode(
    String(formData.get("oldAccessCode") ?? "").trim(),
  );
  const newAccessCode = normalizeAccessCode(
    String(formData.get("newAccessCode") ?? "").trim(),
  );

  if (!houseId || !houseSlug || !oldAccessCode || !newAccessCode) {
    return {
      error: "Введите текущий и новый 6-значный код доступа.",
      successMessage: null,
    };
  }

  if (oldAccessCode.length !== 6 || newAccessCode.length !== 6) {
    return {
      error: "Оба кода должны содержать ровно 6 цифр.",
      successMessage: null,
    };
  }

  if (oldAccessCode === newAccessCode) {
    return {
      error: "Новый код должен отличаться от текущего.",
      successMessage: null,
    };
  }

  if (!currentUser) {
    return {
      error: "Не удалось определить текущего администратора.",
      successMessage: null,
    };
  }

  const supabase = await createSupabaseServerClient();

  const verificationToken = `verify-${randomUUID()}`;

  const { data: verificationData, error: verificationError } = await supabase.rpc(
    "create_house_session",
    {
      target_house_slug: houseSlug,
      raw_password: oldAccessCode,
      new_session_token: verificationToken,
      ttl_hours: 0,
    },
  );

  if (verificationError) {
    throw new Error(
      `Failed to verify current house access code: ${verificationError.message}`,
    );
  }

  const verificationResult = Array.isArray(verificationData)
    ? verificationData[0]
    : null;

  if (!verificationResult) {
    return {
      error: "Текущий код доступа введен неверно.",
      successMessage: null,
    };
  }

  const { error } = await supabase.rpc("upsert_house_access", {
    target_house_id: houseId,
    raw_password: newAccessCode,
  });

  if (error) {
    return {
      error: `Ошибка смены кода доступа: ${error.message}`,
      successMessage: null,
    };
  }

  const { error: houseUpdateError } = await supabase
    .from("houses")
    .update({
      current_access_code: newAccessCode,
    })
    .eq("id", houseId);

  if (houseUpdateError) {
    return {
      error: `Код обновлен в доступе дома, но не сохранен в CMS-профиле: ${houseUpdateError.message}`,
      successMessage: null,
    };
  }

  await logPlatformChange({
    actorAdminId: currentUser.id,
    actorName: currentUser.fullName,
    actorEmail: currentUser.email,
    actorRole: currentUser.role,
    entityType: "house",
    entityId: houseId,
    entityLabel: houseSlug,
    actionType: "change_access_code",
    description: `Изменен код доступа дома ${houseSlug}.`,
    metadata: {
      houseSlug,
    },
  });

  revalidatePath("/admin/houses");
  revalidatePath(`/admin/houses/${houseId}`);
  revalidatePath(`/house/${houseSlug}`);
  revalidatePath("/admin/history");

  return {
    error: null,
    successMessage: "Новый код доступа успешно сохранен.",
  };
}
