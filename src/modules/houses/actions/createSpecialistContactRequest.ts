"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { ensureSpecialistRequestTask } from "@/src/modules/tasks/services/ensureSpecialistRequestTask";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";
import { validateHouseSession } from "@/src/modules/houses/services/validateHouseSession";
import { getHouseAccessCookieName } from "@/src/shared/utils/security/getHouseAccessCookieName";

type CreateSpecialistContactRequestState = {
  error: string | null;
  successMessage: string | null;
};

export async function createSpecialistContactRequest(
  _prevState: CreateSpecialistContactRequestState,
  formData: FormData,
): Promise<CreateSpecialistContactRequestState> {
  const houseId = String(formData.get("houseId") ?? "").trim();
  const houseSlug = String(formData.get("houseSlug") ?? "").trim();
  const houseName = String(formData.get("houseName") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const specialistId = String(formData.get("specialistId") ?? "").trim();
  const specialistLabel = String(formData.get("specialistLabel") ?? "").trim();
  const requesterName = String(formData.get("requesterName") ?? "").trim();
  const requesterEmail = String(formData.get("requesterEmail") ?? "").trim();
  const requesterPhone = String(formData.get("requesterPhone") ?? "").trim();
  const apartment = String(formData.get("apartment") ?? "").trim();
  const rawSubject = String(formData.get("subject") ?? "").trim();
  const subject =
    rawSubject ||
    `Заявка на зв’язок зі спеціалістом: ${specialistLabel || category || "Спеціаліст"}`;
  const comment = String(formData.get("comment") ?? "").trim();

  if (
    !houseId ||
    !houseSlug ||
    !category ||
    !specialistLabel ||
    !requesterName ||
    !requesterEmail ||
    !apartment
  ) {
    return {
      error: "Заповніть ім’я, email та квартиру.",
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

  const supabase = await createSupabaseServerClient();

  const { data: insertedRequest, error } = await supabase
    .from("specialist_contact_requests")
    .insert({
      house_id: houseId,
      house_slug: houseSlug,
      category,
      specialist_id: specialistId || null,
      specialist_label: specialistLabel,
      requester_name: requesterName,
      requester_email: requesterEmail,
      requester_phone: requesterPhone || null,
      apartment,
      subject,
      comment: comment || null,
      status: "new",
    })
    .select("id")
    .single();

  if (error || !insertedRequest) {
    return {
      error: `Не вдалося зберегти заявку: ${error.message}`,
      successMessage: null,
    };
  }

  await ensureSpecialistRequestTask({
    requestId: insertedRequest.id,
    houseId,
    specialistLabel,
    requesterName,
    apartment,
  });

  await logPlatformChange({
    actorAdminId: null,
    actorName: requesterName,
    actorEmail: requesterEmail,
    actorRole: "resident_request",
    entityType: "specialist_contact_request",
    entityId: specialistId || null,
    entityLabel: specialistLabel,
    actionType: "create_specialist_contact_request",
    description: `Створено заявку до спеціаліста: ${specialistLabel}.`,
    metadata: {
      sourceType: "house_portal",
      houseId,
      houseSlug,
      houseName: houseName || houseSlug,
      category,
      apartment,
      subject,
      requesterPhone: requesterPhone || null,
    },
  });

  revalidatePath(`/house/${houseSlug}/specialists`);
  revalidatePath(`/admin/tasks`);
  revalidatePath(`/admin/history`);
  revalidatePath(`/admin/houses/${houseId}?block=specialists`);

  return {
    error: null,
    successMessage:
      "Заявку надіслано. Керуюча компанія отримає її в CMS та зв’яжеться з вами.",
  };
}
