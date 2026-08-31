import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS = path.resolve(process.cwd(), "supabase/migrations");

function migrationFiles(): string[] {
  return fs
    .readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

function latestGetMyAdminRoleDefinition(): {
  file: string;
  source: string;
} {
  const files = migrationFiles().reverse();

  for (const file of files) {
    const source = fs.readFileSync(path.join(MIGRATIONS, file), "utf8");

    if (
      /create\s+or\s+replace\s+function\s+public\.get_my_admin_role\s*\(\s*\)/i.test(
        source,
      )
    ) {
      return { file, source };
    }
  }

  throw new Error("No get_my_admin_role migration found");
}

describe("S2-T3 get_my_admin_role hardening", () => {
  it("RED: latest definition must pin an empty search_path", () => {
    const { source } = latestGetMyAdminRoleDefinition();

    expect(source).toMatch(
      /create\s+or\s+replace\s+function\s+public\.get_my_admin_role\s*\(\s*\)[\s\S]*?security\s+definer[\s\S]*?set\s+search_path\s*=\s*''/i,
    );
  });

  it("preserves the already-correct security and grant boundary", () => {
    const { source } = latestGetMyAdminRoleDefinition();

    expect(source).toMatch(/security\s+definer/i);
    expect(source).toContain("public.admin_memberships");
    expect(source).toContain("auth.uid()");

    expect(source).toMatch(
      /revoke\s+all\s+on\s+function\s+public\.get_my_admin_role\s*\(\s*\)\s+from\s+public\s*,\s*anon/i,
    );

    expect(source).toMatch(
      /grant\s+execute\s+on\s+function\s+public\.get_my_admin_role\s*\(\s*\)\s+to\s+authenticated\s*,\s*service_role/i,
    );
  });

  it("keeps S2-T3 scoped to function security hardening", () => {
    const { source } = latestGetMyAdminRoleDefinition();

    expect(source).toMatch(/security\s+definer/i);
    expect(source).toMatch(/set\s+search_path\s*=\s*''/i);
    expect(source).toContain("public.admin_memberships");
    expect(source).toContain("auth.uid()");
  });
});
