import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/202607221845_create_import_buffer_staging.sql",
  ),
  "utf8",
);

const normalized = migration.toLowerCase().replace(/\s+/gu, " ");

describe("P04 import-buffer staging migration", () => {
  it("creates reusable upload and row staging tables", () => {
    expect(normalized).toContain(
      "create table if not exists public.import_buffer_uploads",
    );
    expect(normalized).toContain(
      "create table if not exists public.import_buffer_rows",
    );
    expect(normalized).toContain(
      "references public.import_buffer_uploads(id) on delete cascade",
    );
    expect(normalized).toContain(
      "references public.house_apartments(id) on delete set null",
    );
  });

  it("enforces upload status, period pairs and optimistic locking", () => {
    for (const status of [
      "parsed",
      "confirmed",
      "transferred",
      "failed",
      "discarded",
    ]) {
      expect(normalized).toContain(`'${status}'`);
    }

    expect(normalized).toContain(
      "import_buffer_detected_period_pair_check",
    );
    expect(normalized).toContain(
      "import_buffer_confirmed_period_pair_check",
    );
    expect(normalized).toContain(
      "lock_version integer not null default 1",
    );
    expect(normalized).toContain(
      "new.lock_version := old.lock_version + 1",
    );
  });

  it("enforces row classification and match integrity", () => {
    for (const classification of [
      "data",
      "skip_service",
      "skip_provider",
      "skip_group",
      "skip_total",
    ]) {
      expect(normalized).toContain(`'${classification}'`);
    }

    expect(normalized).toContain(
      "import_buffer_row_match_check",
    );
    expect(normalized).toContain(
      "import_buffer_row_classification_match_check",
    );
    expect(normalized).toContain(
      "jsonb_typeof(warnings) = 'array'",
    );
  });

  it("enables RLS and denies anonymous table access", () => {
    expect(normalized).toContain(
      "alter table public.import_buffer_uploads enable row level security",
    );
    expect(normalized).toContain(
      "alter table public.import_buffer_rows enable row level security",
    );
    expect(normalized).toContain(
      "revoke all on table public.import_buffer_uploads from anon",
    );
    expect(normalized).toContain(
      "revoke all on table public.import_buffer_rows from anon",
    );
    expect(normalized).not.toContain("to anon");
    expect(normalized).not.toContain("to public");
  });

  it("scopes every policy through admin house access", () => {
    expect(
      normalized.match(/public\.admin_has_house_access/gu)?.length ?? 0,
    ).toBeGreaterThanOrEqual(10);

    for (const command of [
      "for select",
      "for insert",
      "for update",
      "for delete",
    ]) {
      expect(normalized.match(new RegExp(command, "gu"))?.length ?? 0)
        .toBeGreaterThanOrEqual(2);
    }

    expect(normalized).toContain(
      "and created_by = auth.uid()",
    );
    expect(normalized).toContain(
      "where upload.id = import_buffer_rows.upload_id",
    );
  });

  it("contains preflight, verification and forward-fix guidance", () => {
    expect(normalized).toContain(
      "select to_regclass('public.import_buffer_uploads')",
    );
    expect(normalized).toContain(
      "select to_regprocedure('public.admin_has_house_access(uuid)')",
    );
    expect(normalized).toContain("verification:");
    expect(normalized).toContain("forward-fix");
    expect(normalized).toContain("90 days");
  });
});
