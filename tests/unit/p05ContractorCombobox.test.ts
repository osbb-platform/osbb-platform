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

describe("P05 T3.2 contractor combobox", () => {
  it("supports searchable frequent contractors and arbitrary text", () => {
    expect(combobox).toContain('role="combobox"');
    expect(combobox).toContain("includes(normalizedQuery)");
    expect(combobox).toContain("contractorId: nextExact?.id ?? null");
    expect(combobox).toContain(
      "Оберіть зі списку або введіть довільну назву",
    );
  });

  it("creates a new frequent contractor through the trusted server action", () => {
    expect(combobox).toContain("createAdminContractor");
    expect(combobox).not.toContain("createSupabaseBrowserClient");
    expect(combobox).not.toContain('.from("contractors")');
  });

  it("deactivates through the trusted server action instead of deleting", () => {
    expect(combobox).toContain("deactivateAdminContractor");
    expect(combobox).not.toContain(".delete()");
    expect(combobox).toContain("Історичні завдання та їх текст не");
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
