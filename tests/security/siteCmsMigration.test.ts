import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/202608031500_create_public_site_cms.sql",
);

const migration = fs.readFileSync(migrationPath, "utf8");

describe("site CMS migration", () => {
  const tables = [
    "site_settings",
    "site_cities",
    "site_testimonials",
    "site_post_categories",
    "site_posts",
    "site_releases",
  ] as const;

  it("creates the complete B2 public content schema", () => {
    for (const table of tables) {
      expect(migration).toContain(
        `create table if not exists public.${table}`,
      );
    }
  });

  it("enables row level security on every site table", () => {
    for (const table of tables) {
      expect(migration).toContain(
        `alter table public.${table} enable row level security`,
      );
    }
  });

  it("allows public reads only for visible or published records", () => {
    expect(migration).toContain(
      'create policy "Public read site settings"',
    );
    expect(migration).toContain(
      'create policy "Public read visible site cities"',
    );
    expect(migration).toContain(
      'create policy "Public read published testimonials"',
    );
    expect(migration).toContain(
      'create policy "Public read published site posts"',
    );
    expect(migration).toContain(
      "status = 'published'",
    );
    expect(migration).toContain(
      "published_at <= now()",
    );
  });

  it("requires a valid active admin for writes", () => {
    expect(migration).toContain(
      "public.get_my_admin_role() is not null",
    );
    expect(migration).toContain(
      "public.get_my_admin_role() <> 'inactive'",
    );
  });

  it("preserves fixed public product decisions in seed data", () => {
    expect(migration).toContain(
      "'ОСББ «Соборний 186»'",
    );
    expect(migration).toContain("'301545'");
    expect(migration).not.toContain("224466");
    expect(migration).not.toContain("osbb-ekspres-4");

    expect(migration).toContain(
      "'viber-telegram-bot'",
    );
    expect(migration).toContain(
      "'mobile-home-screen-app'",
    );
  });

  it("is idempotent for existing seeded records", () => {
    expect(migration.match(/on conflict .* do nothing/g)?.length)
      .toBeGreaterThanOrEqual(6);
  });
});
