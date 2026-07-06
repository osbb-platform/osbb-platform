import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { getClientIpAddress } from "@/src/shared/security/clientIp";
import { RATE_LIMIT_POLICIES } from "@/src/shared/security/rateLimitPolicies";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/202607060005_add_server_rate_limit.sql",
);

const servicePath = resolve(
  process.cwd(),
  "src/shared/security/serverRateLimit.ts",
);

const migration = readFileSync(migrationPath, "utf8");
const executableMigration = migration
  .split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n");

const service = readFileSync(servicePath, "utf8");

describe("S1.T5 server-side rate-limit foundation", () => {
  it("creates a private RLS-protected state table", () => {
    expect(executableMigration).toMatch(
      /create table if not exists public\.auth_attempts/i,
    );

    expect(executableMigration).toMatch(
      /primary key \(scope, key_hash\)/i,
    );

    expect(executableMigration).toMatch(
      /alter table public\.auth_attempts enable row level security/i,
    );

    expect(executableMigration).toMatch(
      /revoke all[\s\S]*on table public\.auth_attempts[\s\S]*from public, anon, authenticated/i,
    );

    expect(executableMigration).toMatch(
      /grant select, insert, update, delete[\s\S]*on table public\.auth_attempts[\s\S]*to service_role/i,
    );
  });

  it("stores only hashed identifiers", () => {
    expect(executableMigration).toMatch(
      /key_hash text not null/i,
    );

    expect(executableMigration).toMatch(
      /\^\[0-9a-f\]\{64\}\$/i,
    );

    expect(executableMigration).not.toMatch(
      /\b(ip_address|email_address|house_slug)\b/i,
    );

    expect(service).toMatch(
      /createHash\("sha256"\)/,
    );

    expect(service).toMatch(
      /\.update\(`\$\{scope\}\\u0000\$\{normalizeIdentifier\(identifier\)\}`\)/,
    );
  });

  it("defines atomic service-role-only RPC contracts", () => {
    for (const functionName of [
      "get_rate_limit_state",
      "record_rate_limit_failure",
      "consume_rate_limit",
      "clear_rate_limit",
    ]) {
      expect(executableMigration).toMatch(
        new RegExp(
          `create\\s+or\\s+replace\\s+function\\s+public\\.${functionName}`,
          "i",
        ),
      );
    }

    expect(
      executableMigration.match(/security definer/gi),
    ).toHaveLength(4);

    expect(
      executableMigration.match(/set search_path = ''/gi),
    ).toHaveLength(4);

    expect(executableMigration).toMatch(
      /for update/i,
    );

    expect(executableMigration).toMatch(
      /on conflict \(scope, key_hash\) do nothing/i,
    );

    expect(executableMigration).toMatch(
      /grant execute[\s\S]*get_rate_limit_state[\s\S]*to service_role/i,
    );

    expect(executableMigration).toMatch(
      /grant execute[\s\S]*record_rate_limit_failure[\s\S]*to service_role/i,
    );

    expect(executableMigration).toMatch(
      /grant execute[\s\S]*consume_rate_limit[\s\S]*to service_role/i,
    );

    expect(executableMigration).toMatch(
      /grant execute[\s\S]*clear_rate_limit[\s\S]*to service_role/i,
    );
  });

  it("keeps direct house-session permissions unchanged", () => {
    expect(executableMigration).not.toMatch(
      /\bcreate_house_session\b/i,
    );
  });

  it("uses the intended initial policies", () => {
    expect(RATE_LIMIT_POLICIES.houseLogin).toEqual({
      scope: "house_login",
      maxAttempts: 3,
      windowSeconds: 300,
      blockSeconds: 300,
    });

    expect(RATE_LIMIT_POLICIES.adminLogin).toEqual({
      scope: "admin_login",
      maxAttempts: 5,
      windowSeconds: 900,
      blockSeconds: 900,
    });

    expect(RATE_LIMIT_POLICIES.analyticsIngest).toEqual({
      scope: "api_analytics",
      maxAttempts: 120,
      windowSeconds: 60,
      blockSeconds: 60,
    });
  });

  it("extracts the first proxy-controlled client IP", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10, 10.0.0.4",
      "x-real-ip": "198.51.100.22",
    });

    expect(getClientIpAddress(headers)).toBe(
      "203.0.113.10",
    );
  });

  it("prefers the Vercel forwarded header", () => {
    const headers = new Headers({
      "x-vercel-forwarded-for": "2001:db8::1",
      "x-forwarded-for": "203.0.113.10",
    });

    expect(getClientIpAddress(headers)).toBe(
      "2001:db8::1",
    );
  });

  it("uses an explicit fallback when no IP header exists", () => {
    expect(getClientIpAddress(new Headers())).toBe(
      "unknown",
    );
  });
});
