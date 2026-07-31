import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const combobox = readFileSync(
  "src/modules/houses/components/ContractorCombobox.tsx",
  "utf8",
);
const workspace = readFileSync(
  "src/modules/houses/components/HousePlanWorkspace.tsx",
  "utf8",
);
const migration = readFileSync(
  "supabase/migrations/202607231410_create_contractors_directory.sql",
  "utf8",
);

describe("P05 T3.2 contractor combobox", () => {
  it("supports searchable frequent contractors and arbitrary text", () => {
    expect(combobox).toContain('role="combobox"');
    expect(combobox).toContain("includes(normalizedQuery)");
    expect(combobox).toContain("contractorId: nextExact?.id ?? null");
    expect(combobox).toContain(
      "Оберіть зі списку або введіть довільну назву",
    );
  });

  it("creates a new frequent contractor through RLS-protected Supabase", () => {
    expect(combobox).toContain('.from("contractors")');
    expect(combobox).toContain(".insert({");
    expect(combobox).toContain("normalized_name: normalizeName(name)");
    expect(combobox).toContain('insertError?.code === "23505"');
  });

  it("deactivates instead of deleting", () => {
    expect(combobox).toContain(".update({ is_active: false })");
    expect(combobox).not.toContain(".delete()");
    expect(combobox).toContain("Історичні завдання та їх текст не");
    expect(migration).toContain("-- No DELETE policy by design:");
  });

  it("uses the final component instead of native datalist", () => {
    expect(workspace).toContain("<ContractorCombobox");
    expect(workspace).not.toContain("<datalist");
    expect(workspace).toContain("contractorId: draft.contractorId");
  });

  it("preserves arbitrary text when a frequent contractor is deactivated", () => {
    expect(combobox).toContain("contractor: value.contractor");
    expect(combobox).toContain("contractorId: null");
  });
});
