"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { logPlatformChange } from "@/src/modules/history/services/logPlatformChange";

export type CreateCompanyContactRequestState = {
  error: string | null;
  successMessage: string | null;
};

export async function createCompanyContactRequest(
  _prevState: CreateCompanyContactRequestState,
  formData: FormData,
): Promise<CreateCompanyContactRequestState> {
  const requesterName = String(formData.get("requesterName") ?? "").trim();
  const requesterEmail = String(formData.get("requesterEmail") ?? "").trim();
  const requesterPhone = String(formData.get("requesterPhone") ?? "").trim();
  const houseName = String(formData.get("houseName") ?? "").trim();
  const osbbName = String(formData.get("osbbName") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const comment = String(formData.get("comment") ?? "").trim();

  if (!requesterName || !requesterEmail || !houseName || !address) {
    return {
      error: "Заповніть ім’я, email, назву будинку та адресу.",
      successMessage: null,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("company_contact_requests").insert({
    type: "register_house",
    requester_name: requesterName,
    requester_email: requesterEmail,
    requester_phone: requesterPhone || null,
    house_name: houseName,
    osbb_name: osbbName || null,
    address,
    comment: comment || null,
    status: "new",
  });

  if (error) {
    return {
      error: `Не вдалося надіслати заявку: ${error.message}`,
      successMessage: null,
    };
  }

  await logPlatformChange({
    actorAdminId: null,
    actorName: requesterName,
    actorEmail: requesterEmail,
    actorRole: "public_request",
    entityType: "company_contact_request",
    entityId: null,
    entityLabel: houseName,
    actionType: "create_company_contact_request",
    description: `Створено заявку на підключення будинку «${houseName}».`,
    metadata: {
      sourceType: "public_company_page",
      requestType: "register_house",
      houseName,
      osbbName: osbbName || null,
      address,
      requesterPhone: requesterPhone || null,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin/company-pages");
  revalidatePath("/admin/history");

  return {
    error: null,
    successMessage:
      "Заявку надіслано. Ми зв’яжемося з вами для обговорення підключення будинку.",
  };
}
