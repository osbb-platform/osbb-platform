import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const enabled = process.env.RUN_P09_R03_REAL_DB === "1";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const dbUrl = process.env.P09_LOCAL_DB_URL ?? "";
const cityAId = process.env.P09_R03_CITY_A_ID ?? "";
const houseAId = process.env.P09_R03_HOUSE_A_ID ?? "";
const houseBId = process.env.P09_R03_HOUSE_B_ID ?? "";

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

suite.sequential("P09 R0.3 clean fail-before-fix", () => {
  const service = createClient(url || "http://127.0.0.1:54321", serviceKey || "disabled", { auth: { persistSession: false } });
  const admin = createClient(url || "http://127.0.0.1:54321", anonKey || "disabled", { auth: { persistSession: false } });

  const runId = randomUUID().replaceAll("-", "").slice(0, 10);
  const email = `p09-r03v2-${runId}@example.test`;
  const password = `P09-R03V2-${runId}-Aa1!`;
  let userId = "";

  beforeAll(async () => {
    if (!url || !anonKey || !serviceKey || !dbUrl || !cityAId || !houseAId || !houseBId) {
      throw new Error("P09 R0.3 env incomplete");
    }

    const created = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (created.error || !created.data.user) throw created.error ?? new Error("fixture user");
    userId = created.data.user.id;

    psql(`
      insert into public.profiles(id,full_name,email,is_active)
      values (${literal(userId)}::uuid,'P09 R03V2 Admin A',${literal(email)},true)
      on conflict(id) do nothing;

      insert into public.admin_memberships(
        user_id,role,house_id,city_id,is_active,status,invite_email,full_name_snapshot
      )
      values (
        ${literal(userId)}::uuid,'admin'::public.admin_role,null,
        ${literal(cityAId)}::uuid,true,'active',${literal(email)},'P09 R03V2 Admin A'
      );
    `);

    const signed = await admin.auth.signInWithPassword({ email, password });
    if (signed.error) throw signed.error;
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

  it("positive control: city admin A can read house A", async () => {
    const { data, error } = await admin.from("houses").select("id").eq("id", houseAId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  const updatedAtTables = [
    "house_announcements",
    "house_board_intro",
    "house_faq",
    "house_hero",
    "house_home_widgets",
    "house_meetings",
    "house_polls",
    "house_reports",
    "house_requisites",
    "house_specialists",
  ] as const;

  for (const table of updatedAtTables) {
    it(`${table}: admin city A cannot update house B`, async () => {
      const { data, error } = await admin
        .from(table)
        .update({ updated_at: new Date().toISOString() })
        .eq("house_id", houseBId)
        .select("house_id");

      expect(error).toBeNull();
      expect(data ?? []).toHaveLength(0);
    });
  }

  it("house_specialists_categories: admin city A cannot update house B", async () => {
    const { data, error } = await admin
      .from("house_specialists_categories")
      .update({ sort_order: 999 })
      .eq("house_id", houseBId)
      .select("house_id");

    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });
});
