import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/202608242000_p09_t3a_add_content_manager_role.sql",
  ),
  "utf8",
).toLowerCase();

describe("P09 T3a content_manager enum migration", () => {
  it("adds content_manager additively", () => {
    expect(migration).toMatch(
      /alter type public\.admin_role[\s\S]*add value if not exists 'content_manager'/,
    );
  });

  it("does not migrate manager rows in T3a", () => {
    expect(migration).not.toMatch(
      /update\s+public\.admin_memberships/,
    );
    expect(migration).not.toMatch(
      /set\s+role\s*=\s*'content_manager'/,
    );
  });

  it("does not remove or rename legacy enum literals", () => {
    expect(migration).not.toMatch(/drop\s+type/);
    expect(migration).not.toMatch(/rename\s+value/);
  });

  it("does not contain RBAC/runtime activation", () => {
    expect(migration).not.toContain("rbac.resolve");
    expect(migration).not.toContain("actionaccess");
  });
});
