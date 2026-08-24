import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const enabled = process.env.RUN_P09_R04_REAL_DB === "1";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const dbUrl = process.env.P09_LOCAL_DB_URL ?? "";

const cityAId = process.env.P09_R04_CITY_A_ID ?? "";
const houseAId = process.env.P09_R04_HOUSE_A_ID ?? "";
const houseBId = process.env.P09_R04_HOUSE_B_ID ?? "";
const taskAId = process.env.P09_R04_TASK_A_ID ?? "";
const taskBId = process.env.P09_R04_TASK_B_ID ?? "";
const historyBId = process.env.P09_R04_HISTORY_B_ID ?? "";
const snapshotBId = process.env.P09_R04_SNAPSHOT_B_ID ?? "";
const monthRowBId = process.env.P09_R04_MONTH_ROW_B_ID ?? "";
const legacyBId = process.env.P09_R04_LEGACY_B_ID ?? "";
const settingsBId = process.env.P09_R04_SETTINGS_B_ID ?? "";
const uploadAId = process.env.P09_R04_UPLOAD_A_ID ?? "";
const uploadBId = process.env.P09_R04_UPLOAD_B_ID ?? "";
const bufferRowBId = process.env.P09_R04_BUFFER_ROW_B_ID ?? "";
const commentBId = process.env.P09_R04_COMMENT_B_ID ?? "";
const eventBId = process.env.P09_R04_EVENT_B_ID ?? "";
const linkBId = process.env.P09_R04_LINK_B_ID ?? "";

function literal(v: string) {
  return `'${v.replaceAll("'", "''")}'`;
}

function psql(sql: string) {
  return execFileSync(
    "psql",
    [dbUrl, "-v", "ON_ERROR_STOP=1", "-At", "-c", sql],
    { encoding: "utf8" },
  ).trim();
}

const suite = enabled ? describe : describe.skip;

suite.sequential("P09 R0.4 fail-before-fix", () => {
  const service = createClient(url || "http://127.0.0.1:54321", serviceKey || "disabled", {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(url || "http://127.0.0.1:54321", anonKey || "disabled", {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anon = createClient(url || "http://127.0.0.1:54321", anonKey || "disabled", {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const runId = randomUUID().replaceAll("-", "").slice(0, 10);
  const email = `p09-r04-${runId}@example.test`;
  const password = `P09-R04-${runId}-Aa1!`;
  let userId = "";

  beforeAll(async () => {
    if (
      !url || !anonKey || !serviceKey || !dbUrl || !cityAId ||
      !houseAId || !houseBId || !taskAId || !taskBId
    ) {
      throw new Error("P09 R0.4 local env incomplete");
    }

    const created = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (created.error || !created.data.user) {
      throw created.error ?? new Error("fixture user");
    }
    userId = created.data.user.id;

    psql(`
      insert into public.profiles(id,full_name,email,is_active)
      values (
        ${literal(userId)}::uuid,
        'P09 R04 Admin A',
        ${literal(email)},
        true
      )
      on conflict(id) do nothing;

      insert into public.admin_memberships(
        user_id,role,house_id,city_id,is_active,status,invite_email,full_name_snapshot
      )
      values (
        ${literal(userId)}::uuid,
        'admin'::public.admin_role,
        null,
        ${literal(cityAId)}::uuid,
        true,
        'active',
        ${literal(email)},
        'P09 R04 Admin A'
      );
    `);

    const signed = await admin.auth.signInWithPassword({ email, password });
    if (signed.error || !signed.data.session) throw signed.error ?? new Error("sign-in");
  }, 30_000);

  afterAll(async () => {
    await admin.auth.signOut();
    if (userId) {
      psql(`
        delete from public.admin_memberships where user_id=${literal(userId)}::uuid;
        delete from public.profiles where id=${literal(userId)}::uuid;
      `);
      await service.auth.admin.deleteUser(userId);
    }
  }, 30_000);

  it("positive control: city admin A can read task linked to house A", async () => {
    const { data, error } = await admin
      .from("platform_tasks")
      .select("id")
      .eq("id", taskAId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("city admin A cannot read house B content history", async () => {
    const { data, error } = await admin
      .from("house_content_history")
      .select("id")
      .eq("id", historyBId);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("city admin A cannot read house B debtor snapshot", async () => {
    const { data, error } = await admin
      .from("house_debtor_month_snapshots")
      .select("id")
      .eq("id", snapshotBId);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("city admin A cannot read house B debtor month row", async () => {
    const { data, error } = await admin
      .from("house_debtor_month_rows")
      .select("id")
      .eq("id", monthRowBId);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("city admin A cannot read house B debtor series", async () => {
    const { data, error } = await admin
      .from("house_debtor_series")
      .select("house_id")
      .eq("house_id", houseBId);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("city admin A cannot update legacy debtor item B", async () => {
    const { data, error } = await admin
      .from("house_debtors_items")
      .update({ amount: "999999" })
      .eq("id", legacyBId)
      .select("id");
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("city admin A cannot update debtor settings B", async () => {
    const { data, error } = await admin
      .from("house_debtors_settings")
      .update({ payment_title: "FORBIDDEN" })
      .eq("id", settingsBId)
      .select("id");
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("city admin A cannot read task B linked only to house B", async () => {
    const { data, error } = await admin
      .from("platform_tasks")
      .select("id")
      .eq("id", taskBId);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("city admin A cannot read task-house link B", async () => {
    const { data, error } = await admin
      .from("platform_task_houses")
      .select("task_id")
      .eq("task_id", taskBId);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("city admin A cannot read task comment B", async () => {
    const { data, error } = await admin
      .from("platform_task_comments")
      .select("id")
      .eq("id", commentBId);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("city admin A cannot read task event B", async () => {
    const { data, error } = await admin
      .from("platform_task_events")
      .select("id")
      .eq("id", eventBId);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("city admin A cannot read task link B", async () => {
    const { data, error } = await admin
      .from("platform_task_links")
      .select("id")
      .eq("id", linkBId);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("import buffer positive control: admin A can read upload A", async () => {
    const { data, error } = await admin
      .from("import_buffer_uploads")
      .select("id")
      .eq("id", uploadAId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("import buffer negative control: admin A cannot read upload B", async () => {
    const { data, error } = await admin
      .from("import_buffer_uploads")
      .select("id")
      .eq("id", uploadBId);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("import buffer child negative control: admin A cannot read row B", async () => {
    const { data, error } = await admin
      .from("import_buffer_rows")
      .select("id")
      .eq("id", bufferRowBId);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("city admin A cannot publish legacy debtors draft for house B through RPC", async () => {
    const before = psql(`
      select lifecycle_status
      from public.house_debtors_items
      where id=${literal(legacyBId)}::uuid
    `);

    const { error } = await admin.rpc("publish_house_debtors_draft", {
      p_house_id: houseBId,
    });

    const after = psql(`
      select lifecycle_status
      from public.house_debtors_items
      where id=${literal(legacyBId)}::uuid
    `);

    expect(error).not.toBeNull();
    expect(after).toBe(before);
  });

  it("anonymous caller cannot invoke legacy debtor publish RPC", async () => {
    const { error } = await anon.rpc("publish_house_debtors_draft", {
      p_house_id: houseAId,
    });
    expect(error).not.toBeNull();
  });
});
