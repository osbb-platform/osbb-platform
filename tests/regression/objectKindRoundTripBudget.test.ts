import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(file, "utf8");

describe("object_kind hot-path query budget", () => {
  it("carries objectKind in Command Bus context", () => {
    expect(read("src/modules/content-engine/v2/types/pipeline.ts")).toContain(
      "objectKind: string",
    );
    expect(read("src/modules/content-engine/v2/context.ts")).toContain(
      "objectKind: house.object_kind",
    );
  });

  it("does not re-query houses during manual vote validation", () => {
    const source = read(
      "src/modules/content-engine/v2/handlers/meetings/commands/recordManualVote.ts",
    );
    expect(source).toContain("ctx.house.objectKind");
    expect(source).not.toContain('.from("houses")');
  });

  it("carries objectKind through the already-required resident session lookup", () => {
    const session = read("src/modules/houses/resident/withResidentSession.ts");
    expect(session).toContain('.select("id, slug, object_kind")');
    expect(session).toContain("objectKind: String(house.object_kind");

    for (const file of ["submitPollAnswers.ts", "initOnlineBallot.ts"]) {
      const source = read(`src/modules/houses/resident/${file}`);
      expect(source).not.toContain('.from("houses")');
    }
  });

  it("passes canonical objectKind into resident-request task creation", () => {
    for (const file of ["ensureResidentRequestTask.ts", "ensureSpecialistRequestTask.ts"]) {
      const source = read(`src/modules/tasks/services/${file}`);
      expect(source).toContain("params.objectKind");
      expect(source).not.toContain('.from("houses")');
    }
  });

  it("reuses the admin house objectKind while building poll exports", () => {
    const pollLoader = read("src/modules/houses/services/getAdminHousePolls.ts");
    const exportLoader = read("src/modules/houses/services/getAdminPollExport.ts");

    expect(pollLoader).toContain("objectKind: params.objectKind");
    expect(exportLoader).toContain("objectKind: params.objectKind");
    expect(exportLoader).not.toContain('.from("houses")');
  });
});
