import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const enabled = process.env.P09_T8_REAL_DB === "1";
const describeRealDb = enabled ? describe : describe.skip;

const dbUrl =
  process.env.P09_LOCAL_DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

function psql(sql: string) {
  return execFileSync(
    "psql",
    [dbUrl, "-X", "-v", "ON_ERROR_STOP=1", "-Atqc", sql],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  ).trim();
}

describeRealDb("P09 T8 contractors real DB isolation", () => {
  const adminA = "92000000-0000-4000-8000-000000000001";
  const cityB = "92000000-0000-4000-8000-000000000012";
  const globalContractor = "92000000-0000-4000-8000-000000000021";
  const contractorA = "92000000-0000-4000-8000-000000000022";
  const contractorB = "92000000-0000-4000-8000-000000000023";

  it("admin A reads global + A, not B, and cannot update global/B", () => {
    const visible = psql(`
      begin;
      set local role authenticated;
      select set_config('request.jwt.claim.sub', '${adminA}', true);
      select string_agg(id::text, ',' order by id::text)
      from public.contractors
      where id in (
        '${globalContractor}'::uuid,
        '${contractorA}'::uuid,
        '${contractorB}'::uuid
      );
      rollback;
    `);

    expect(visible).toContain(globalContractor);
    expect(visible).toContain(contractorA);
    expect(visible).not.toContain(contractorB);

    const ownUpdated = psql(`
      begin;
      set local role authenticated;
      select set_config('request.jwt.claim.sub', '${adminA}', true);
      update public.contractors
      set is_active = false
      where id = '${contractorA}'::uuid;
      select count(*) from public.contractors
      where id='${contractorA}'::uuid and is_active=false;
      rollback;
    `);
    expect(ownUpdated.endsWith("1")).toBe(true);

    const globalStillActive = psql(`
      begin;
      set local role authenticated;
      select set_config('request.jwt.claim.sub', '${adminA}', true);
      update public.contractors
      set is_active = false
      where id = '${globalContractor}'::uuid;
      reset role;
      select count(*) from public.contractors
      where id='${globalContractor}'::uuid and is_active=true;
      rollback;
    `);
    expect(globalStillActive.endsWith("1")).toBe(true);

    const foreignStillActive = psql(`
      begin;
      set local role authenticated;
      select set_config('request.jwt.claim.sub', '${adminA}', true);
      update public.contractors
      set is_active = false
      where id = '${contractorB}'::uuid;
      reset role;
      select count(*) from public.contractors
      where id='${contractorB}'::uuid and is_active=true;
      rollback;
    `);
    expect(foreignStillActive.endsWith("1")).toBe(true);
  });

  it("admin A cannot insert a contractor into city B", () => {
    let failed = false;

    try {
      psql(`
        begin;
        set local role authenticated;
        select set_config('request.jwt.claim.sub', '${adminA}', true);
        insert into public.contractors (
          name,
          normalized_name,
          city_id,
          created_by
        )
        values (
          'T8 foreign insert',
          't8 foreign insert',
          '${cityB}'::uuid,
          '${adminA}'::uuid
        );
        rollback;
      `);
    } catch {
      failed = true;
    }

    expect(failed).toBe(true);
  });
});
