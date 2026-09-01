import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const migration = fs.readFileSync(
  path.join(
    root,
    "supabase/migrations/202609010001_u1_footer_management_company_slogan.sql",
  ),
  "utf8",
);

describe("U1-T2 management company slogan migration", () => {
  it("updates existing management companies without inserting rows", () => {
    expect(migration).toContain(
      "update public.management_companies",
    );
    expect(migration).not.toMatch(
      /insert\s+into\s+public\.management_companies/i,
    );
  });

  it("targets only approved Бухгалтер онлайн name variants", () => {
    expect(migration).toContain("ТОВ Бухгалтер онлайн");
    expect(migration).toContain("ТОВ Бухгалтер онлайн-ЗП");
    expect(migration).toContain(
      "Сучасні технології в бухгалтерії — облік, якому можна довіряти.",
    );
    expect(migration).toContain("where trim(name) in");
  });

  it("is idempotent for the target slogan", () => {
    expect(migration).toContain("and slogan is distinct from");
  });
});
