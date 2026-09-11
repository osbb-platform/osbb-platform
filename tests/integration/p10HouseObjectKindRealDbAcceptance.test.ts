import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { REAL_DB_TEST_TIMEOUT, sql } from "../helpers/realDbSql";

describe("P10 houses.object_kind real DB acceptance (Track 4)", () => {
  it("every pre-existing house defaulted to apartment_building (backward compatible)", () => {
    const nonApartmentCount = sql(
      "select count(*) from public.houses where object_kind <> 'apartment_building' and created_at < now() - interval '1 minute';",
    );
    expect(nonApartmentCount).toBe("0");
  }, REAL_DB_TEST_TIMEOUT);

  it("object_kind is NOT NULL with a default", () => {
    const columnInfo = sql(
      "select is_nullable||'|'||column_default from information_schema.columns where table_schema='public' and table_name='houses' and column_name='object_kind';",
    );
    expect(columnInfo).toBe("NO|'apartment_building'::text");
  }, REAL_DB_TEST_TIMEOUT);

  it("rejects an invalid object_kind value via the CHECK constraint", () => {
    expect(() =>
      sql(
        `insert into public.houses (id, management_company_id, name, slug, address, object_kind) values ('${randomUUID()}', (select id from public.management_companies limit 1), 'Invalid Kind Test', 'invalid-kind-test-${randomUUID()}', 'x', 'not_a_real_kind');`,
      ),
    ).toThrow(/houses_object_kind_check/);
  }, REAL_DB_TEST_TIMEOUT);

  describe("fixture-driven: create as garden_association, then block/allow kind change based on dependent units", () => {
    const houseId = randomUUID();
    const apartmentId = randomUUID();

    afterAll(() => {
      sql(`delete from public.houses where id = '${houseId}';`);
    }, REAL_DB_TEST_TIMEOUT);

    it("creates successfully with object_kind = garden_association", () => {
      const managementCompanyId = sql("select id from public.management_companies limit 1;");
      expect(managementCompanyId).not.toBe("");

      sql(
        `insert into public.houses (id, management_company_id, name, slug, address, object_kind) values ('${houseId}', '${managementCompanyId}', 'P10 Garden Fixture', 'p10-garden-fixture-${houseId}', 'x', 'garden_association');`,
      );

      const storedKind = sql(`select object_kind from public.houses where id = '${houseId}';`);
      expect(storedKind).toBe("garden_association");
    }, REAL_DB_TEST_TIMEOUT);

    it("can freely change object_kind while the house has zero units", () => {
      sql(`update public.houses set object_kind = 'apartment_building' where id = '${houseId}';`);
      const kindAfter = sql(`select object_kind from public.houses where id = '${houseId}';`);
      expect(kindAfter).toBe("apartment_building");

      // Revert back for the next assertion.
      sql(`update public.houses set object_kind = 'garden_association' where id = '${houseId}';`);
    }, REAL_DB_TEST_TIMEOUT);

    it("app-level guard (canChangeHouseObjectKind logic, exercised at the DB layer) would see a nonzero active unit count once a unit exists", () => {
      sql(
        `insert into public.house_apartments (id, house_id, account_number, apartment_label, owner_name, source_type) values ('${apartmentId}', '${houseId}', 'ACC-1', 'Д. 1', 'Owner', 'manual');`,
      );

      const activeUnitsCount = sql(
        `select count(*) from public.house_apartments where house_id = '${houseId}' and archived_at is null;`,
      );
      expect(Number(activeUnitsCount)).toBeGreaterThan(0);
      // The actual block decision is unit-tested directly against
      // canChangeHouseObjectKind() in tests/unit/houseUnitTerminology.test.ts;
      // this test only proves the DB-side count the server action relies on
      // is accurate once a real unit row exists.
    }, REAL_DB_TEST_TIMEOUT);
  });
});
