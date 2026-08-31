import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS = path.resolve(process.cwd(), "supabase/migrations");

function latestFunctionMigration(functionName: string): {
  file: string;
  source: string;
} {
  const escaped = functionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `create\\s+or\\s+replace\\s+function\\s+public\\.${escaped}\\s*\\(`,
    "i",
  );

  const files = fs
    .readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .reverse();

  for (const file of files) {
    const source = fs.readFileSync(path.join(MIGRATIONS, file), "utf8");
    if (pattern.test(source)) {
      return { file, source };
    }
  }

  throw new Error(`No migration found for ${functionName}`);
}

describe("S2-T5 no-house platform task semantics", () => {
  it("RED: no-house task access is superadmin or active creator only", () => {
    const { source } = latestFunctionMigration(
      "admin_has_platform_task_access",
    );

    expect(source).toMatch(/public\.admin_is_superadmin\s*\(\s*\)/i);

    expect(source).toMatch(
      /not\s+exists\s*\(\s*select\s+1\s+from\s+public\.platform_task_houses[\s\S]*?task\.created_by\s*=\s*auth\.uid\s*\(\s*\)[\s\S]*?public\.get_my_admin_role\s*\(\s*\)\s+is\s+not\s+null/i,
    );

    expect(source).not.toMatch(
      /admin_current_membership_city\s*\(\s*\)\s+is\s+null[\s\S]*?get_my_admin_role\s*\(\s*\)\s+is\s+not\s+null/i,
    );
  });

  it("preserves house-linked task access through exact house scope", () => {
    const { source } = latestFunctionMigration(
      "admin_has_platform_task_access",
    );

    expect(source).toMatch(
      /exists\s*\(\s*select\s+1\s+from\s+public\.platform_task_houses[\s\S]*?not\s+exists\s*\([\s\S]*?not\s+public\.admin_has_house_access\s*\(\s*th\.house_id\s*\)/i,
    );
  });

  it("does not introduce shared city-task semantics into S2-T5", () => {
    const { source } = latestFunctionMigration(
      "admin_has_platform_task_access",
    );

    const executableSql = source
      .replace(/--.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");

    expect(executableSql).not.toMatch(/task\.city_id/i);
    expect(executableSql).not.toMatch(
      /alter\s+table\s+public\.platform_tasks[\s\S]*?city_id/i,
    );
  });
});
