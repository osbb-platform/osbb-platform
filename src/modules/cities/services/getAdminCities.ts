import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { getCurrentAdminUser } from "@/src/modules/auth/services/getCurrentAdminUser";
import { ROLES } from "@/src/shared/constants/roles/roles.constants";

export type AdminCityListItem = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  districts_count: number;
  employees_count: number;
};

export async function getAdminCities(): Promise<AdminCityListItem[]> {
  noStore();

  const currentUser = await getCurrentAdminUser();

  if (!currentUser || currentUser.role !== ROLES.SUPERADMIN) {
    return [];
  }

  const supabase = await createSupabaseServerClient();

  const [
    { data: cities, error: citiesError },
    { data: districts, error: districtsError },
    { data: memberships, error: membershipsError },
  ] = await Promise.all([
    supabase
      .from("cities")
      .select("id, name, slug, is_active")
      .order("name", { ascending: true }),
    supabase.from("districts").select("id, city_id"),
    supabase
      .from("admin_memberships")
      .select("id, city_id")
      .not("city_id", "is", null),
  ]);

  if (citiesError) {
    throw new Error(`Failed to load cities: ${citiesError.message}`);
  }
  if (districtsError) {
    throw new Error(`Failed to load city districts: ${districtsError.message}`);
  }
  if (membershipsError) {
    throw new Error(`Failed to load city employees: ${membershipsError.message}`);
  }

  const districtCounts = new Map<string, number>();
  for (const district of districts ?? []) {
    if (!district.city_id) continue;
    districtCounts.set(
      district.city_id,
      (districtCounts.get(district.city_id) ?? 0) + 1,
    );
  }

  const employeeCounts = new Map<string, number>();
  for (const membership of memberships ?? []) {
    if (!membership.city_id) continue;
    employeeCounts.set(
      membership.city_id,
      (employeeCounts.get(membership.city_id) ?? 0) + 1,
    );
  }

  return (cities ?? []).map((city) => ({
    id: city.id,
    name: city.name,
    slug: city.slug,
    is_active: Boolean(city.is_active),
    districts_count: districtCounts.get(city.id) ?? 0,
    employees_count: employeeCounts.get(city.id) ?? 0,
  }));
}
