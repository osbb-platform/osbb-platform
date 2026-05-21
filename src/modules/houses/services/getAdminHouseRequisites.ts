import { unstable_noStore as noStore } from "next/cache";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type HouseRequisitesSnapshot = {
  id: string;
  houseId: string;
  recipient: string;
  iban: string;
  edrpou: string;
  bank: string;
  purposeTemplate: string;
  paymentUrl: string;
  paymentButtonLabel: string;
  lockVersion: number;
  updatedAt: string;
};

type HouseRequisitesRow = {
  id: string;
  house_id: string;
  recipient: string;
  iban: string;
  edrpou: string;
  bank: string;
  purpose_template: string;
  payment_url: string;
  payment_button_label: string;
  lock_version: number;
  updated_at: string;
};

const mapRow = (row: HouseRequisitesRow): HouseRequisitesSnapshot => ({
  id: row.id,
  houseId: row.house_id,
  recipient: row.recipient,
  iban: row.iban,
  edrpou: row.edrpou,
  bank: row.bank,
  purposeTemplate: row.purpose_template,
  paymentUrl: row.payment_url,
  paymentButtonLabel: row.payment_button_label,
  lockVersion: row.lock_version,
  updatedAt: row.updated_at,
});

export async function getAdminHouseRequisites(params: {
  houseId: string;
}): Promise<HouseRequisitesSnapshot> {
  noStore();

  const supabase = await createSupabaseServerClient();

  const { data: existing, error: existingError } = await supabase
    .from("house_requisites")
    .select("*")
    .eq("house_id", params.houseId)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to load admin house requisites: ${existingError.message}`);
  }

  if (existing) {
    return mapRow(existing as HouseRequisitesRow);
  }

  const { data: created, error: createError } = await supabase
    .from("house_requisites")
    .insert({
      house_id: params.houseId,
    })
    .select("*")
    .single();

  if (createError) {
    throw new Error(`Failed to create admin house requisites: ${createError.message}`);
  }

  return mapRow(created as HouseRequisitesRow);
}
