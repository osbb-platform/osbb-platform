import { describe, expect, it } from "vitest";
import { REAL_DB_TEST_TIMEOUT, sql } from "../helpers/realDbSql";

// `SET`/`RESET` print their own status lines even under `psql -At`; only the
// last line is the actual SELECT result we care about.
function lastLine(output: string): string {
  const lines = output.split("\n").filter((line) => line.trim().length > 0);
  return lines[lines.length - 1] ?? "";
}

// Track 9: house_apartments (and every other house-scoped table) RLS calls
// admin_has_house_access(house_id) -> admin_city_scope() -> possibly
// admin_is_superadmin(), once per candidate row. Each of those does an EXISTS
// against admin_memberships. Only single-column indexes existed on that
// table before this migration; this test proves the new partial covering
// index exists and, most importantly, that adding it did not change
// authorization outcomes (same rows visible to an authorized city-scoped
// admin, still zero rows for an unrelated user) — a pure performance index,
// not a security change. Actual EXPLAIN ANALYZE before/after timings are
// captured in the implementation report rather than asserted here, since
// absolute timings are not a stable thing to assert in an automated test.
describe("P09 admin_memberships scope performance index (Track 9)", () => {
  it("the new partial covering index exists with the expected definition", () => {
    const indexDef = sql(
      "select indexdef from pg_indexes where indexname = 'admin_memberships_active_global_scope_idx';",
    );
    expect(indexDef).toContain("admin_memberships");
    expect(indexDef).toContain("user_id");
    expect(indexDef).toContain("city_id");
    expect(indexDef).toContain("house_id IS NULL");
    expect(indexDef).toContain("is_active");
    expect(indexDef).toContain("status = 'active'::text");
  });

  it("does not change RLS outcomes: an unrelated user still sees zero rows through house_apartments_select_scoped", () => {
    const houseId = sql("select id from public.houses limit 1;");
    expect(houseId).not.toBe("");

    const visibleCountRaw = sql(`
      set role authenticated;
      set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000099';
      set request.jwt.claims = '{"role":"authenticated","sub":"00000000-0000-4000-8000-000000000099"}';
      select count(*) from public.house_apartments where house_id = '${houseId}';
    `.trim().split("\n").filter(Boolean).join(" "));

    expect(lastLine(visibleCountRaw)).toBe("0");
  }, REAL_DB_TEST_TIMEOUT);

  it("does not change RLS outcomes: a real city-scoped admin sees exactly the unrestricted row count for a house in their city", () => {
    const adminRow = sql(
      "select am.user_id||'|'||am.city_id from public.admin_memberships am where am.role='admin' and am.house_id is null and am.is_active and am.status='active' and am.city_id is not null limit 1;",
    );
    expect(adminRow).not.toBe("");
    const [userId, cityId] = adminRow.split("|");

    const houseInCity = sql(
      `select h.id from public.houses h join public.districts d on d.id = h.district_id where d.city_id = '${cityId}' limit 1;`,
    );
    expect(houseInCity).not.toBe("");

    const unrestrictedCount = sql(
      `select count(*) from public.house_apartments where house_id = '${houseInCity}';`,
    );

    const scopedCountRaw = sql(`
      set role authenticated;
      set request.jwt.claim.sub = '${userId}';
      set request.jwt.claims = '{"role":"authenticated","sub":"${userId}"}';
      select count(*) from public.house_apartments where house_id = '${houseInCity}';
    `.trim().split("\n").filter(Boolean).join(" "));

    expect(lastLine(scopedCountRaw)).toBe(unrestrictedCount);
  }, REAL_DB_TEST_TIMEOUT);
});
