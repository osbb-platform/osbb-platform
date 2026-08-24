import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";

import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const enabled = process.env.RUN_P09_R0_REAL_DB === "1";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const dbUrl = process.env.P09_LOCAL_DB_URL ?? "";

const suite = enabled ? describe : describe.skip;

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function psql(sql: string): string {
  return execFileSync(
    "psql",
    [dbUrl, "-v", "ON_ERROR_STOP=1", "-At", "-F", "|", "-c", sql],
    { encoding: "utf8" },
  ).trim();
}

type Fixture = {
  userId: string;
  cityAId: string;
  cityBId: string;
  districtAId: string;
  districtBId: string;
  houseAId: string;
  houseBId: string;
  companyId: string;
};

suite.sequential("P09 R0.1 city tenant isolation — real database", () => {
  const service = createClient(
    url || "http://127.0.0.1:54321",
    serviceKey || "disabled",
    {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const scoped = createClient(
    url || "http://127.0.0.1:54321",
    anonKey || "disabled",
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );

  const runId = randomUUID().replaceAll("-", "").slice(0, 12);
  const email = `p09-r0-${runId}@example.test`;
  const password = `P09-${runId}-Aa1!`;
  let fixture: Fixture | null = null;

  beforeAll(async () => {
    if (!url || !anonKey || !serviceKey || !dbUrl) {
      throw new Error("P09 R0 local test environment is incomplete");
    }

    if (
      (!url.includes("127.0.0.1") && !url.includes("localhost")) ||
      (!dbUrl.includes("127.0.0.1") && !dbUrl.includes("localhost"))
    ) {
      throw new Error("P09 R0 real-DB tests are LOCAL-ONLY");
    }

    const created = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (created.error || !created.data.user) {
      throw new Error(
        `auth fixture failed: ${created.error?.message ?? "missing user"}`,
      );
    }

    const userId = created.data.user.id;

    const ids = psql(`
      with city_a as (
        insert into public.cities (name, slug)
        values (
          'P09 City A ${runId}',
          'p09-city-a-${runId}'
        )
        returning id
      ),
      city_b as (
        insert into public.cities (name, slug)
        values (
          'P09 City B ${runId}',
          'p09-city-b-${runId}'
        )
        returning id
      ),
      company as (
        insert into public.management_companies (name, slug)
        values (
          'P09 Company ${runId}',
          'p09-company-${runId}'
        )
        returning id
      ),
      district_a as (
        insert into public.districts (name, slug, theme_color, city_id)
        select
          'P09 District A ${runId}',
          'p09-district-a-${runId}',
          '#111111',
          city_a.id
        from city_a
        returning id
      ),
      district_b as (
        insert into public.districts (name, slug, theme_color, city_id)
        select
          'P09 District B ${runId}',
          'p09-district-b-${runId}',
          '#222222',
          city_b.id
        from city_b
        returning id
      ),
      house_a as (
        insert into public.houses (
          district_id,
          name,
          slug,
          address,
          is_active,
          management_company_id
        )
        select
          district_a.id,
          'P09 House A ${runId}',
          'p09-house-a-${runId}',
          'P09 A',
          true,
          company.id
        from district_a, company
        returning id
      ),
      house_b as (
        insert into public.houses (
          district_id,
          name,
          slug,
          address,
          is_active,
          management_company_id
        )
        select
          district_b.id,
          'P09 House B ${runId}',
          'p09-house-b-${runId}',
          'P09 B',
          true,
          company.id
        from district_b, company
        returning id
      )
      select
        city_a.id,
        city_b.id,
        district_a.id,
        district_b.id,
        house_a.id,
        house_b.id,
        company.id
      from city_a, city_b, district_a, district_b, house_a, house_b, company;
    `);

    const [
      cityAId,
      cityBId,
      districtAId,
      districtBId,
      houseAId,
      houseBId,
      companyId,
    ] = ids.split("|");

    psql(`
      insert into public.profiles (id, full_name, email, is_active)
      values (
        ${sqlLiteral(userId)}::uuid,
        'P09 City Admin A',
        ${sqlLiteral(email)},
        true
      )
      on conflict (id) do nothing;

      insert into public.admin_memberships (
        user_id,
        role,
        house_id,
        city_id,
        is_active,
        status,
        invite_email,
        full_name_snapshot
      )
      values (
        ${sqlLiteral(userId)}::uuid,
        'admin'::public.admin_role,
        null,
        ${sqlLiteral(cityAId)}::uuid,
        true,
        'active',
        ${sqlLiteral(email)},
        'P09 City Admin A'
      );
    `);

    const signIn = await scoped.auth.signInWithPassword({ email, password });

    if (signIn.error || !signIn.data.session) {
      throw new Error(
        `fixture sign-in failed: ${signIn.error?.message ?? "missing session"}`,
      );
    }

    fixture = {
      userId,
      cityAId,
      cityBId,
      districtAId,
      districtBId,
      houseAId,
      houseBId,
      companyId,
    };
  }, 30_000);

  afterAll(async () => {
    await scoped.auth.signOut();
    if (!fixture) return;

    psql(`
      delete from public.admin_memberships
      where user_id = ${sqlLiteral(fixture.userId)}::uuid;

      delete from public.profiles
      where id = ${sqlLiteral(fixture.userId)}::uuid;

      delete from public.houses
      where id in (
        ${sqlLiteral(fixture.houseAId)}::uuid,
        ${sqlLiteral(fixture.houseBId)}::uuid
      );

      delete from public.districts
      where id in (
        ${sqlLiteral(fixture.districtAId)}::uuid,
        ${sqlLiteral(fixture.districtBId)}::uuid
      );

      delete from public.cities
      where id in (
        ${sqlLiteral(fixture.cityAId)}::uuid,
        ${sqlLiteral(fixture.cityBId)}::uuid
      );

      delete from public.management_companies
      where id = ${sqlLiteral(fixture.companyId)}::uuid;
    `);

    await service.auth.admin.deleteUser(fixture.userId);
  }, 30_000);

  it("positive control: city admin A reads house A", async () => {
    if (!fixture) throw new Error("fixture missing");

    const { data, error } = await scoped
      .from("houses")
      .select("id")
      .eq("id", fixture.houseAId);

    expect(error).toBeNull();
    expect((data ?? []).map((row) => String(row.id))).toEqual([
      fixture.houseAId,
    ]);
  });

  it("city admin A cannot read house B by direct authenticated query", async () => {
    if (!fixture) throw new Error("fixture missing");

    const { data, error } = await scoped
      .from("houses")
      .select("id")
      .eq("id", fixture.houseBId);

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("city admin A cannot read district B by direct authenticated query", async () => {
    if (!fixture) throw new Error("fixture missing");

    const { data, error } = await scoped
      .from("districts")
      .select("id")
      .eq("id", fixture.districtBId);

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("city admin A cannot update district B by direct authenticated query", async () => {
    if (!fixture) throw new Error("fixture missing");

    const { data, error } = await scoped
      .from("districts")
      .update({ theme_color: "#333333" })
      .eq("id", fixture.districtBId)
      .select("id");

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("city admin A sees only its own city", async () => {
    if (!fixture) throw new Error("fixture missing");

    const { data, error } = await scoped
      .from("cities")
      .select("id")
      .in("id", [fixture.cityAId, fixture.cityBId]);

    expect(error).toBeNull();
    expect((data ?? []).map((row) => String(row.id))).toEqual([
      fixture.cityAId,
    ]);
  });
});
