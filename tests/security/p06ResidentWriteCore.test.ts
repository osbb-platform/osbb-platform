import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getClientIpFromHeaders } from "../../src/shared/security/clientIp";
import { rateLimitPolicies } from "../../src/shared/security/rateLimitPolicies";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(
    path.join(root, relativePath),
    "utf8",
  );
}

describe("P06 T1 resident write core", () => {
  it("defines dedicated resident voting and Diia callback policies", () => {
    expect(rateLimitPolicies.residentVoteInit.scope)
      .toBe("resident_vote_init");
    expect(rateLimitPolicies.residentVoteInit.maxAttempts)
      .toBeGreaterThan(0);

    expect(rateLimitPolicies.diiaCallback.scope)
      .toBe("diia_callback");
    expect(rateLimitPolicies.diiaCallback.maxAttempts)
      .toBeGreaterThan(0);
  });

  it("prefers the first forwarded client IP", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.5, 10.0.0.1",
      "x-real-ip": "198.51.100.2",
    });

    expect(getClientIpFromHeaders(headers))
      .toBe("203.0.113.5");
  });

  it("falls back to x-real-ip and then unknown", () => {
    expect(
      getClientIpFromHeaders(
        new Headers({
          "x-real-ip": "198.51.100.2",
        }),
      ),
    ).toBe("198.51.100.2");

    expect(
      getClientIpFromHeaders(new Headers()),
    ).toBe("unknown");
  });

  it("guards resident writes with origin, cookie and validated session", () => {
    const source = read(
      "src/modules/houses/resident/withResidentSession.ts",
    );

    expect(source).toContain("assertSameOrigin");
    expect(source).toContain("getHouseAccessCookieName");
    expect(source).toContain("validateHouseSession");
    expect(source).toContain("consumeServerRateLimit");
    expect(source).toContain("houseId: house.id");
  });

  it("uses the existing atomic server-only rate-limit RPC", () => {
    const source = read(
      "src/shared/security/serverRateLimit.ts",
    );

    expect(source).toContain(
      '"consume_site_rate_limit"',
    );
    expect(source).toContain("createHmac");
    expect(source).toContain(
      "SUPABASE_SERVICE_ROLE_KEY",
    );
    expect(source).not.toContain("console.log");
  });

  it("does not import legacy runtime code", () => {
    const files = [
      "src/modules/houses/resident/withResidentSession.ts",
      "src/shared/security/serverRateLimit.ts",
      "src/shared/security/rateLimitPolicies.ts",
      "src/shared/security/clientIp.ts",
    ];

    for (const file of files) {
      expect(read(file)).not.toContain(
        "@/src/legacy-v1",
      );
    }
  });
});
