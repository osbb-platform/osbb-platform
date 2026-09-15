import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { getAdminCityContext } from "@/src/modules/auth/services/getAdminCityContext";
import { getAdminHouseById } from "@/src/modules/houses/services/getAdminHouseById";

import type { AdminCommand } from "./types/commands";
import type { HandlerContext } from "./types/pipeline";
import { err, ok } from "./types/result";
import type { Result } from "./types/result";

export async function buildHandlerContext(
  command: AdminCommand,
): Promise<Result<HandlerContext>> {
  let supabase;
  let user;

  try {
    [supabase, user] = await Promise.all([
      createSupabaseServerClient(),
      getCurrentAdminUser(),
    ]);
  } catch {
    console.error("HANDLER_CONTEXT_FAILED", { stage: "authentication" });
    return err(
      "Тимчасово не вдалося перевірити сесію. Спробуйте ще раз.",
      "INTERNAL",
    );
  }

  if (!user) {
    return err("Потрібна авторизація адміністратора.", "UNAUTHENTICATED");
  }

  let cityContext;
  try {
    cityContext = await getAdminCityContext();
  } catch {
    console.error("HANDLER_CONTEXT_FAILED", { stage: "city_context" });
    return err(
      "Тимчасово не вдалося завантажити контекст міста. Спробуйте ще раз.",
      "INTERNAL",
    );
  }

  if (!cityContext) {
    return err(
      "Оберіть активне місто для роботи в адмін-панелі.",
      "FORBIDDEN",
    );
  }

  let house;
  try {
    house = await getAdminHouseById(command.houseId);
  } catch {
    console.error("HANDLER_CONTEXT_FAILED", { stage: "house" });
    return err(
      "Тимчасово не вдалося завантажити будинок. Спробуйте ще раз.",
      "INTERNAL",
    );
  }

  if (!house) {
    return err("Будинок не знайдено.", "NOT_FOUND");
  }

  if (!house.district?.city_id || house.district.city_id !== cityContext.cityId) {
    return err(
      "Будинок недоступний у поточному міському контексті.",
      "FORBIDDEN",
    );
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
    city: {
      id: cityContext.cityId,
      name: cityContext.cityName,
      slug: cityContext.citySlug,
    },
  });
}
