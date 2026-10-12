import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/202610090001_p04_atomic_import_buffer_transfer.sql",
  ),
  "utf8",
).toLowerCase();

const normalized = sql.replace(/\s+/gu, " ");

describe("P04 atomic import-buffer transfer migration contract", () => {
  it("keeps both transfer entry points service-role only", () => {
    expect(normalized).toContain(
      "revoke all on function public.transfer_house_debtor_import_buffer_atomic( uuid, uuid, uuid, int, boolean, jsonb ) from public, anon, authenticated",
    );
    expect(normalized).toContain(
      "grant execute on function public.transfer_house_debtor_import_buffer_atomic( uuid, uuid, uuid, int, boolean, jsonb ) to service_role",
    );
    expect(normalized).toContain(
      "revoke all on function public.import_house_debtor_month_draft_idempotent( uuid, uuid, int, int, text, jsonb, jsonb ) from public, anon, authenticated",
    );
    expect(normalized).toContain(
      "grant execute on function public.import_house_debtor_month_draft_idempotent( uuid, uuid, int, int, text, jsonb, jsonb ) to service_role",
    );
  });

  it("keeps house deletion valid while protecting referenced apartments", () => {
    expect(normalized).toContain("on delete no action deferrable initially deferred");
    expect(normalized).toContain("lock table public.house_apartments in share mode");
    expect(normalized).toContain("from public.houses as house");
    expect(normalized).toContain("for key share");
  });

  it("validates canonical mappings and normalized registry uniqueness", () => {
    expect(normalized).toContain("p04_duplicate_registry_account");
    expect(normalized).toContain("p04_duplicate_matched_apartment");
    expect(normalized).toContain("p04_registry_mapping_changed");
    expect(normalized).toContain("normalize_debtors_1c_account_number");
  });

  it("commits snapshot, upload counters and history in the same RPC", () => {
    expect(normalized).toContain("public.import_house_debtor_month_draft(");
    expect(normalized).toContain("update public.import_buffer_uploads");
    expect(normalized).toContain("insert into public.house_content_history");
    expect(normalized).toContain("p04_persisted_count_mismatch");
  });
});
