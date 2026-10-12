import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { readAllCountedPages } from "../../src/shared/data/readAllCountedPages";

const source = readFileSync(
  join(process.cwd(), "src/modules/houses/services/getPublishedHouseDebtors.ts"),
  "utf8",
);

describe("P03 public debtor history service", () => {
  it("uses the calculated history projection instead of legacy items", () => {
    expect(source).toContain('"get_public_house_debtor_history"');
    expect(source).not.toContain('.from("house_debtors_items")');
    expect(source).toContain('{ count: "exact" }');
    expect(source).toContain(".range(from, to)");
  });

  it("paginates a Supabase RPC when the API cap is below the requested range", async () => {
    const rows = Array.from({ length: 325 }, (_, index) => ({
      row_id: `row-${String(index + 1).padStart(3, "0")}`,
      period_year: 2026,
      period_month: 9,
    }));
    const ranges: string[] = [];
    const preferences: string[] = [];

    const syntheticFetch: typeof fetch = async (input, init) => {
      const request = new Request(input, init);
      const offset = Number(new URL(request.url).searchParams.get("offset") ?? 0);
      const limit = Number(new URL(request.url).searchParams.get("limit") ?? 500);
      const from = offset;
      const to = offset + limit - 1;
      const cappedTo = Math.min(from + 36, to, rows.length - 1);
      const page = from < rows.length ? rows.slice(from, cappedTo + 1) : [];

      ranges.push(`${from}-${to}`);
      preferences.push(String(request.headers.get("prefer") ?? ""));

      return new Response(JSON.stringify(page), {
        status: 206,
        headers: {
          "Content-Type": "application/json",
          "Content-Range":
            page.length > 0
              ? `${from}-${from + page.length - 1}/${rows.length}`
              : `*/${rows.length}`,
        },
      });
    };

    const supabase = createClient(
      "https://synthetic.invalid",
      "synthetic-anon-key",
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
        global: { fetch: syntheticFetch },
      },
    );

    const result = await readAllCountedPages<(typeof rows)[number]>({
      label: "public debtor history RPC",
      pageSize: 500,
      getRowKey: (row) => row.row_id,
      fetchPage: async (from, to) => {
        const page = await supabase
          .rpc(
            "get_public_house_debtor_history",
            { p_house_id: "00000000-0000-0000-0000-000000000001" },
            { count: "exact" },
          )
          .range(from, to);

        return {
          data: (page.data ?? []) as typeof rows,
          error: page.error,
          count: page.count,
        };
      },
    });

    expect(result).toHaveLength(325);
    expect(result[0]?.period_month).toBe(9);
    expect(result.at(-1)?.row_id).toBe("row-325");
    expect(ranges).toEqual([
      "0-499",
      "37-536",
      "74-573",
      "111-610",
      "148-647",
      "185-684",
      "222-721",
      "259-758",
      "296-795",
    ]);
    expect(preferences.every((value) => value.includes("count=exact"))).toBe(
      true,
    );
  });

  it("maps latest period and continuous debt metadata", () => {
    expect(source).toContain("latestPublishedMonth");
    expect(source).toContain("monthsInDebt");
    expect(source).toContain("seriesBroken");
  });
});
