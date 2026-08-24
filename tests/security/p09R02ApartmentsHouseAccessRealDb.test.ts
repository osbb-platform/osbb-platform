import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const enabled = process.env.RUN_P09_R02_REAL_DB === "1";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const dbUrl = process.env.P09_LOCAL_DB_URL ?? "";
const cityAId = process.env.P09_R02_CITY_A_ID ?? "";
const houseAId = process.env.P09_R02_HOUSE_A_ID ?? "";
const houseBId = process.env.P09_R02_HOUSE_B_ID ?? "";
const slugA = process.env.P09_R02_SLUG_A ?? "";
const slugB = process.env.P09_R02_SLUG_B ?? "";
const apartmentAId = process.env.P09_R02_APT_A_ID ?? "";
const apartmentBId = process.env.P09_R02_APT_B_ID ?? "";

const suite = enabled ? describe : describe.skip;

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function psql(sql: string): string {
  return execFileSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-At", "-F", "|", "-c", sql], {
    encoding: "utf8",
  }).trim();
}

suite.sequential("P09 R0.2 apartments + house access isolation", () => {
  const fallbackUrl = "http://127.0.0.1:54321";
  const service = createClient(url || fallbackUrl, serviceKey || "disabled", {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(url || fallbackUrl, anonKey || "disabled", {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const resident = createClient(url || fallbackUrl, anonKey || "disabled", {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const runId = randomUUID().replaceAll("-", "").slice(0, 12);
  const email = `p09-r02-${runId}@example.test`;
  const password = `P09-R02-${runId}-Aa1!`;
  let userId = "";

  beforeAll(async () => {
    if (!url || !anonKey || !serviceKey || !dbUrl || !cityAId || !houseAId || !houseBId || !slugA || !slugB || !apartmentAId || !apartmentBId) {
      throw new Error("P09 R0.2 local test environment is incomplete");
    }
    if ((!url.includes("127.0.0.1") && !url.includes("localhost")) || (!dbUrl.includes("127.0.0.1") && !dbUrl.includes("localhost"))) {
      throw new Error("P09 R0.2 is LOCAL-ONLY");
    }

    const created = await service.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error || !created.data.user) {
      throw new Error(`auth fixture failed: ${created.error?.message ?? "missing user"}`);
    }
    userId = created.data.user.id;

    psql(`
      insert into public.profiles (id, full_name, email, is_active)
      values (${sqlLiteral(userId)}::uuid, 'P09 R02 City Admin A', ${sqlLiteral(email)}, true)
      on conflict (id) do nothing;

      insert into public.admin_memberships (
        user_id, role, house_id, city_id, is_active, status, invite_email, full_name_snapshot
      )
      values (
        ${sqlLiteral(userId)}::uuid, 'admin'::public.admin_role, null,
        ${sqlLiteral(cityAId)}::uuid, true, 'active', ${sqlLiteral(email)}, 'P09 R02 City Admin A'
      );
    `);

    const signIn = await admin.auth.signInWithPassword({ email, password });
    if (signIn.error || !signIn.data.session) {
      throw new Error(`admin sign-in failed: ${signIn.error?.message ?? "missing session"}`);
    }
  }, 30_000);

  afterAll(async () => {
    await admin.auth.signOut();
    if (userId) {
      psql(`
        delete from public.admin_memberships where user_id = ${sqlLiteral(userId)}::uuid;
        delete from public.profiles where id = ${sqlLiteral(userId)}::uuid;
      `);
      await service.auth.admin.deleteUser(userId);
    }
  }, 30_000);

  it("positive control: city admin A reads apartment A", async () => {
    const { data, error } = await admin.from("house_apartments").select("id").eq("id", apartmentAId);
    expect(error).toBeNull();
    expect((data ?? []).map((row) => String(row.id))).toEqual([apartmentAId]);
  });

  it("resident verification A remains available", async () => {
    const { data, error } = await resident.rpc("verify_house_access", {
      target_house_slug: slugA,
      raw_password: "R02-pass-A",
    });
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.is_valid).toBe(true);
  });

  it("city admin A cannot read apartment B", async () => {
    const { data, error } = await admin.from("house_apartments").select("id").eq("id", apartmentBId);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("city admin A cannot update apartment B", async () => {
    const { data, error } = await admin.from("house_apartments").update({ owner_name: "FORBIDDEN" }).eq("id", apartmentBId).select("id");
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("city admin A cannot insert apartment into house B", async () => {
    const { error } = await admin.from("house_apartments").insert({
      house_id: houseBId,
      account_number: `R02-FORBIDDEN-${runId}`,
      apartment_label: `R02-FORBIDDEN-${runId}`,
      owner_name: "Forbidden Owner",
      source_type: "manual",
    });
    expect(error).not.toBeNull();
  });

  it("positive control: city admin A can read house_access A", async () => {
    const { data, error } = await admin.from("house_access").select("house_id,session_version").eq("house_id", houseAId);
    expect(error).toBeNull();
    expect((data ?? []).map((row) => String(row.house_id))).toEqual([houseAId]);
  });

  it("city admin A cannot read house_access B", async () => {
    const { data, error } = await admin.from("house_access").select("house_id").eq("house_id", houseBId);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("city admin A cannot directly update house_access B", async () => {
    const { data, error } = await admin.from("house_access").update({ session_version: 777 }).eq("house_id", houseBId).select("house_id");
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });

  it("city admin A cannot reset house B password through RPC", async () => {
    const before = Number(psql(`select session_version from public.house_access where house_id = ${sqlLiteral(houseBId)}::uuid`));
    const { error } = await admin.rpc("upsert_house_access", {
      target_house_id: houseBId,
      raw_password: "R02-HACKED-B",
    });
    const after = Number(psql(`select session_version from public.house_access where house_id = ${sqlLiteral(houseBId)}::uuid`));
    expect(error).not.toBeNull();
    expect(after).toBe(before);
  });

  it("anonymous caller cannot use admin password-reset RPC", async () => {
    const { error } = await resident.rpc("upsert_house_access", {
      target_house_id: houseBId,
      raw_password: "R02-ANON-HACK",
    });
    expect(error).not.toBeNull();
  });

  it("resident verification B remains functional", async () => {
    const { data, error } = await resident.rpc("verify_house_access", {
      target_house_slug: slugB,
      raw_password: "R02-pass-B",
    });
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.is_valid).toBe(true);
  });
});
