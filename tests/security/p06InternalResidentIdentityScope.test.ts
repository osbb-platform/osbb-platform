import { describe, expect, it } from "vitest";

import {
  internalResidentIdentityHmac,
} from "../../src/modules/houses/resident/internalResidentIdentity";

const base = {
  houseId: "11111111-1111-4111-8111-111111111111",
  sessionToken: "resident-session-token",
  secret: "test-secret-not-production",
};

describe("P06 internal resident identity scope", () => {
  it("is stable for the same house, meeting and resident session", () => {
    const params = {
      ...base,
      meetingId: "22222222-2222-4222-8222-222222222222",
    };

    expect(internalResidentIdentityHmac(params))
      .toBe(internalResidentIdentityHmac(params));
  });

  it("changes between meetings for the same resident session", () => {
    const meetingA = internalResidentIdentityHmac({
      ...base,
      meetingId: "22222222-2222-4222-8222-222222222222",
    });

    const meetingB = internalResidentIdentityHmac({
      ...base,
      meetingId: "33333333-3333-4333-8333-333333333333",
    });

    expect(meetingA).not.toBe(meetingB);
  });

  it("changes between houses", () => {
    const meetingId =
      "22222222-2222-4222-8222-222222222222";

    const houseA = internalResidentIdentityHmac({
      ...base,
      meetingId,
    });

    const houseB = internalResidentIdentityHmac({
      ...base,
      houseId: "44444444-4444-4444-8444-444444444444",
      meetingId,
    });

    expect(houseA).not.toBe(houseB);
  });
});
