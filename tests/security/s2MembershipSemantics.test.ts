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

function latestFunctionMigration(functionName: string): {
  file: string;
  source: string;
} {
  const escaped = functionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `create\\s+or\\s+replace\\s+function\\s+public\\.${escaped}\\s*\\(`,
    "i",
  );

  for (const file of migrationFiles().reverse()) {
    const source = fs.readFileSync(path.join(MIGRATIONS, file), "utf8");
    if (pattern.test(source)) {
      return { file, source };
    }
  }

  throw new Error(`No migration found for ${functionName}`);
}

describe("S2-T4 strict membership semantics", () => {
  it("RED: get_my_admin_role must require strict active status", () => {
    const { source } = latestFunctionMigration("get_my_admin_role");

    expect(source).toMatch(/am\.is_active\s*=\s*true/i);
    expect(source).toMatch(/am\.status\s*=\s*'active'/i);
    expect(source).not.toMatch(/am\.status\s+is\s+null/i);
  });

  it("core city and house membership helpers are already strict", () => {
    for (const helper of [
      "admin_city_scope",
      "admin_current_membership_city",
      "admin_has_house_access",
    ]) {
      const { source } = latestFunctionMigration(helper);

      expect(source).toMatch(/is_active\s*=\s*true/i);
      expect(source).toMatch(/status\s*=\s*'active'/i);
      expect(source).not.toMatch(/status\s+is\s+null/i);
    }
  });

  it("task helpers delegate membership authorization instead of duplicating legacy status logic", () => {
    const taskHelperFiles = migrationFiles()
      .map((file) => ({
        file,
        source: fs.readFileSync(path.join(MIGRATIONS, file), "utf8"),
      }))
      .filter(({ source }) =>
        /create\s+or\s+replace\s+function\s+public\.(admin_has_platform_task_access|create_house_scoped_platform_task|ensure_draft_approval_task|ensure_house_plan_draft_approval_task)\s*\(/i.test(
          source,
        ),
      );

    expect(taskHelperFiles.length).toBeGreaterThan(0);

    const combined = taskHelperFiles.map(({ source }) => source).join("\n");

    expect(combined).toMatch(
      /public\.(admin_has_house_access|get_my_admin_role)\s*\(/i,
    );

    expect(combined).not.toMatch(
      /admin_memberships[\s\S]{0,500}status\s+is\s+null/i,
    );
  });
});
