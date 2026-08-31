"use server";

import { getAdminHousePlan } from "@/src/modules/houses/services/getAdminHousePlan";

export async function refreshAdminHousePlanSnapshot(params: {
  houseId: string;
}) {
  return getAdminHousePlan({
    houseId: params.houseId,
  });
}
