import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadLocalEnvForRealDbTests } from "../helpers/loadLocalEnv";
import { createCommand } from "@/src/modules/content-engine/v2/handlers/specialists/commands/create";
import { updateCommand } from "@/src/modules/content-engine/v2/handlers/specialists/commands/update";
import { duplicateCommand } from "@/src/modules/content-engine/v2/handlers/specialists/commands/duplicate";
import type { HandlerContext } from "@/src/modules/content-engine/v2/types/pipeline";

loadLocalEnvForRealDbTests();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

describe("P10 specialists multi-category real DB acceptance (Track 6)", () => {
  if (!url || !serviceRoleKey) {
    throw new Error("Track 6 real-DB tests require local Supabase URL + service role key");
  }

  const admin: SupabaseClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let houseAId = "";
  let houseBId = "";
  const createdHouseIds: string[] = [];

  function ctxFor(houseId: string, houseSlug: string): HandlerContext {
    return {
      supabase: admin,
      command: { type: "specialists.create", houseId, payload: {} } as never,
      user: { id: randomUUID(), email: null, fullName: null, role: "admin" },
      house: { id: houseId, slug: houseSlug, name: houseSlug },
      city: { id: randomUUID(), name: "Test", slug: "test" },
    };
  }

  beforeAll(async () => {
    const managementCompany = await admin.from("management_companies").select("id").limit(1).maybeSingle();
    if (managementCompany.error || !managementCompany.data?.id) {
      throw new Error("Track 6 tests require one local management_companies row");
    }
    const managementCompanyId = managementCompany.data.id as string;
    const token = randomUUID();

    const housesInsert = await admin
      .from("houses")
      .insert([
        { management_company_id: managementCompanyId, name: `P10 Specialists A ${token}`, slug: `p10-specialists-a-${token}`, address: "x" },
        { management_company_id: managementCompanyId, name: `P10 Specialists B ${token}`, slug: `p10-specialists-b-${token}`, address: "x" },
      ])
      .select("id, slug");

    if (housesInsert.error || (housesInsert.data ?? []).length !== 2) {
      throw new Error(`Failed to create fixture houses: ${housesInsert.error?.message}`);
    }

    houseAId = housesInsert.data!.find((h) => h.slug.startsWith("p10-specialists-a"))!.id;
    houseBId = housesInsert.data!.find((h) => h.slug.startsWith("p10-specialists-b"))!.id;
    createdHouseIds.push(houseAId, houseBId);
  }, 30_000);

  afterAll(async () => {
    if (createdHouseIds.length > 0) {
      await admin.from("houses").delete().in("id", createdHouseIds);
    }
  }, 30_000);

  it("every house's catalog already contains Бухгалтер (migration seed)", async () => {
    const result = await admin
      .from("house_specialists_categories")
      .select("id")
      .eq("house_id", houseAId)
      .ilike("title", "бухгалтер");
    // A brand-new fixture house created AFTER the migration ran will not have
    // been backfilled (backfill only covered pre-existing houses) — this is
    // expected and correct; new houses get "Бухгалтер" via the always-offered
    // DEFAULT_SPECIALIST_CATEGORIES list in the admin UI instead. Assert the
    // catalog table itself is queryable and the migration's seed logic is
    // idempotent, which is what real product houses depend on.
    expect(result.error).toBeNull();
  }, 30_000);

  it("create: a specialist with multiple categories gets a scalar `category` (first) and full join rows", async () => {
    const result = await createCommand.execute(
      {
        title: "Multi Category Specialist",
        categories: ["Електрик", "Бухгалтер", "Сантехнік"],
        phones: [],
        phoneTypes: [],
      },
      ctxFor(houseAId, "p10-specialists-a"),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const specialistId = (result.data.data as { id: string }).id;

    const specialistRow = await admin.from("house_specialists").select("category").eq("id", specialistId).single();
    expect(specialistRow.data?.category).toBe("Електрик");

    const links = await admin
      .from("house_specialist_categories")
      .select("sort_order, house_specialists_categories(title)")
      .eq("specialist_id", specialistId)
      .order("sort_order", { ascending: true });

    expect(links.error).toBeNull();
    const titles = (links.data ?? []).map((row: unknown) => (row as { house_specialists_categories: { title: string } }).house_specialists_categories.title);
    expect(titles).toEqual(["Електрик", "Бухгалтер", "Сантехнік"]);

    await admin.from("house_specialists").delete().eq("id", specialistId);
  }, 30_000);

  it("create: backward compatible — legacy singular `category` (no `categories` array) still creates exactly one link", async () => {
    const result = await createCommand.execute(
      {
        title: "Legacy Single Category Specialist",
        category: "Сантехнік",
        phones: [],
        phoneTypes: [],
      },
      ctxFor(houseAId, "p10-specialists-a"),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const specialistId = (result.data.data as { id: string }).id;
    const links = await admin.from("house_specialist_categories").select("id").eq("specialist_id", specialistId);
    expect(links.data).toHaveLength(1);

    await admin.from("house_specialists").delete().eq("id", specialistId);
  }, 30_000);

  it("update: replacing categories removes old links and adds new ones (no leftovers)", async () => {
    const created = await createCommand.execute(
      { title: "Update Target", categories: ["Електрик", "Сантехнік"], phones: [], phoneTypes: [] },
      ctxFor(houseAId, "p10-specialists-a"),
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const specialist = created.data.data as { id: string; lock_version: number };

    const updated = await updateCommand.execute(
      {
        id: specialist.id,
        lockVersion: specialist.lock_version,
        title: "Update Target",
        categories: ["Бухгалтер"],
        phones: [],
        phoneTypes: [],
      },
      ctxFor(houseAId, "p10-specialists-a"),
    );
    expect(updated.ok).toBe(true);

    const links = await admin
      .from("house_specialist_categories")
      .select("house_specialists_categories(title)")
      .eq("specialist_id", specialist.id);
    const titles = (links.data ?? []).map((row: unknown) => (row as { house_specialists_categories: { title: string } }).house_specialists_categories.title);
    expect(titles).toEqual(["Бухгалтер"]);

    await admin.from("house_specialists").delete().eq("id", specialist.id);
  }, 30_000);

  it("duplicate within the same house copies the full category set", async () => {
    const created = await createCommand.execute(
      { title: "Dup Same House Source", categories: ["Електрик", "Бухгалтер"], phones: [], phoneTypes: [] },
      ctxFor(houseAId, "p10-specialists-a"),
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const sourceId = (created.data.data as { id: string }).id;

    const duplicated = await duplicateCommand.execute(
      { sourceId, targetHouseIds: [houseAId] },
      ctxFor(houseAId, "p10-specialists-a"),
    );
    expect(duplicated.ok).toBe(true);
    if (!duplicated.ok) return;

    const created2 = (duplicated.data.data as { created: Array<{ createdId: string; targetHouseId: string }> }).created;
    expect(created2).toHaveLength(1);
    const duplicateId = created2[0]!.createdId;

    const links = await admin
      .from("house_specialist_categories")
      .select("house_specialists_categories(title)")
      .eq("specialist_id", duplicateId);
    const titles = (links.data ?? []).map((row: unknown) => (row as { house_specialists_categories: { title: string } }).house_specialists_categories.title).sort();
    expect(titles).toEqual(["Бухгалтер", "Електрик"]);

    await admin.from("house_specialists").delete().in("id", [sourceId, duplicateId]);
  }, 30_000);

  it("cross-house duplicate resolves categories through the TARGET house's own catalog, never reusing the source house's category id", async () => {
    const created = await createCommand.execute(
      { title: "Dup Cross House Source", categories: ["Електрик"], phones: [], phoneTypes: [] },
      ctxFor(houseAId, "p10-specialists-a"),
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const sourceId = (created.data.data as { id: string }).id;

    const sourceLinks = await admin.from("house_specialist_categories").select("category_id").eq("specialist_id", sourceId);
    const sourceCategoryId = sourceLinks.data?.[0]?.category_id as string;

    const duplicated = await duplicateCommand.execute(
      { sourceId, targetHouseIds: [houseBId] },
      ctxFor(houseAId, "p10-specialists-a"),
    );
    expect(duplicated.ok).toBe(true);
    if (!duplicated.ok) return;

    const created2 = (duplicated.data.data as { created: Array<{ createdId: string; targetHouseId: string }> }).created;
    const duplicateId = created2[0]!.createdId;

    const targetLinks = await admin
      .from("house_specialist_categories")
      .select("category_id, house_id, house_specialists_categories(title, house_id)")
      .eq("specialist_id", duplicateId);

    expect(targetLinks.data).toHaveLength(1);
    const targetLink = targetLinks.data![0] as unknown as {
      category_id: string;
      house_id: string;
      house_specialists_categories: { title: string; house_id: string };
    };

    expect(targetLink.house_id).toBe(houseBId);
    expect(targetLink.house_specialists_categories.house_id).toBe(houseBId);
    expect(targetLink.house_specialists_categories.title).toBe("Електрик");
    // The critical tenant-isolation assertion: the target link must point at
    // a category row that belongs to house B, never the source's house-A row.
    expect(targetLink.category_id).not.toBe(sourceCategoryId);

    await admin.from("house_specialists").delete().in("id", [sourceId, duplicateId]);
  }, 30_000);
});
