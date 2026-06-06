import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { getAdminHouseById } from "@/src/modules/houses/services/getAdminHouseById";

import type { AdminCommand } from "./types/commands";
import type { HandlerContext } from "./types/pipeline";
import { err, ok } from "./types/result";
import type { Result } from "./types/result";

export async function buildHandlerContext(
  command: AdminCommand,
): Promise<Result<HandlerContext>> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentAdminUser();

  if (!user) {
    return err("Потрібна авторизація адміністратора.", "UNAUTHENTICATED");
  }

  let house;
  try {
    house = await getAdminHouseById(command.houseId);
  } catch (error) {
    console.error("buildHandlerContext house load error:", error);
    return err("Будинок не знайдено.", "NOT_FOUND");
  }

  if (!house) {
    return err("Будинок не знайдено.", "NOT_FOUND");
  }

  return ok({
    supabase,
    command,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
    house: {
      id: house.id,
      slug: house.slug,
      name: house.name,
    },
  });
}
