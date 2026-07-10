import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/202607101710_fix_house_announcement_storage_scope.sql",
  "utf8",
);

const uploadHelper = readFileSync(
  "src/modules/houses/components/announcementPdfUpload.ts",
  "utf8",
);

describe("house announcement storage scope hotfix", () => {
  it("uses a hardened house-aware authorization function", () => {
    expect(migration).toContain(
      "public.can_manage_house_announcement_storage_object",
    );
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("public.admin_memberships");
    expect(migration).toContain("membership.user_id = auth.uid()");
  });

  it("allows a global membership or a membership for the target house", () => {
    expect(migration).toContain("membership.house_id is null");
    expect(migration).toContain(
      "membership.house_id = parsed.target_house_id",
    );
    expect(migration).toContain("membership.is_active = true");
    expect(migration).toContain("membership.status = 'active'");
  });

  it("extracts the house only from supported storage paths", () => {
    expect(migration).toContain("^houses/");
    expect(migration).toContain("/announcements/");
    expect(migration).toContain("/announcement[.]pdf$");
    expect(migration).toContain(
      "split_part(object_name, '/', 2)::uuid",
    );
    expect(migration).toContain(
      "split_part(object_name, '/', 1)::uuid",
    );
    expect(migration).toContain(
      "parsed.target_house_id is not null",
    );
  });

  it("does not depend on the global-only role helper", () => {
    expect(migration).not.toContain("get_my_admin_role()");
    expect(migration).not.toContain("is_authenticated_admin()");
  });

  it("explicitly removes helper execution from anon", () => {
    expect(migration).toContain(
      "revoke execute\non function public.can_manage_house_announcement_storage_object(text)\nfrom anon;",
    );
    expect(migration).not.toContain(
      "grant execute\non function public.can_manage_house_announcement_storage_object(text)\nto anon;",
    );
  });

  it("replaces only write policies and keeps reads private", () => {
    expect(migration).toContain(
      "create policy house_announcements_admin_insert",
    );
    expect(migration).toContain(
      "create policy house_announcements_admin_update",
    );
    expect(migration).toContain(
      "create policy house_announcements_admin_delete",
    );
    expect(migration.toLowerCase()).not.toContain("for select");
  });

  it("does not use unrestricted RLS conditions", () => {
    expect(migration).not.toContain("using (true)");
    expect(migration).not.toContain("with check (true)");
  });

  it("uploads each generated object without upsert", () => {
    expect(uploadHelper).toContain("upsert: false");
    expect(uploadHelper).not.toContain("upsert: true");
  });
});
