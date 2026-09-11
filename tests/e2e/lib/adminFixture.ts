import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { e2eEnv } from "./e2eEnv";

export type E2eAdminFixture = {
  userId: string;
  email: string;
  password: string;
  houseId: string;
  houseSlug: string;
  managementCompanyId: string;
  membershipId: string;
};

function serviceClient() {
  return createClient(e2eEnv.supabaseUrl, e2eEnv.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Creates a fresh, disposable local admin account + house scoped only to
// this E2E run. Every browser E2E scenario in tests/e2e/ should create its
// own fixture via this helper and destroy it in a `finally` block so the
// gate is self-contained and repeatable without depending on any specific
// prior session's local data.
export async function createE2eAdminFixture(labelPrefix: string): Promise<E2eAdminFixture> {
  const admin = serviceClient();
  const token = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
  const email = `e2e-${labelPrefix}-${token}@local.test`;
  const password = `E2e!${randomUUID().replace(/-/g, "")}`;

  const managementCompany = await admin
    .from("management_companies")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (managementCompany.error || !managementCompany.data?.id) {
    throw new Error(
      `E2E_FIXTURE_REQUIRES_ONE_MANAGEMENT_COMPANY_ROW: ${managementCompany.error?.message ?? "none found"}`,
    );
  }
  const managementCompanyId = managementCompany.data.id as string;

  // admin_has_house_access() (RLS) only grants a company-wide "admin" access
  // to a house if the admin's admin_memberships.city_id matches the house's
  // district's city_id (see admin_city_scope()/admin_has_house_access() in
  // the DB). A house with no district_id has no city at all and is
  // unreachable by a city-scoped admin, so the fixture must attach both the
  // house and the membership to the same real, existing district/city.
  const district = await admin
    .from("districts")
    .select("id, city_id")
    .not("city_id", "is", null)
    .limit(1)
    .maybeSingle();

  if (district.error || !district.data?.id || !district.data.city_id) {
    throw new Error(
      `E2E_FIXTURE_REQUIRES_ONE_DISTRICT_WITH_CITY_ROW: ${district.error?.message ?? "none found"}`,
    );
  }
  const districtId = district.data.id as string;
  const cityId = district.data.city_id as string;

  const houseInsert = await admin
    .from("houses")
    .insert({
      management_company_id: managementCompanyId,
      district_id: districtId,
      name: `E2E ${labelPrefix} ${token}`,
      slug: `e2e-${labelPrefix}-${token}`,
      address: `E2E ${labelPrefix} fixture address`,
      is_active: true,
    })
    .select("id, slug")
    .single();

  if (houseInsert.error || !houseInsert.data?.id) {
    throw new Error(`E2E_FIXTURE_HOUSE_CREATE_FAILED: ${houseInsert.error?.message ?? "no id"}`);
  }

  const houseId = houseInsert.data.id as string;
  const houseSlug = houseInsert.data.slug as string;

  const userCreate = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (userCreate.error || !userCreate.data.user?.id) {
    await admin.from("houses").delete().eq("id", houseId);
    throw new Error(`E2E_FIXTURE_USER_CREATE_FAILED: ${userCreate.error?.message ?? "no id"}`);
  }

  const userId = userCreate.data.user.id;

  const profileInsert = await admin.from("profiles").insert({
    id: userId,
    full_name: `E2E ${labelPrefix} fixture admin`,
    email,
  });

  if (profileInsert.error) {
    await admin.auth.admin.deleteUser(userId);
    await admin.from("houses").delete().eq("id", houseId);
    throw new Error(`E2E_FIXTURE_PROFILE_CREATE_FAILED: ${profileInsert.error.message}`);
  }

  // The "admin" role is company-wide by product design: getCurrentAdminUser()
  // only resolves an identity/role from admin_memberships rows where
  // house_id IS NULL (confirmed by inspecting every existing local row: all
  // real "admin" memberships are house_id=NULL; only "content_manager" rows
  // are house-scoped). A house-scoped "admin" row is not a real persona and
  // silently fails the (protected) layout's role check, bouncing to /login.
  const membershipInsert = await admin
    .from("admin_memberships")
    .insert({
      user_id: userId,
      role: "admin",
      house_id: null,
      city_id: cityId,
      status: "active",
      is_active: true,
    })
    .select("id")
    .single();

  if (membershipInsert.error || !membershipInsert.data?.id) {
    await admin.auth.admin.deleteUser(userId);
    await admin.from("houses").delete().eq("id", houseId);
    throw new Error(`E2E_FIXTURE_MEMBERSHIP_CREATE_FAILED: ${membershipInsert.error?.message ?? "no id"}`);
  }

  return {
    userId,
    email,
    password,
    houseId,
    houseSlug,
    managementCompanyId,
    membershipId: membershipInsert.data.id as string,
  };
}

export async function destroyE2eAdminFixture(fixture: E2eAdminFixture): Promise<void> {
  const admin = serviceClient();
  // House delete cascades to house_polls/house_meetings/house_apartments/etc.
  await admin.from("houses").delete().eq("id", fixture.houseId);
  await admin.from("admin_memberships").delete().eq("id", fixture.membershipId);
  await admin.from("profiles").delete().eq("id", fixture.userId);
  await admin.auth.admin.deleteUser(fixture.userId);
}
