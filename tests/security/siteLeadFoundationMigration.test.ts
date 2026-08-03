import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/202608031830_create_site_leads_and_rate_limits.sql",
  ),
  "utf8",
);

describe("site lead foundation migration", () => {
  it("creates the lead schema required by Block C1", () => {
    expect(migration).toContain(
      "create table if not exists public.site_leads",
    );
    expect(migration).toContain(
      "phone ~ '^\\+380[0-9]{9}$'",
    );
    expect(migration).toContain("first_seen_at timestamptz null");
    expect(migration).toContain("utm_source text null");
    expect(migration).toContain("utm_medium text null");
    expect(migration).toContain("utm_campaign text null");
    expect(migration).toContain("utm_content text null");
    expect(migration).toContain("landing_page text null");
    expect(migration).toContain("referrer text null");
    expect(migration).toContain("user_agent text null");
  });

  it("does not permit anonymous direct lead insertion", () => {
    expect(migration).toContain(
      "alter table public.site_leads enable row level security",
    );
    expect(migration).not.toMatch(
      /create policy[\s\S]*site_leads[\s\S]*to\s+anon/i,
    );
  });

  it("uses a server-only privacy-safe rate-limit table", () => {
    expect(migration).toContain(
      "create table if not exists public.site_rate_limits",
    );
    expect(migration).toContain("subject_hash text not null");
    expect(migration).not.toMatch(/\bip_address\b/i);
    expect(migration).not.toMatch(/\braw_ip\b/i);
    expect(migration).toContain(
      "revoke all on table public.site_rate_limits",
    );
  });

  it("adds an atomic service-role-only rate-limit function", () => {
    expect(migration).toContain(
      "create or replace function public.consume_site_rate_limit",
    );
    expect(migration).toContain("security definer");
    expect(migration).toContain(
      "set search_path = public, pg_temp",
    );
    expect(migration).toContain(
      "on conflict (scope, subject_hash, window_started_at)",
    );
    expect(migration).toContain(
      "grant execute on function public.consume_site_rate_limit",
    );
    expect(migration).toContain("to service_role");
    expect(migration).toContain(
      "from public, anon, authenticated",
    );
  });

  it("keeps the migration transactional", () => {
    expect(migration.trimStart()).toMatch(/^begin;/);
    expect(migration.trimEnd()).toMatch(/commit;$/);
  });
});
