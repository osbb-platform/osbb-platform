import {
  readFileSync,
} from "node:fs";
import { join } from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";

function read(relativePath: string) {
  return readFileSync(
    join(process.cwd(), relativePath),
    "utf8",
  );
}

const commandFiles = [
  "src/modules/content-engine/v2/handlers/debtors/commands/importMonthDraft.ts",
  "src/modules/content-engine/v2/handlers/debtors/commands/publishMonthSnapshot.ts",
  "src/modules/content-engine/v2/handlers/debtors/commands/discardMonthSnapshot.ts",
  "src/modules/content-engine/v2/handlers/debtors/commands/relabelMonthSnapshot.ts",
];

describe("P03 debtor history command boundary", () => {
  it("keeps mutations behind the server-only Supabase client", () => {
    for (const file of commandFiles) {
      const source = read(file);

      expect(source).toContain("createSupabaseAdminClient");
      expect(source).toContain("adminSupabase.rpc");
      expect(source).not.toContain("ctx.supabase.rpc");
    }
  });

  it("passes the authenticated actor explicitly during import", () => {
    const source = read(commandFiles[0]);

    expect(source).toContain("p_created_by: ctx.user.id");
  });

  it("does not grant command RPCs to authenticated clients", () => {
    const migration =
      "supabase/migrations/202607102042_add_house_debtor_history_commands.sql";
    const sql = read(migration).toLowerCase();

    expect(sql).toContain("to service_role");
    expect(sql).toContain("from public, authenticated");
    expect(sql).not.toContain("to authenticated");
  });
});
