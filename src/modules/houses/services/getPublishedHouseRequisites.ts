import { cache } from "react";

import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

import type { HouseRequisitesSnapshot } from "./getAdminHouseRequisites";

type HouseRequisitesPublicRow = {
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

const mapRow = (row: HouseRequisitesPublicRow): HouseRequisitesSnapshot => ({
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

export const getPublishedHouseRequisites = cache(
  async (houseId: string): Promise<HouseRequisitesSnapshot | null> => {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("house_requisites")
      .select(
        "id, house_id, recipient, iban, edrpou, bank, purpose_template, payment_url, payment_button_label, lock_version, updated_at",
      )
      .eq("house_id", houseId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load published house requisites: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return mapRow(data as HouseRequisitesPublicRow);
  },
);
