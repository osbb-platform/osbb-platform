import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { withResidentSessionMock } = vi.hoisted(() => ({
  withResidentSessionMock: vi.fn(),
}));

vi.mock(
  "@/src/modules/houses/resident/withResidentSession",
  () => ({
    withResidentSession: withResidentSessionMock,
  }),
);

vi.mock(
  "@/src/shared/security/rateLimitPolicies",
  () => ({
    rateLimitPolicies: {
      chairmanPublish: {
        scope: "chairman_publish",
        windowSeconds: 3600,
        maxAttempts: 5,
      },
    },
  }),
);

import {
  assertChairmanContext,
  CHAIRMAN_ACTOR_NAME,
  CHAIRMAN_ACTOR_ROLE,
  CHAIRMAN_SOURCE,
} from "../../src/modules/houses/chairman/guard";
import { rateLimitPolicies as realRateLimitPolicies } from "../../src/shared/security/rateLimitPolicies";

describe("P08 chairman guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fixes chairman publishing to five attempts per hour in the real policy registry", () => {
    expect(realRateLimitPolicies.chairmanPublish).toEqual({
      scope: "chairman_publish",
      windowSeconds: 3600,
      maxAttempts: 5,
    });
  });

  it("delegates the chairman security boundary to withResidentSession", async () => {
    withResidentSessionMock.mockImplementation(
      async (
        params: unknown,
        operation: (context: {
          houseId: string;
          slug: string;
          sessionToken: string;
        }) => Promise<unknown>,
      ) => {
        expect(params).toEqual({
          slug: "sobornyi-186",
          rateLimitPolicy: {
            scope: "chairman_publish",
            windowSeconds: 3600,
            maxAttempts: 5,
          },
        });

        return operation({
          houseId: "11111111-1111-4111-8111-111111111111",
          slug: "sobornyi-186",
          sessionToken: "resident-session",
        });
      },
    );

    const result = await assertChairmanContext(
      { slug: "sobornyi-186" },
      async (context) => context,
    );

    expect(result).toEqual({
      houseId: "11111111-1111-4111-8111-111111111111",
      slug: "sobornyi-186",
      sessionToken: "resident-session",
      actorName: CHAIRMAN_ACTOR_NAME,
      actorRole: CHAIRMAN_ACTOR_ROLE,
      source: CHAIRMAN_SOURCE,
    });

    expect(CHAIRMAN_ACTOR_NAME).toBe("Голова ОСББ");
    expect(CHAIRMAN_ACTOR_ROLE).toBe("chairman");
    expect(CHAIRMAN_SOURCE).toBe("chairman_cabinet");
    expect(withResidentSessionMock).toHaveBeenCalledTimes(1);
  });

  it("does not swallow resident security failures", async () => {
    const error = new Error("ORIGIN_REJECTED");
    withResidentSessionMock.mockRejectedValue(error);

    await expect(
      assertChairmanContext(
        { slug: "sobornyi-186" },
        async () => "must-not-run",
      ),
    ).rejects.toBe(error);
  });
});
