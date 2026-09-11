import { beforeAll, describe, expect, it } from "vitest";
import { assertLocalDbReachable, REAL_DB_TEST_TIMEOUT, sql, sqlBatch } from "../helpers/realDbSql";

describe("P07 rate-limit real DB acceptance", () => {
  beforeAll(() => {
    assertLocalDbReachable();
  }, REAL_DB_TEST_TIMEOUT);

  it("creates table and RPC", () => {
    expect(sql("select to_regclass('public.site_rate_limits');"))
      .toBe("site_rate_limits");

    expect(
      sql(
        "select to_regprocedure('public.consume_site_rate_limit(text,text,integer,integer)');",
      ),
    ).toBe("consume_site_rate_limit(text,text,integer,integer)");
  }, REAL_DB_TEST_TIMEOUT);

  it("allows first five attempts and blocks the sixth, then resets after the window", () => {
    sql(
      "delete from public.site_rate_limits where scope in ('acceptance','other-scope') and subject_hash in ('subject','other-subject');",
    );

    const consumeAcceptanceSubject =
      "select allowed||'|'||retry_after_seconds from public.consume_site_rate_limit('acceptance','subject',60,5);";

    // Batched into one docker-exec/psql process instead of one process per
    // attempt: under parallel-worker CPU contention, per-process spawn
    // overhead was pushing this scenario past its timeout even though the
    // underlying DB behavior was correct (see REAL_DB_TEST_TIMEOUT doc).
    const [attempt1, attempt2, attempt3, attempt4, attempt5, attempt6, otherSubject, otherScope] = sqlBatch([
      consumeAcceptanceSubject,
      consumeAcceptanceSubject,
      consumeAcceptanceSubject,
      consumeAcceptanceSubject,
      consumeAcceptanceSubject,
      consumeAcceptanceSubject,
      // Different subject under the same scope must not be throttled by
      // another subject's window (no accidental global/shared-key throttling).
      "select allowed from public.consume_site_rate_limit('acceptance','other-subject',60,5);",
      // Different scope for the same subject must not be throttled either
      // (key scope isolation).
      "select allowed from public.consume_site_rate_limit('other-scope','subject',60,5);",
    ]);

    for (const value of [attempt1, attempt2, attempt3, attempt4, attempt5]) {
      const [allowed] = value.split("|");
      expect(allowed === "true" || allowed === "t").toBe(true);
    }

    const [sixthAllowed, sixthRetryAfter] = attempt6.split("|");
    expect(sixthAllowed === "false" || sixthAllowed === "f").toBe(true);
    expect(Number(sixthRetryAfter)).toBeGreaterThan(0);

    expect(otherSubject === "true" || otherSubject === "t").toBe(true);
    expect(otherScope === "true" || otherScope === "t").toBe(true);

    // Simulate window expiry by backdating window_started_at, then confirm the
    // subject is allowed again (fresh window, attempt_count reset to 1).
    sql(
      "update public.site_rate_limits set window_started_at = now() - interval '61 seconds' where scope='acceptance' and subject_hash='subject';",
    );
    const [afterWindowAllowed, afterWindowCount] = sqlBatch([
      "select allowed from public.consume_site_rate_limit('acceptance','subject',60,5);",
      "select attempt_count from public.site_rate_limits where scope='acceptance' and subject_hash='subject';",
    ]);

    expect(afterWindowAllowed === "true" || afterWindowAllowed === "t").toBe(true);
    expect(Number(afterWindowCount)).toBe(1);

    sql(
      "delete from public.site_rate_limits where scope in ('acceptance','other-scope') and subject_hash in ('subject','other-subject');",
    );
  }, REAL_DB_TEST_TIMEOUT);

  it("anon/authenticated have no direct table or RPC privilege", () => {
    expect(
      sql(
        "select has_table_privilege('anon','public.site_rate_limits','select');",
      ),
    ).toBe("f");

    expect(
      sql(
        "select has_table_privilege('authenticated','public.site_rate_limits','select');",
      ),
    ).toBe("f");

    expect(
      sql(
        "select has_function_privilege('anon','public.consume_site_rate_limit(text,text,integer,integer)','execute');",
      ),
    ).toBe("f");

    expect(
      sql(
        "select has_function_privilege('authenticated','public.consume_site_rate_limit(text,text,integer,integer)','execute');",
      ),
    ).toBe("f");
  }, REAL_DB_TEST_TIMEOUT);

  it("service_role can execute the RPC", () => {
    expect(
      sql(
        "select has_function_privilege('service_role','public.consume_site_rate_limit(text,text,integer,integer)','execute');",
      ),
    ).toBe("t");
  }, REAL_DB_TEST_TIMEOUT);
});
