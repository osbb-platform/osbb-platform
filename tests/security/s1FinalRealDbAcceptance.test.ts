import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const RUN = process.env.S1_FINAL_REAL_DB === "1";
const URL = process.env.S1_LOCAL_SUPABASE_URL ?? "";
const ANON = process.env.S1_LOCAL_ANON_KEY ?? "";
const SERVICE = process.env.S1_LOCAL_SERVICE_KEY ?? "";

const suite = RUN ? describe : describe.skip;

function sql(query: string): string {
  return execFileSync(
    "psql",
    [
      "-h", "127.0.0.1",
      "-p", "54322",
      "-U", "postgres",
      "-d", "postgres",
      "-X",
      "-qAt",
      "-v", "ON_ERROR_STOP=1",
      "-c", query,
    ],
    {
      encoding: "utf8",
      env: { ...process.env, PGPASSWORD: "postgres" },
    },
  ).trim();
}

function q(value: string): string {
  return "'" + value.replaceAll("'", "''") + "'";
}


type FixtureUser = {
  id: string;
  email: string;
  password: string;
  client: SupabaseClient;
};

const ids = {
  company: crypto.randomUUID(),
  cityA: crypto.randomUUID(),
  cityB: crypto.randomUUID(),
  districtA: crypto.randomUUID(),
  districtB: crypto.randomUUID(),
  houseA: crypto.randomUUID(),
  houseB: crypto.randomUUID(),
  reportA: crypto.randomUUID(),
  pollA: crypto.randomUUID(),
  meetingA: crypto.randomUUID(),
  planA: crypto.randomUUID(),
  reportB: crypto.randomUUID(),
};

let service: SupabaseClient;
let adminA: FixtureUser;
let contentA: FixtureUser;
let invitedA: FixtureUser;
let inactiveA: FixtureUser;
let noMembership: FixtureUser;

async function makeUser(label: string): Promise<FixtureUser> {
  const email = `s1-${label}-${crypto.randomUUID()}@example.test`;
  const password = `S1-${crypto.randomUUID()}-aA1!`;

  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (created.error || !created.data.user) {
    throw created.error ?? new Error(`Failed creating ${label}`);
  }

  const client = createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const signed = await client.auth.signInWithPassword({ email, password });
  if (signed.error) throw signed.error;

  return { id: created.data.user.id, email, password, client };
}

async function deleteUser(user?: FixtureUser) {
  if (!user?.id) return;
  await service.auth.admin.deleteUser(user.id);
}

async function expectRpcFailure(
  client: SupabaseClient,
  fn: string,
  args: Record<string, unknown>,
  expectedCodes?: string[],
) {
  const result = await client.rpc(fn, args);
  expect(result.error).not.toBeNull();

  if (expectedCodes?.length && result.error) {
    expect(expectedCodes).toContain(result.error.code);
  }
}

