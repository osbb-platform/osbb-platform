import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

describe("P06-T2 internal resident online voting provider", () => {
  it("has a dedicated production-safe provider config with internal_resident", () => {
    const config = read(
      "src/modules/houses/resident/onlineVotingProviderConfig.ts",
    );

    expect(config).toContain('"internal_resident"');
    expect(config).toContain('"official_diia"');
    expect(config).toContain('"disabled"');
    expect(config).toContain("ONLINE_VOTING_PROVIDER");
    expect(config).toContain(
      "ONLINE_VOTING_IDENTITY_HMAC_SECRET",
    );
    expect(config).not.toContain("MockDiiaProvider");
  });

  it("derives meeting-scoped internal identity from a validated resident session and never stores raw token", () => {
    const init = read(
      "src/modules/houses/resident/initOnlineBallot.ts",
    );
    const identity = read(
      "src/modules/houses/resident/internalResidentIdentity.ts",
    );

    expect(init).toContain("sessionToken");
    expect(init).toContain("houseId");
    expect(init).toContain("meetingId:");
    expect(init).toContain("internalResidentIdentityHmac");
    expect(init).toContain("identityHmac");

    expect(identity).toContain("createHmac");
    expect(identity).toContain("params.houseId");
    expect(identity).toContain("params.meetingId");
    expect(identity).toContain("params.sessionToken");
    expect(identity).toContain(
      '"osbb:p06:internal-resident:v2"',
    );
    expect(init).not.toContain(
      "identityHmac: sessionToken",
    );
  });

  it("confirms internal ballots server-side without Diia auth/callback", () => {
    const init = read(
      "src/modules/houses/resident/initOnlineBallot.ts",
    );

    expect(init).toContain(
      'provider: "internal_resident"',
    );
    expect(init).toContain(
      "finalizeOnlineBallotCallback",
    );
    expect(init).toContain(
      'confirmation: "internal"',
    );
    expect(init).not.toContain("MockDiiaProvider");
  });

  it("keeps official Diia resolution separate", () => {
    const init = read(
      "src/modules/houses/resident/initOnlineBallot.ts",
    );

    expect(init).toContain(
      'providerMode === "official_diia"',
    );
    expect(init).toContain("resolveDiiaProvider()");
    expect(init).toContain("provider.initAuthRequest(");
  });

  it("returns an immediate confirmed result for the internal provider", () => {
    const init = read(
      "src/modules/houses/resident/initOnlineBallot.ts",
    );

    expect(init).toContain(
      'confirmation: "internal"',
    );
    expect(init).toContain(
      'code: finalized.code',
    );
  });

  it("lets resident UI finish internal voting without an external redirect", () => {
    const ui = read(
      "src/modules/houses/components/PublicOnlineMeetingVoting.tsx",
    );

    expect(ui).toContain(
      'result.confirmation === "internal"',
    );
    expect(ui).toContain("window.location.reload()");
    expect(ui).toContain(
      "result.redirectUrl ??",
    );
  });
});
