import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/202608242100_p09_t3b_migrate_manager_to_content_manager.sql",
  ),
  "utf8",
).toLowerCase();

describe("P09 T3b manager data migration", () => {
  it("moves every manager membership to content_manager", () => {
    expect(migration).toMatch(
      /update public\.admin_memberships[\s\S]*set role = 'content_manager'::public\.admin_role[\s\S]*where role::text = 'manager'/,
    );
  });

  it("does not filter by status or activity", () => {
    const updateStart = migration.indexOf("update public.admin_memberships");
    const verificationStart = migration.indexOf("do $$");
    const updateBlock = migration.slice(updateStart, verificationStart);

    expect(updateBlock).not.toContain("status");
    expect(updateBlock).not.toContain("is_active");
  });

  it("asserts that zero manager rows remain", () => {
    expect(migration).toMatch(
      /select count\(\*\)[\s\S]*from public\.admin_memberships[\s\S]*where role::text = 'manager'/,
    );
    expect(migration).toContain("remaining_manager_rows <> 0");
  });

  it("does not remove enums or modify DB permission machinery", () => {
    expect(migration).not.toMatch(/drop\s+type/);
    expect(migration).not.toMatch(/rename\s+value/);
    expect(migration).not.toMatch(/create\s+or\s+replace\s+function/);
    expect(migration).not.toMatch(/create\s+policy/);
    expect(migration).not.toMatch(/alter\s+policy/);
    expect(migration).not.toMatch(/drop\s+policy/);
    expect(migration).not.toMatch(/grant\s+/);
    expect(migration).not.toMatch(/revoke\s+/);
  });
});
