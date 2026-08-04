import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const actions = readFileSync(
  join(
    process.cwd(),
    "src/modules/import-buffer/actions/debtors1cImportBufferActions.ts",
  ),
  "utf8",
);

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/202607221845_create_import_buffer_staging.sql",
  ),
  "utf8",
);

const ui = readFileSync(
  join(
    process.cwd(),
    "src/modules/import-buffer/components/HouseDebtors1cImportPanel.tsx",
  ),
  "utf8",
);

describe("P04 server/security boundary", () => {
  it("requires authenticated admin and Debtors create permission", () => {
    expect(actions).toContain("getCurrentAdminUser");
    expect(actions).toContain("assertWorkspaceAction");
    expect(actions).toContain('workspace: "debtors"');
    expect(actions).toContain('action: "create"');
    expect(actions).toContain("Потрібна авторизація адміністратора");
  });

  it("scopes every staging mutation by house and optimistic lock", () => {
    expect(actions).toContain('.eq("house_id", access.house.id)');
    expect(actions).toContain('.eq("lock_version", state.lockVersion)');
    expect(actions).toContain('.eq("status", "parsed")');
    expect(actions).toContain('.eq("status", "confirmed")');
  });

  it("dispatches through P03 instead of writing debtor snapshots directly", () => {
    expect(actions).toContain("dispatchAdminCommand");
    expect(actions).toContain('type: "debtors.importMonthDraft"');
    expect(actions).not.toContain(
      '.from("house_debtor_month_snapshots").insert',
    );
    expect(actions).not.toContain('.from("house_debtor_month_rows").insert');
  });

  it("enforces file and hourly limits server-side", () => {
    expect(actions).toContain("validateImportFileDescriptor");
    expect(actions).toContain("MAX_UPLOADS_PER_HOUR = 10");
    expect(actions).toContain('.gte("created_at", since)');
  });

  it("keeps staging private from anon and residents", () => {
    const normalized = migration.toLowerCase();

    expect(normalized).toContain(
      "revoke all on table public.import_buffer_uploads from anon",
    );
    expect(normalized).toContain(
      "revoke all on table public.import_buffer_rows from anon",
    );
    expect(normalized).not.toContain("to anon");
    expect(normalized).not.toContain("to public");
    expect(normalized).toContain("public.admin_has_house_access");
  });

  it("keeps server confirmation guard while allowing confirm-and-transfer UX", () => {
    expect(ui).toContain("confirmAndTransfer");
    expect(ui).toContain('currentState.status !== "confirmed"');
    expect(ui).toContain('"Підтвердити та передати"');
    expect(ui).toContain("state.unknownSourceAccounts.length > 0");
    expect(ui).toContain("transferBlocked");
  });
});
