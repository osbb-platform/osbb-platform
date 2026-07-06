import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  describe,
  expect,
  it,
} from "vitest";

function readProjectFile(path: string) {
  return readFileSync(
    resolve(process.cwd(), path),
    "utf8",
  );
}

const houseLogin = readProjectFile(
  "src/modules/houses/actions/loginToHouse.ts",
);

const adminLogin = readProjectFile(
  "src/modules/auth/actions/loginAdmin.ts",
);

const analyticsRoute = readProjectFile(
  "app/api/analytics/track/route.ts",
);

describe("S1.T5 rate-limit runtime wiring", () => {
  it("protects house login by IP and slug", () => {
    expect(houseLogin).toMatch(
      /getClientIpAddress\(headerStore\)/,
    );

    expect(houseLogin).toMatch(
      /`ip=\$\{clientIp\}\|slug=\$\{slug\.toLowerCase\(\)\}`/,
    );

    expect(houseLogin).toMatch(
      /RATE_LIMIT_POLICIES\.houseLogin/,
    );

    expect(houseLogin).toMatch(
      /await getRateLimitState\(/,
    );

    expect(houseLogin).toMatch(
      /await recordRateLimitFailure\(/,
    );

    expect(houseLogin).toMatch(
      /await clearRateLimit\(/,
    );

    expect(houseLogin).toMatch(
      /createSupabaseAdminClient\(\)/,
    );

    expect(houseLogin).not.toMatch(
      /createSupabaseServerClient/,
    );

    expect(houseLogin).not.toMatch(
      /\bcurrentAttempts\b|\bnextAttempts\b/,
    );

    expect(
      houseLogin.match(
        /secure:\s*process\.env\.NODE_ENV\s*===\s*"production"/g,
      ),
    ).toHaveLength(2);

    expect(houseLogin).not.toMatch(
      /secure:\s*false/,
    );

    const preflightIndex =
      houseLogin.indexOf(
        "await getRateLimitState(",
      );

    const passwordRpcIndex =
      houseLogin.indexOf(
        '"create_house_session"',
      );

    expect(preflightIndex).toBeGreaterThan(-1);
    expect(passwordRpcIndex).toBeGreaterThan(
      preflightIndex,
    );
  });

  it("protects admin login by IP and email", () => {
    expect(adminLogin).toMatch(
      /getClientIpAddress\(headerStore\)/,
    );

    expect(adminLogin).toMatch(
      /`ip=\$\{clientIp\}\|email=\$\{email\}`/,
    );

    expect(adminLogin).toMatch(
      /RATE_LIMIT_POLICIES\.adminLogin/,
    );

    expect(adminLogin).toMatch(
      /await getRateLimitState\(/,
    );

    expect(adminLogin).toMatch(
      /await recordRateLimitFailure\(/,
    );

    expect(adminLogin).toMatch(
      /await clearRateLimit\(/,
    );

    const preflightIndex =
      adminLogin.indexOf(
        "await getRateLimitState(",
      );

    const authIndex =
      adminLogin.indexOf(
        "signInWithPassword",
      );

    expect(preflightIndex).toBeGreaterThan(-1);
    expect(authIndex).toBeGreaterThan(
      preflightIndex,
    );
  });

  it("protects analytics ingest by IP", () => {
    expect(analyticsRoute).toMatch(
      /consumeRateLimit\(/,
    );

    expect(analyticsRoute).toMatch(
      /RATE_LIMIT_POLICIES\.analyticsIngest/,
    );

    expect(analyticsRoute).toMatch(
      /getClientIpAddress\(request\.headers\)/,
    );

    expect(analyticsRoute).toMatch(
      /status:\s*429/,
    );

    expect(analyticsRoute).toMatch(
      /"Retry-After"/,
    );

    const limitIndex =
      analyticsRoute.indexOf(
        "await consumeRateLimit(",
      );

    const payloadIndex =
      analyticsRoute.indexOf(
        "await parsePayload(request)",
      );

    expect(limitIndex).toBeGreaterThan(-1);
    expect(payloadIndex).toBeGreaterThan(
      limitIndex,
    );
  });
});
