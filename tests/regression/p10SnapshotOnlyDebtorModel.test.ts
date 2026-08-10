import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function collectSourceFiles(root: string): string[] {
  const absolute = path.join(process.cwd(), root);

  if (!fs.existsSync(absolute)) {
    return [];
  }

  const result: string[] = [];

  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const child = path.join(absolute, entry.name);

    if (entry.isDirectory()) {
      result.push(
        ...collectSourceFiles(path.relative(process.cwd(), child)),
      );
      continue;
    }

    if (/\.(ts|tsx)$/u.test(entry.name)) {
      result.push(child);
    }
  }

  return result;
}

describe("P10 T8 snapshot-only debtor model", () => {
  it("removes runtime reads and writes of house_debtors_items", () => {
    const files = [
      ...collectSourceFiles("src/modules"),
      ...collectSourceFiles("app"),
    ];

    const offenders = files.filter((file) =>
      fs
        .readFileSync(file, "utf8")
        .includes('.from("house_debtors_items")'),
    );

    expect(offenders).toEqual([]);
  });

  it("uses monthly snapshots for admin published and draft rows", () => {
    const admin = read(
      "src/modules/houses/services/getAdminHouseDebtors.ts",
    );

    expect(admin).toContain("latestPublishedItems");
    expect(admin).toContain("latestDraftItems");
    expect(admin).toContain("activeItems: latestPublishedItems");
    expect(admin).toContain("draftItems: latestDraftItems");
    expect(admin).not.toContain('.from("house_debtors_items")');
  });

  it("uses monthly snapshot drafts for the house section counter", () => {
    const counters = read(
      "src/modules/houses/services/getHouseSectionCounters.ts",
    );

    expect(counters).toContain('.from("house_debtor_month_snapshots")');
    expect(counters).toContain('.eq("status", "draft")');
    expect(counters).not.toContain('.from("house_debtors_items")');
  });

  it("does not generate a legacy publicItems projection", () => {
    const plan = read(
      "src/modules/houses/debtors-history/buildDebtPublicationPlan.ts",
    );
    const command = read(
      "src/modules/content-engine/v2/handlers/debtors/commands/publishMonthSnapshot.ts",
    );

    expect(plan).not.toContain("publicItems");
    expect(plan).not.toContain("PublicDebtorPersistenceRow");
    expect(command).not.toContain("plan.publicItems");
    expect(command).toContain("p_public_items: []");
  });

  it("keeps emergency manual commands on the snapshot model", () => {
    const save = read(
      "src/modules/content-engine/v2/handlers/debtors/commands/saveDraftItems.ts",
    );
    const publish = read(
      "src/modules/content-engine/v2/handlers/debtors/commands/publishDraft.ts",
    );
    const remove = read(
      "src/modules/content-engine/v2/handlers/debtors/commands/deleteDraft.ts",
    );

    expect(save).toContain('source: "manual_edit"');
    expect(save).toContain("importMonthDraftCommand");
    expect(publish).toContain("publishMonthSnapshotCommand");
    expect(remove).toContain("discardMonthSnapshotCommand");

    for (const source of [save, publish, remove]) {
      expect(source).not.toContain("house_debtors_items");
    }
  });

  it("overrides the publish RPC without touching the legacy table", () => {
    const migration = read(
      "supabase/migrations/202608100001_p10_stop_legacy_debtor_showcase.sql",
    ).toLowerCase();

    expect(migration).toContain(
      "function public.publish_house_debtor_month_snapshot",
    );
    expect(migration).toContain(
      "from public, anon, authenticated",
    );
    expect(migration).toContain("p_public_items jsonb");
    expect(migration).toContain("insert into public.house_debtor_series");

    expect(migration).not.toContain(
      "update public.house_debtors_items",
    );
    expect(migration).not.toContain(
      "insert into public.house_debtors_items",
    );
    expect(migration).not.toContain(
      "delete from public.house_debtors_items",
    );

    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
  });

  it("keeps admin and public published rows on the same snapshot source", () => {
    const admin = read(
      "src/modules/houses/services/getAdminHouseDebtors.ts",
    );
    const publicService = read(
      "src/modules/houses/services/getPublishedHouseDebtors.ts",
    );

    expect(admin).toContain('.from("house_debtor_month_rows")');
    expect(publicService).toContain(
      '.rpc("get_public_house_debtor_history"',
    );
    expect(publicService).not.toContain(
      '.from("house_debtors_items")',
    );
  });
});
