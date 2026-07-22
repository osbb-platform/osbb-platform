import { unstable_cache } from "next/cache";
import { cache } from "react";

import { createSupabasePublicClient } from "@/src/integrations/supabase/server/public";
import {
  throwRequiredPublicReadError,
} from "./publicContentResilience";

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

async function loadPublishedHouseRequisites(
  houseId: string,
): Promise<HouseRequisitesSnapshot | null> {
  const supabase = createSupabasePublicClient();

  const { data, error } = await supabase
    .from("house_requisites")
    .select(
      "id, house_id, recipient, iban, edrpou, bank, purpose_template, payment_url, payment_button_label, lock_version, updated_at",
    )
    .eq("house_id", houseId)
    .maybeSingle();

  if (error) {
    throwRequiredPublicReadError({
      section: "requisites",
      resource: "house_requisites",
      houseId,
      error,
    });
  }

  if (!data) {
    return null;
  }

  return mapRow(data as HouseRequisitesPublicRow);
}

export const getPublishedHouseRequisites = cache(
  async (houseId: string): Promise<HouseRequisitesSnapshot | null> => {
    return unstable_cache(
      () => loadPublishedHouseRequisites(houseId),
      ["published-house-requisites-v2", houseId],
      {
        tags: [`house:${houseId}:requisites`, `house:${houseId}`],
        revalidate: 300,
      },
    )();
  },
);
