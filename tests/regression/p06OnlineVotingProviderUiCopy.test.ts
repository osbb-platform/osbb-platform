import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

describe("P06-T3 provider-aware online voting UI copy", () => {
  const config = read(
    "src/modules/houses/resident/onlineVotingProviderConfig.ts",
  );
  const publicPage = read(
    "app/(public)/house/[slug]/meetings/page.tsx",
  );
  const publicUi = read(
    "src/modules/houses/components/PublicOnlineMeetingVoting.tsx",
  );
  const adminPage = read(
    "app/(admin)/admin/(protected)/houses/[id]/page.tsx",
  );
  const workspace = read(
    "src/modules/houses/components/HouseMeetingsWorkspace.tsx",
  );
  const adminPanel = read(
    "src/modules/houses/components/AdminOnlineMeetingVotingPanel.tsx",
  );

  it("wires a safe server-side provider mode into both UIs", () => {
    expect(config).toContain(
      "readOnlineVotingProviderModeForUi",
    );
    expect(publicPage).toContain(
      "onlineVotingProviderMode=",
    );
    expect(adminPage).toContain(
      "onlineVotingProviderMode=",
    );
  });

  it("shows internal mode without pretending to use Diia", () => {
    expect(publicUi).toContain(
      'onlineVotingProviderMode === "internal_resident"',
    );
    expect(publicUi).toContain("Без Дія.Підпис");
    expect(publicUi).toContain(
      "Особа не підтверджується через Дія.Підпис",
    );
    expect(publicUi).toContain("Підтвердити голос");

    expect(workspace).toContain(
      'onlineVotingProviderMode === "internal_resident"',
    );
    expect(workspace).toContain("Онлайн-голосування");
    expect(workspace).toContain("Без Дія.Підпис");

    expect(adminPanel).toContain(
      'providerMode === "internal_resident"',
    );
  });

  it("preserves official Diia copy and external redirect flow", () => {
    expect(publicUi).toContain(
      'onlineVotingProviderMode === "official_diia"',
    );
    expect(publicUi).toContain("Підтвердити через Дію");
    expect(publicUi).toContain(
      "Після натискання ви перейдете до підтвердження через Дію",
    );
    expect(publicUi).toContain(
      "window.location.assign(target)",
    );
    expect(workspace).toContain("Онлайн через Дію");
    expect(adminPanel).toContain(
      "підтверджуються через провайдера Дії",
    );
  });

  it("does not allow selecting online mode while provider is disabled", () => {
    expect(workspace).toContain(
      'onlineVotingProviderMode === "disabled"',
    );
    expect(workspace).toContain(
      "Онлайн-голосування недоступне",
    );
  });
});
