import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const types = readFileSync("src/modules/content-engine/v2/handlers/plan/types.ts", "utf8");
const createCommand = readFileSync("src/modules/content-engine/v2/handlers/plan/commands/create.ts", "utf8");
const updateCommand = readFileSync("src/modules/content-engine/v2/handlers/plan/commands/update.ts", "utf8");
const planService = readFileSync("src/modules/houses/services/getAdminHousePlan.ts", "utf8");
const contractorsService = readFileSync("src/modules/houses/services/getAdminContractors.ts", "utf8");
const workspace = readFileSync("src/modules/houses/components/HousePlanWorkspace.tsx", "utf8");

describe("P05 T3.1 contractor task persistence", () => {
  it("loads only active global frequent contractors", () => {
    expect(contractorsService).toContain('.from("contractors")');
    expect(contractorsService).toContain('.eq("is_active", true)');
    expect(contractorsService).toContain('.is("city_id", null)');
  });
  it("adds nullable contractorId to plan payloads", () => {
    expect(types).toContain("contractor_id: string | null");
    expect(types).toContain("contractorId?: string | null");
  });
  it("persists text and optional reference independently", () => {
    for (const command of [createCommand, updateCommand]) {
      expect(command).toContain("contractor: normalizeOptionalText(payload.contractor)");
      expect(command).toContain("contractor_id:");
      expect(command).toContain("payload.contractorId.trim()");
    }
  });
  it("returns contractorId in admin snapshot", () => {
    expect(planService).toContain("contractorId: task.contractor_id");
  });
  it("supports frequent selection and arbitrary text", () => {
    expect(workspace).toContain("<ContractorCombobox");
    expect(workspace).toContain("contractor: draft.contractor ??");
    expect(workspace).toContain("contractorId: draft.contractorId");
    expect(workspace).toContain("contractorId: task.contractorId");
    expect(workspace).not.toContain("<datalist");
  });
});
