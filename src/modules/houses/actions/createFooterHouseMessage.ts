"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { ensureResidentRequestTask } from "@/src/modules/tasks/services/ensureResidentRequestTask";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";
import { validateHouseSession } from "@/src/modules/houses/services/validateHouseSession";
import { getHouseAccessCookieName } from "@/src/shared/utils/security/getHouseAccessCookieName";

export type CreateFooterHouseMessageState = {
  error: string | null;
  successMessage: string | null;
};

export async function createFooterHouseMessage(
  _prevState: CreateFooterHouseMessageState,
  formData: FormData,
): Promise<CreateFooterHouseMessageState> {
  const houseId = String(formData.get("houseId") ?? "").trim();
  const houseSlug = String(formData.get("houseSlug") ?? "").trim();
  const houseName = String(formData.get("houseName") ?? "").trim();
  const subjectType = String(formData.get("subjectType") ?? "").trim();
  const requesterName = String(formData.get("requesterName") ?? "").trim();
  const requesterEmail = String(formData.get("requesterEmail") ?? "").trim();
  const apartment = String(formData.get("apartment") ?? "").trim();
  const comment = String(formData.get("comment") ?? "").trim();

  if (
    !houseId ||
    !houseSlug ||
    !subjectType ||
    !requesterName ||
    !requesterEmail ||
    !apartment ||
    !comment
  ) {
    return {
      error: "Заповніть ім’я, email, квартиру та повідомлення.",
      successMessage: null,
    };
  }

  const cookieStore = await cookies();
  const sessionToken =
    cookieStore.get(getHouseAccessCookieName(houseSlug))?.value ?? "";

  const hasAccess = sessionToken
    ? await validateHouseSession({
        slug: houseSlug,
        sessionToken,
      })
    : false;

  if (!hasAccess) {
    return {
      error: "Сесію доступу до будинку не підтверджено.",
      successMessage: null,
    };
  }

  const category =
    subjectType === "improvement"
      ? "Пропозиція покращення"
      : "Керуюча компанія";

  const subject =
    subjectType === "improvement"
      ? "footer_improvement"
      : "footer_contact";

  const supabase = await createSupabaseServerClient();

  const { data: insertedRequest, error } = await supabase
    .from("specialist_contact_requests")
    .insert({
      house_id: houseId,
      house_slug: houseSlug,
      category,
      specialist_id: null,
      specialist_label: "Footer / Написати нам",
      requester_name: requesterName,
      requester_email: requesterEmail,
      requester_phone: null,
      apartment,
      subject,
      comment,
      status: "new",
    })
    .select("id")
    .single();

  if (error || !insertedRequest) {
    return {
      error: `Не вдалося надіслати повідомлення: ${error.message}`,
      successMessage: null,
    };
  }

  await ensureResidentRequestTask({
    requestId: insertedRequest.id,
    houseId,
    category,
    requesterName,
    apartment,
  });

  await logPlatformChange({
    actorAdminId: null,
    actorName: requesterName,
    actorEmail: requesterEmail,
    actorRole: "resident_request",
    entityType: "footer_house_message",
    entityId: houseId,
    entityLabel: category,
    actionType: "create_footer_house_message",
    description: `Створено звернення через footer: ${category}.`,
    metadata: {
      sourceType: "house_footer",
      houseId,
      houseSlug,
      houseName: houseName || houseSlug,
      apartment,
      subject,
    },
  });

  revalidatePath(`/house/${houseSlug}`);
  revalidatePath(`/admin/houses`);
  revalidatePath(`/admin/tasks`);
  revalidatePath(`/admin/history`);

  return {
    error: null,
    successMessage:
      "Повідомлення надіслано. Керуюча компанія отримає його в центрі звернень.",
  };
}
