import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

function dbContainer() {
  const output = execFileSync(
    "docker",
    ["ps", "--format", "{{.Names}}"],
    { encoding: "utf8" },
  );

  const name = output
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("supabase_db_"));

  if (!name) {
    throw new Error("LOCAL_SUPABASE_DB_CONTAINER_REQUIRED");
  }

  return name;
}

function sql(query: string) {
  return execFileSync(
    "docker",
    [
      "exec",
      dbContainer(),
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-At",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      query,
    ],
    { encoding: "utf8" },
  ).trim();
}

describe("P07 rate-limit real DB acceptance", () => {
  it("creates table and RPC", () => {
    expect(sql("select to_regclass('public.site_rate_limits');"))
      .toBe("site_rate_limits");

    expect(
      sql(
        "select to_regprocedure('public.consume_site_rate_limit(text,text,integer,integer)');",
      ),
    ).toBe("consume_site_rate_limit(text,text,integer,integer)");
  });

  it("allows first five attempts and blocks the sixth", () => {
    sql(
      "delete from public.site_rate_limits where scope='acceptance' and subject_hash='subject';",
    );

    const results = Array.from({ length: 6 }, () =>
      sql(
        "select allowed||'|'||retry_after_seconds from public.consume_site_rate_limit('acceptance','subject',60,5);",
      ),
    );

    expect(
      results.slice(0, 5).every((value) => {
        const [allowed] = value.split("|");
        return allowed === "true" || allowed === "t";
      }),
    ).toBe(true);

    {
      const [allowed] = results[5].split("|");
      expect(allowed === "false" || allowed === "f").toBe(true);
    }
  }, 20_000);

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
  });

  it("service_role can execute the RPC", () => {
    expect(
      sql(
        "select has_function_privilege('service_role','public.consume_site_rate_limit(text,text,integer,integer)','execute');",
      ),
    ).toBe("t");
  });
});
