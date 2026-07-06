import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { getSupabaseAuthCookieOptions } from "@/src/integrations/supabase/shared/authCookieOptions";

function readProjectFile(path: string) {
  return readFileSync(
    resolve(process.cwd(), path),
    "utf8",
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("S1.T6 secure cookie configuration", () => {
  it("sets Secure on Supabase auth cookies in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(getSupabaseAuthCookieOptions()).toEqual({
      httpOnly: false,
      sameSite: "lax",
      secure: true,
      path: "/",
    });
  });

  it("keeps local HTTP development functional", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(getSupabaseAuthCookieOptions()).toEqual({
      httpOnly: false,
      sameSite: "lax",
      secure: false,
      path: "/",
    });
  });

  it("keeps Supabase authentication host-only", () => {
    expect(
      getSupabaseAuthCookieOptions(),
    ).not.toHaveProperty("domain");
  });

  it("applies the policy to every live Supabase session client", () => {
    const clientFiles = [
      "src/integrations/supabase/client/browser.ts",
      "src/integrations/supabase/server/action.ts",
      "src/integrations/supabase/server/middleware.ts",
      "src/integrations/supabase/server/server.ts",
    ];

    for (const path of clientFiles) {
      const source = readProjectFile(path);

      expect(source).toContain(
        "cookieOptions: getSupabaseAuthCookieOptions(),",
      );

      expect(source).toContain(
        "getSupabaseAuthCookieOptions",
      );
    }
  });

  it("makes the visitor identifier inaccessible to browser JavaScript", () => {
    const source = readProjectFile(
      "app/api/analytics/track/route.ts",
    );

    expect(source).toMatch(
      /response\.cookies\.set\([\s\S]*?httpOnly:\s*true/,
    );

    expect(source).not.toMatch(
      /httpOnly:\s*false/,
    );

    expect(source).toMatch(
      /sameSite:\s*"lax"/,
    );

    expect(source).toMatch(
      /secure:\s*process\.env\.NODE_ENV\s*===\s*"production"/,
    );

    expect(source).toMatch(
      /path:\s*"\/"/,
    );
  });

  it("preserves hardened resident session and lock cookies", () => {
    const source = readProjectFile(
      "src/modules/houses/actions/loginToHouse.ts",
    );

    expect(
      source.match(/httpOnly:\s*true/g) ?? [],
    ).toHaveLength(2);

    expect(
      source.match(/sameSite:\s*"lax"/g) ?? [],
    ).toHaveLength(2);

    expect(
      source.match(
        /secure:\s*process\.env\.NODE_ENV\s*===\s*"production"/g,
      ) ?? [],
    ).toHaveLength(2);

    expect(
      source.match(/path:\s*"\/"/g) ?? [],
    ).toHaveLength(2);

    expect(source).not.toMatch(
      /secure:\s*false/,
    );
  });
});
