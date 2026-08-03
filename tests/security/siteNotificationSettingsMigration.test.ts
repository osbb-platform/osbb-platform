import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/202608032345_create_site_notification_settings.sql",
  ),
  "utf8",
);

describe("site notification settings migration", () => {
  it("creates a private singleton settings table", () => {
    expect(migration).toContain(
      "create table if not exists public.site_notification_settings",
    );
    expect(migration).toContain(
      "unique (singleton_key)",
    );
    expect(migration).toContain(
      "check (singleton_key = 'primary')",
    );
  });

  it("seeds the approved default recipient", () => {
    expect(migration).toContain(
      "osbb.platform.project@gmail.com",
    );
    expect(migration).toContain(
      "on conflict (singleton_key) do nothing",
    );
  });

  it("limits the number of configured recipients", () => {
    expect(migration).toContain(
      "cardinality(lead_notify_emails) between 1 and 10",
    );
  });

  it("enables RLS with admin-only management", () => {
    expect(migration).toContain(
      "alter table public.site_notification_settings",
    );
    expect(migration).toContain(
      'create policy "Admins manage site notification settings"',
    );
    expect(migration).not.toContain(
      "Public read site notification settings",
    );
    expect(migration).not.toMatch(
      /to\s+anon[\s\S]*site_notification_settings/i,
    );
  });
});
