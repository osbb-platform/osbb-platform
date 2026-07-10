import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.resolve(
    process.cwd(),
    "supabase/migrations/202607102000_fix_announcement_pdf_registry_persistence.sql",
  ),
  "utf8",
);

describe("announcement PDF registry persistence migration", () => {
  it("uses a hardened exact-house helper", () => {
    expect(migration).toContain("public.can_manage_house_announcement_content_file");
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("membership.house_id = announcement.house_id");
    expect(migration).toContain("target_field_key = 'pdf'");
    expect(migration).toContain("target_storage_bucket = 'house-announcements'");
  });

  it("keeps the management helper unavailable to anon", () => {
    expect(migration).toContain("from anon;");
    expect(migration).not.toContain(
      "grant execute\non function public.can_manage_house_announcement_content_file(uuid, text, text, text)\nto anon;",
    );
  });

  it("adds scoped write and published-only public read policies", () => {
    expect(migration).toContain("create policy house_announcement_files_admin_insert");
    expect(migration).toContain("create policy house_announcement_files_admin_update");
    expect(migration).toContain("create policy house_announcement_files_admin_delete");
    expect(migration).toContain(
      'create policy "Public read published house announcement files"',
    );
    expect(migration).toContain("announcement.lifecycle_status = 'published'");
    expect(migration).toContain("house.is_active = true");
    expect(migration).toContain("house.archived_at is null");
  });

  it("enforces uniqueness and recovers only live announcement orphans", () => {
    expect(migration).toContain("house_content_files_one_announcement_pdf_idx");
    expect(migration).toContain("from storage.objects object");
    expect(migration).toContain("join public.house_announcements announcement");
    expect(migration).toContain("candidate.candidate_rank = 1");
    expect(migration).not.toContain("delete from storage.objects");
  });
});
