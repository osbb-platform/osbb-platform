import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const enabled = process.env.RUN_S1_T1_REAL_DB === "1";
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

type FixtureUser = {
  id: string;
  email: string;
  password: string;
  client: SupabaseClient;
};

type Fixture = {
  cityAId: string;
  cityBId: string;
  houseAId: string;
  houseBId: string;
  companyId: string;
};

suite.sequential("S1-T1 platform_tasks INSERT RETURNING — fail-before-fix", () => {
  const service = createClient(
    url || "http://127.0.0.1:54321",
    serviceKey || "disabled",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const users: FixtureUser[] = [];
  let fixture: Fixture | null = null;
  const runId = randomUUID().replaceAll("-", "").slice(0, 12);

  async function createFixtureUser(
    label: string,
    role: "admin" | "content_manager",
    status: "active" | "invited" | "inactive",
    isActive: boolean,
    cityId: string,
  ): Promise<FixtureUser> {
    const email = `s1-t1-${label}-${runId}@example.test`;
    const password = `S1-${label}-${runId}-Aa1!`;

    const created = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (created.error || !created.data.user) {
      throw created.error ?? new Error(`failed to create ${label}`);
    }

    const id = created.data.user.id;

    psql(`
      insert into public.profiles (id, full_name, email, is_active)
      values (
        ${sqlLiteral(id)}::uuid,
        ${sqlLiteral(`S1 T1 ${label}`)},
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
        ${sqlLiteral(id)}::uuid,
        ${sqlLiteral(role)}::public.admin_role,
        null,
        ${sqlLiteral(cityId)}::uuid,
        ${isActive ? "true" : "false"},
        ${sqlLiteral(status)},
        ${sqlLiteral(email)},
        ${sqlLiteral(`S1 T1 ${label}`)}
      );
    `);

    const client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const signed = await client.auth.signInWithPassword({ email, password });
    if (signed.error || !signed.data.session) {
      throw signed.error ?? new Error(`failed to sign in ${label}`);
    }

    const result = { id, email, password, client };
    users.push(result);
    return result;
  }

  beforeAll(async () => {
    if (!url || !anonKey || !serviceKey || !dbUrl) {
      throw new Error("S1-T1 local real-DB environment is incomplete");
    }

    if (
      (!url.includes("127.0.0.1") && !url.includes("localhost")) ||
      (!dbUrl.includes("127.0.0.1") && !dbUrl.includes("localhost"))
    ) {
      throw new Error("S1-T1 is LOCAL-ONLY; refusing non-local database");
    }

    const ids = psql(`
      with city_a as (
        insert into public.cities (name, slug)
        values ('S1 T1 City A ${runId}', 's1-t1-city-a-${runId}')
        returning id
      ),
      city_b as (
        insert into public.cities (name, slug)
        values ('S1 T1 City B ${runId}', 's1-t1-city-b-${runId}')
        returning id
      ),
      company as (
        insert into public.management_companies (name, slug)
        values ('S1 T1 Company ${runId}', 's1-t1-company-${runId}')
        returning id
      ),
      district_a as (
        insert into public.districts (name, slug, theme_color, city_id)
        select
          'S1 T1 District A ${runId}',
          's1-t1-district-a-${runId}',
          '#111111',
          city_a.id
        from city_a
        returning id
      ),
      district_b as (
        insert into public.districts (name, slug, theme_color, city_id)
        select
          'S1 T1 District B ${runId}',
          's1-t1-district-b-${runId}',
          '#222222',
          city_b.id
        from city_b
        returning id
      ),
      house_a as (
        insert into public.houses (
          district_id, name, slug, address, is_active, management_company_id
        )
        select
          district_a.id,
          'S1 T1 House A ${runId}',
          's1-t1-house-a-${runId}',
          'S1 T1 A',
          true,
          company.id
        from district_a, company
        returning id
      ),
      house_b as (
        insert into public.houses (
          district_id, name, slug, address, is_active, management_company_id
        )
        select
          district_b.id,
          'S1 T1 House B ${runId}',
          's1-t1-house-b-${runId}',
          'S1 T1 B',
          true,
          company.id
        from district_b, company
        returning id
      )
      select
        city_a.id,
        city_b.id,
        house_a.id,
        house_b.id,
        company.id
      from city_a, city_b, house_a, house_b, company;
    `);

    const [cityAId, cityBId, houseAId, houseBId, companyId] = ids.split("|");
    fixture = { cityAId, cityBId, houseAId, houseBId, companyId };
  }, 30_000);

  afterAll(async () => {
    for (const user of users) {
      await user.client.auth.signOut();
    }

    // Test may fail after INSERT has committed but before RETURNING is readable.
    // Cleanup by metadata runId through postgres/service context.
    if (fixture) {
      psql(`
        delete from public.platform_tasks
        where metadata ->> 's1_test_run_id' = ${sqlLiteral(runId)};

        delete from public.admin_memberships
        where user_id in (
          ${users.map((user) => `${sqlLiteral(user.id)}::uuid`).join(",") || "null"}
        );

        delete from public.profiles
        where id in (
          ${users.map((user) => `${sqlLiteral(user.id)}::uuid`).join(",") || "null"}
        );

        delete from public.houses
        where id in (
          ${sqlLiteral(fixture.houseAId)}::uuid,
          ${sqlLiteral(fixture.houseBId)}::uuid
        );

        delete from public.districts
        where city_id in (
          ${sqlLiteral(fixture.cityAId)}::uuid,
          ${sqlLiteral(fixture.cityBId)}::uuid
        );

        delete from public.cities
        where id in (
          ${sqlLiteral(fixture.cityAId)}::uuid,
          ${sqlLiteral(fixture.cityBId)}::uuid
        );

        delete from public.management_companies
        where id=${sqlLiteral(fixture.companyId)}::uuid;
      `);
    }

    for (const user of users) {
      await service.auth.admin.deleteUser(user.id);
    }
  }, 30_000);

  it("RED: active city admin can INSERT platform task and read id through RETURNING", async () => {
    if (!fixture) throw new Error("missing fixture");

    const admin = await createFixtureUser(
      "active-admin",
      "admin",
      "active",
      true,
      fixture.cityAId,
    );

    const { data, error } = await admin.client
      .from("platform_tasks")
      .insert({
        title: `S1 T1 active INSERT RETURNING ${runId}`,
        created_by: admin.id,
        task_type: "draft_approval",
        status: "todo",
        is_manual: false,
        metadata: { s1_test_run_id: runId, case: "active-admin" },
      })
      .select("id")
      .single();

    // This assertion is intentionally expected to FAIL before S1-T2.
    expect(error).toBeNull();
    expect(data?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("invited membership is rejected even when is_active=true", async () => {
    if (!fixture) throw new Error("missing fixture");

    const invited = await createFixtureUser(
      "invited-admin",
      "admin",
      "invited",
      true,
      fixture.cityAId,
    );

    const { data, error } = await invited.client
      .from("platform_tasks")
      .insert({
        title: `S1 T1 invited reject ${runId}`,
        created_by: invited.id,
        task_type: "draft_approval",
        status: "todo",
        is_manual: false,
        metadata: { s1_test_run_id: runId, case: "invited-admin" },
      })
      .select("id")
      .single();

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it("inactive membership is rejected", async () => {
    if (!fixture) throw new Error("missing fixture");

    const inactive = await createFixtureUser(
      "inactive-admin",
      "admin",
      "inactive",
      false,
      fixture.cityAId,
    );

    const { data, error } = await inactive.client
      .from("platform_tasks")
      .insert({
        title: `S1 T1 inactive reject ${runId}`,
        created_by: inactive.id,
        task_type: "draft_approval",
        status: "todo",
        is_manual: false,
        metadata: { s1_test_run_id: runId, case: "inactive-admin" },
      })
      .select("id")
      .single();

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it("creator branch does not expose a task after privileged foreign-city house link", async () => {
    if (!fixture) throw new Error("missing fixture");

    const admin = await createFixtureUser(
      "creator-scope-admin",
      "admin",
      "active",
      true,
      fixture.cityAId,
    );

    const taskId = psql(`
      with inserted as (
        insert into public.platform_tasks (
          title,
          created_by,
          task_type,
          status,
          is_manual,
          metadata
        )
        values (
          ${sqlLiteral(`S1 T1 creator scope ${runId}`)},
          ${sqlLiteral(admin.id)}::uuid,
          'draft_approval',
          'todo',
          false,
          jsonb_build_object(
            's1_test_run_id', ${sqlLiteral(runId)},
            'case', 'creator-scope'
          )
        )
        returning id
      )
      select id from inserted;
    `);

    psql(`
      insert into public.platform_task_houses (task_id, house_id)
      values (
        ${sqlLiteral(taskId)}::uuid,
        ${sqlLiteral(fixture.houseBId)}::uuid
      );
    `);

    const { data, error } = await admin.client
      .from("platform_tasks")
      .select("id")
      .eq("id", taskId)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).toBeNull();
  });
  it("city admin A cannot bind an existing task to house in city B", async () => {
    if (!fixture) throw new Error("missing fixture");

    const admin = await createFixtureUser(
      "foreign-city-admin",
      "admin",
      "active",
      true,
      fixture.cityAId,
    );

    const seededTaskId = psql(`
      insert into public.platform_tasks (
        title,
        created_by,
        task_type,
        status,
        is_manual,
        metadata
      )
      values (
        ${sqlLiteral(`S1 T1 foreign city ${runId}`)},
        ${sqlLiteral(admin.id)}::uuid,
        'draft_approval',
        'todo',
        false,
        jsonb_build_object(
          's1_test_run_id', ${sqlLiteral(runId)},
          'case', 'foreign-city'
        )
      )
      returning id;
    `);

    const { data, error } = await admin.client
      .from("platform_task_houses")
      .insert({
        task_id: seededTaskId,
        house_id: fixture.houseBId,
      })
      .select("id");

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});
