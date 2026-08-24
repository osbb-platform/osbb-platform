import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202608241800_p09_r0_3_content_scope.sql"),
  "utf8",
);

describe("P09 R0.3 migration contract", () => {
  it("enables RLS on legacy house_documents", () => {
    expect(sql).toMatch(/alter table public\.house_documents enable row level security/i);
    expect(sql).toMatch(/p09_house_documents_admin_scoped[\s\S]*admin_has_house_access\(house_id\)/i);
  });

  it("scopes direct content families with admin_has_house_access", () => {
    for (const table of [
      "house_announcements",
      "house_board_intro",
      "house_board_members",
      "house_faq",
      "house_hero",
      "house_home_widgets",
      "house_information_posts",
      "house_meetings",
      "house_pages",
      "house_plan_tasks",
      "house_polls",
      "house_report_categories",
      "house_reports",
      "house_requisites",
      "house_specialists",
      "house_specialists_categories",
    ]) {
      expect(sql, table).toContain(table);
    }
    expect(sql.match(/admin_has_house_access\(house_id\)/gi)?.length ?? 0).toBeGreaterThan(15);
  });

  it("scopes indirect FAQ, meeting, poll, page and content-file families", () => {
    expect(sql).toContain("admin_has_faq_access");
    expect(sql).toContain("admin_has_meeting_access");
    expect(sql).toContain("admin_has_ballot_access");
    expect(sql).toContain("admin_has_poll_access");
    expect(sql).toContain("admin_has_poll_question_access");
    expect(sql).toContain("admin_has_house_page_access");
    expect(sql).toContain("admin_has_content_file_access");
  });

  it("does not touch R0.4 debtor/history/import tables", () => {
    expect(sql).not.toMatch(/alter table public\.house_content_history/i);
    expect(sql).not.toMatch(/alter table public\.house_debtor/i);
    expect(sql).not.toMatch(/alter table public\.house_debtors/i);
    expect(sql).not.toMatch(/alter table public\.import_buffer/i);
    expect(sql).not.toMatch(/alter table public\.platform_tasks/i);
  });

  it("does not touch resident access/session functions", () => {
    expect(sql).not.toMatch(/create or replace function public\.verify_house_access/i);
    expect(sql).not.toMatch(/create or replace function public\.is_house_session_valid/i);
    expect(sql).not.toMatch(/create or replace function public\.upsert_house_access/i);
  });
});