suite("S1 final real DB acceptance", () => {
  beforeAll(async () => {
    expect(URL).toMatch(/^http:\/\/(127\.0\.0\.1|localhost):/);
    expect(ANON.length).toBeGreaterThan(20);
    expect(SERVICE.length).toBeGreaterThan(20);

    service = createClient(URL, SERVICE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    adminA = await makeUser("admin");
    contentA = await makeUser("content");
    invitedA = await makeUser("invited");
    inactiveA = await makeUser("inactive");
    noMembership = await makeUser("nomembership");

    sql(`
      insert into public.profiles (id, is_active, theme) values
        (${q(adminA.id)}::uuid, true, 'dark'),
        (${q(contentA.id)}::uuid, true, 'dark'),
        (${q(invitedA.id)}::uuid, true, 'dark'),
        (${q(inactiveA.id)}::uuid, true, 'dark'),
        (${q(noMembership.id)}::uuid, true, 'dark')
      on conflict (id) do nothing;

      insert into public.management_companies (id, slug, name, is_active)
      values (${q(ids.company)}::uuid, ${q(`s1-company-${ids.company}`)}, 'S1 Acceptance Company', true);

      insert into public.cities (id, name, slug, is_active) values
        (${q(ids.cityA)}::uuid, ${q(`S1 City A ${ids.cityA}`)}, ${q(`s1-city-a-${ids.cityA}`)}, true),
        (${q(ids.cityB)}::uuid, ${q(`S1 City B ${ids.cityB}`)}, ${q(`s1-city-b-${ids.cityB}`)}, true);

      insert into public.districts (id, city_id, name, slug, theme_color) values
        (${q(ids.districtA)}::uuid, ${q(ids.cityA)}::uuid, ${q(`S1 District A ${ids.districtA}`)}, ${q(`s1-district-a-${ids.districtA}`)}, '#000000'),
        (${q(ids.districtB)}::uuid, ${q(ids.cityB)}::uuid, ${q(`S1 District B ${ids.districtB}`)}, ${q(`s1-district-b-${ids.districtB}`)}, '#111111');

      insert into public.houses (id, district_id, management_company_id, name, slug, address, is_active) values
        (${q(ids.houseA)}::uuid, ${q(ids.districtA)}::uuid, ${q(ids.company)}::uuid, 'S1 House A', ${q(`s1-house-a-${ids.houseA}`)}, 'S1 A', true),
        (${q(ids.houseB)}::uuid, ${q(ids.districtB)}::uuid, ${q(ids.company)}::uuid, 'S1 House B', ${q(`s1-house-b-${ids.houseB}`)}, 'S1 B', true);

      insert into public.admin_memberships (user_id, role, house_id, city_id, is_active, status) values
        (${q(adminA.id)}::uuid, 'admin', null, ${q(ids.cityA)}::uuid, true, 'active'),
        (${q(contentA.id)}::uuid, 'content_manager', null, ${q(ids.cityA)}::uuid, true, 'active'),
        (${q(invitedA.id)}::uuid, 'content_manager', null, ${q(ids.cityA)}::uuid, true, 'invited'),
        (${q(inactiveA.id)}::uuid, 'admin', null, ${q(ids.cityA)}::uuid, false, 'inactive');

      insert into public.house_reports (id, house_id, title, lifecycle_status, created_by) values
        (${q(ids.reportA)}::uuid, ${q(ids.houseA)}::uuid, 'S1 Report A', 'draft', ${q(adminA.id)}::uuid),
        (${q(ids.reportB)}::uuid, ${q(ids.houseB)}::uuid, 'S1 Report B', 'draft', ${q(adminA.id)}::uuid);

      insert into public.house_polls (id, house_id, title, lifecycle_status, poll_status, created_by)
      values (${q(ids.pollA)}::uuid, ${q(ids.houseA)}::uuid, 'S1 Poll A', 'draft', 'idle', ${q(adminA.id)}::uuid);

      insert into public.house_meetings (id, house_id, title, lifecycle_status, meeting_status, display_status, voting_mode, created_by)
      values (${q(ids.meetingA)}::uuid, ${q(ids.houseA)}::uuid, 'S1 Meeting A', 'draft', 'draft', 'draft', 'manual', ${q(adminA.id)}::uuid);

      insert into public.house_plan_tasks (id, house_id, title, lifecycle_status, task_status, priority, date_mode, created_by)
      values (${q(ids.planA)}::uuid, ${q(ids.houseA)}::uuid, 'S1 Plan A', 'draft', 'planned', 'medium', 'deadline', ${q(adminA.id)}::uuid);
    `);
  }, 30_000);
  afterAll(async () => {
    try {
      sql(`
        delete from public.platform_tasks
        where id in (
          select distinct l.task_id from public.platform_task_links l
          where l.entity_id in (${q(ids.reportA)}, ${q(ids.pollA)}, ${q(ids.meetingA)}, ${q(ids.planA)}, ${q(ids.reportB)})
        );

        delete from public.houses where id in (${q(ids.houseA)}::uuid, ${q(ids.houseB)}::uuid);
        delete from public.admin_memberships where user_id in (${q(adminA.id)}::uuid, ${q(contentA.id)}::uuid, ${q(invitedA.id)}::uuid, ${q(inactiveA.id)}::uuid);
        delete from public.districts where id in (${q(ids.districtA)}::uuid, ${q(ids.districtB)}::uuid);
        delete from public.cities where id in (${q(ids.cityA)}::uuid, ${q(ids.cityB)}::uuid);
        delete from public.management_companies where id=${q(ids.company)}::uuid;
      `);
    } finally {
      await Promise.all([
        deleteUser(adminA), deleteUser(contentA), deleteUser(invitedA),
        deleteUser(inactiveA), deleteUser(noMembership),
      ]);
    }
  }, 30_000);

  it("active city admin INSERT ... RETURNING succeeds", async () => {
    const created = await adminA.client
      .from("platform_tasks")
      .insert({
        title: "S1 insert returning",
        task_type: "manual",
        status: "todo",
        is_manual: true,
        created_by: adminA.id,
      })
      .select("id")
      .single();

    expect(created.error).toBeNull();
    expect(created.data?.id).toBeTruthy();

    if (created.data?.id) {
      sql(`delete from public.platform_tasks where id=${q(created.data.id)}::uuid;`);
    }
  });

  it("no-membership, invited and inactive users cannot create platform tasks", async () => {
    for (const user of [noMembership, invitedA, inactiveA]) {
      const created = await user.client
        .from("platform_tasks")
        .insert({
          title: "must reject",
          task_type: "manual",
          status: "todo",
          is_manual: true,
          created_by: user.id,
        })
        .select("id")
        .single();

      expect(created.error).not.toBeNull();
    }
  });

  it("city A admin cannot call generic RPC against city B entity/house", async () => {
    await expectRpcFailure(
      adminA.client,
      "ensure_draft_approval_task",
      {
        p_house_id: ids.houseB,
        p_entity_type: "house_report",
        p_entity_id: ids.reportB,
        p_title: "foreign",
      },
      ["42501"],
    );
  });

  it("generic RPC rejects mismatched house, unsupported type and non-draft entity", async () => {
    await expectRpcFailure(
      adminA.client,
      "ensure_draft_approval_task",
      {
        p_house_id: ids.houseA,
        p_entity_type: "house_report",
        p_entity_id: ids.reportB,
        p_title: "wrong house",
      },
    );

    await expectRpcFailure(
      adminA.client,
      "ensure_draft_approval_task",
      {
        p_house_id: ids.houseA,
        p_entity_type: "arbitrary_entity",
        p_entity_id: ids.reportA,
        p_title: "unsupported",
      },
      ["22023"],
    );

    sql(`update public.house_reports set lifecycle_status='published' where id=${q(ids.reportA)}::uuid;`);

    await expectRpcFailure(
      adminA.client,
      "ensure_draft_approval_task",
      {
        p_house_id: ids.houseA,
        p_entity_type: "house_report",
        p_entity_id: ids.reportA,
        p_title: "not draft",
      },
      ["P0002"],
    );

    sql(`update public.house_reports set lifecycle_status='draft' where id=${q(ids.reportA)}::uuid;`);
  });

  it("content_manager can ensure a draft task only inside its active city scope", async () => {
    const own = await contentA.client.rpc("ensure_draft_approval_task", {
      p_house_id: ids.houseA,
      p_entity_type: "house_poll",
      p_entity_id: ids.pollA,
      p_title: "Content manager allowed draft",
    });

    expect(own.error).toBeNull();
    expect(own.data).toBeTruthy();

    await expectRpcFailure(
      contentA.client,
      "ensure_draft_approval_task",
      {
        p_house_id: ids.houseB,
        p_entity_type: "house_report",
        p_entity_id: ids.reportB,
        p_title: "Content manager foreign city",
      },
      ["42501"],
    );
  });

  it("report/poll/meeting/plan generic draft ensure is idempotent with exact graph", async () => {
    const specs = [
      ["house_report", ids.reportA],
      ["house_poll", ids.pollA],
      ["house_meeting", ids.meetingA],
      ["house_plan_task", ids.planA],
    ] as const;

    for (const [entityType, entityId] of specs) {
      const first = await adminA.client.rpc("ensure_draft_approval_task", {
        p_house_id: ids.houseA,
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_title: `S1 ${entityType}`,
      });
      expect(first.error).toBeNull();

      const second = await adminA.client.rpc("ensure_draft_approval_task", {
        p_house_id: ids.houseA,
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_title: `S1 ${entityType}`,
      });
      expect(second.error).toBeNull();
      expect(second.data).toBe(first.data);

      const taskIds = sql(`
        select task_id::text from public.platform_task_links
        where link_type='draft' and entity_type=${q(entityType)} and entity_id=${q(entityId)};
      `).split("\n").filter(Boolean);
      expect(taskIds).toHaveLength(1);
      const taskId = taskIds[0];
      expect(taskId).toBe(first.data);
      expect(Number(sql(`select count(*) from public.platform_task_houses where task_id=${q(taskId)}::uuid;`))).toBe(1);
      expect(Number(sql(`select count(*) from public.platform_task_events where task_id=${q(taskId)}::uuid and event_type='create';`))).toBe(1);
    }
  });

  it("concurrent double ensure returns one task and leaves one active draft graph", async () => {
    const entityId = crypto.randomUUID();

    sql(`insert into public.house_reports (id,house_id,title,lifecycle_status,created_by)
      values (${q(entityId)}::uuid,${q(ids.houseA)}::uuid,'S1 Concurrent Report','draft',${q(adminA.id)}::uuid);`);

    try {
      const [a, b] = await Promise.all([
        adminA.client.rpc("ensure_draft_approval_task", {
          p_house_id: ids.houseA,
          p_entity_type: "house_report",
          p_entity_id: entityId,
          p_title: "Concurrent report",
        }),
        adminA.client.rpc("ensure_draft_approval_task", {
          p_house_id: ids.houseA,
          p_entity_type: "house_report",
          p_entity_id: entityId,
          p_title: "Concurrent report",
        }),
      ]);

      expect(a.error).toBeNull();
      expect(b.error).toBeNull();
      expect(a.data).toBe(b.data);

      const taskIds = sql(`select task_id::text from public.platform_task_links
        where link_type='draft' and entity_type='house_report' and entity_id=${q(entityId)};`)
        .split("\n").filter(Boolean);
      expect(taskIds).toHaveLength(1);
      const taskId = taskIds[0];
      expect(sql(`select case when deleted_at is null then 'null' else 'set' end from public.platform_tasks where id=${q(taskId)}::uuid;`)).toBe("null");
    } finally {
      sql(`
        delete from public.platform_tasks where id in (
          select task_id from public.platform_task_links where entity_type='house_report' and entity_id=${q(entityId)}
        );
        delete from public.house_reports where id=${q(entityId)}::uuid;
      `);
    }
  });
});
