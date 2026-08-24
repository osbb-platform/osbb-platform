import "server-only";

import { cache } from "react";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";

export type AdminCityOption = {
  id: string;
  name: string;
  slug: string;
};

export const getAdminCityOptions = cache(
  async (): Promise<AdminCityOption[]> => {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("cities")
      .select("id, name, slug")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("getAdminCityOptions error:", error.message);
      return [];
    }

    return (data ?? []).map((city) => ({
      id: String(city.id),
      name: String(city.name),
      slug: String(city.slug),
    }));
  },
);
