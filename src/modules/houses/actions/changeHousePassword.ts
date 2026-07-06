"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

import { createSupabaseActionClient } from "@/src/integrations/supabase/server/action";
import { createSupabaseAdminClient } from "@/src/integrations/supabase/server/admin";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";
import { assertRegistryActionAccess } from "@/src/shared/permissions/actionAccess";

type ChangeHousePasswordState = {
  error: string | null;
  successMessage: string | null;
};

type HouseSessionVerificationResult = {
  house_id?: unknown;
  house_slug?: unknown;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeAccessCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

export async function changeHousePassword(
  _prevState: ChangeHousePasswordState,
  formData: FormData,
): Promise<ChangeHousePasswordState> {
  const currentUser = await getCurrentAdminUser();

  if (!currentUser) {
    return {
      error:
        "Не удалось определить текущего администратора.",
      successMessage: null,
    };
  }

  const accessError = assertRegistryActionAccess({
    role: currentUser.role,
    area: "houses",
    action: "security",
  });

  if (accessError) {
    return {
      error: accessError.error,
      successMessage: null,
    };
  }

  const houseId =
    String(formData.get("houseId") ?? "").trim();

  const houseSlug =
    String(formData.get("houseSlug") ?? "").trim();

  const oldAccessCode = normalizeAccessCode(
    String(
      formData.get("oldAccessCode") ?? "",
    ).trim(),
  );

  const newAccessCode = normalizeAccessCode(
    String(
      formData.get("newAccessCode") ?? "",
    ).trim(),
  );

  if (
    !houseId
    || !houseSlug
    || !oldAccessCode
    || !newAccessCode
  ) {
    return {
      error:
        "Введите текущий и новый 6-значный код доступа.",
      successMessage: null,
    };
  }

  if (!UUID_PATTERN.test(houseId)) {
    return {
      error: "Некорректный идентификатор дома.",
      successMessage: null,
    };
  }

  if (
    oldAccessCode.length !== 6
    || newAccessCode.length !== 6
  ) {
    return {
      error:
        "Оба кода должны содержать ровно 6 цифр.",
      successMessage: null,
    };
  }

  if (oldAccessCode === newAccessCode) {
    return {
      error:
        "Новый код должен отличаться от текущего.",
      successMessage: null,
    };
  }

  /*
   * This client carries auth.uid(). The database predicate checks
   * global scope or membership in this exact house before privileged
   * operations start.
   */
  const scopeClient =
    await createSupabaseActionClient();

  const {
    data: hasHouseAccess,
    error: houseAccessError,
  } = await scopeClient.rpc(
    "admin_has_house_access",
    {
      target_house_id: houseId,
    },
  );

  if (houseAccessError) {
    console.error(
      "[house-access] Exact scope check failed",
      {
        code: houseAccessError.code,
        houseId,
      },
    );

    return {
      error:
        "Не удалось проверить права доступа к дому.",
      successMessage: null,
    };
  }

  if (hasHouseAccess !== true) {
    return {
      error:
        "У вас недостаточно прав для изменения кода этого дома.",
      successMessage: null,
    };
  }

  const supabase = createSupabaseAdminClient();
  const verificationToken =
    `verify-${randomUUID()}`;

  const {
    data: verificationData,
    error: verificationError,
  } = await supabase.rpc(
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
      "Failed to verify current house access code: "
        + verificationError.message,
    );
  }

  const verificationResult =
    Array.isArray(verificationData)
      ? (
          verificationData[0] as
            | HouseSessionVerificationResult
            | undefined
        ) ?? null
      : null;

  if (!verificationResult) {
    return {
      error:
        "Текущий код доступа введен неверно.",
      successMessage: null,
    };
  }

  /*
   * Hidden form fields are untrusted. Old-code verification must
   * resolve to the exact same house ID and slug.
   */
  if (
    verificationResult.house_id !== houseId
    || verificationResult.house_slug !== houseSlug
  ) {
    console.error(
      "[house-access] Verification target mismatch",
      {
        requestedHouseId: houseId,
        requestedHouseSlug: houseSlug,
        verifiedHouseId:
          verificationResult.house_id,
        verifiedHouseSlug:
          verificationResult.house_slug,
      },
    );

    return {
      error:
        "Не удалось подтвердить соответствие дома и кода доступа.",
      successMessage: null,
    };
  }

  const { error: accessUpdateError } =
    await supabase.rpc(
      "upsert_house_access",
      {
        target_house_id: houseId,
        raw_password: newAccessCode,
      },
    );

  if (accessUpdateError) {
    return {
      error:
        "Ошибка смены кода доступа: "
        + accessUpdateError.message,
      successMessage: null,
    };
  }

  const { error: houseUpdateError } =
    await supabase
      .from("houses")
      .update({
        current_access_code: newAccessCode,
      })
      .eq("id", houseId)
      .eq("slug", houseSlug);

  if (houseUpdateError) {
    return {
      error:
        "Код обновлен в доступе дома, "
        + "но не сохранен в CMS-профиле: "
        + houseUpdateError.message,
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
    description:
      `Изменен код доступа дома ${houseSlug}.`,
    houseId,
    metadata: {
      houseId,
      houseSlug,
    },
  });

  revalidatePath("/admin/houses");
  revalidatePath(`/admin/houses/${houseId}`);
  revalidatePath(`/house/${houseSlug}`);
  revalidatePath("/admin/history");

  return {
    error: null,
    successMessage:
      "Новый код доступа успешно сохранен.",
  };
}
