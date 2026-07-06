import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createPublishableSupabaseTestClient } from "@/tests/helpers/createPublishableSupabaseTestClient";

const currentDirectory = dirname(
  fileURLToPath(import.meta.url),
);

const root = resolve(currentDirectory, "../..");

const migration = readFileSync(
  resolve(
    root,
    "supabase/migrations/202607060001_secure_public_houses.sql",
  ),
  "utf8",
);

const publicReader = readFileSync(
  resolve(
    root,
    "src/modules/houses/services/getHouseBySlug.ts",
  ),
  "utf8",
);

const publicSearch = readFileSync(
  resolve(
    root,
    "src/modules/houses/services/searchPublicHouses.ts",
  ),
  "utf8",
);

describe("S1.T1 public houses access boundary", () => {
  it("excludes access codes from the public view", () => {
    const viewSection = migration
      .split(
        "create or replace view public.public_houses",
      )[1]
      ?.split("from public.houses house")[0];

    expect(viewSection).toBeDefined();
    expect(viewSection).not.toContain(
      "current_access_code",
    );
    expect(viewSection).toContain("house.id");
    expect(viewSection).toContain("house.slug");
    expect(viewSection).toContain(
      "house.cover_image_path",
    );
  });

  it("removes anonymous base-table access", () => {
    expect(migration).toContain(
      'drop policy if exists "Public can read active houses"',
    );

    expect(migration).toMatch(
      /revoke\s+select\s+on table public\.houses\s+from anon/i,
    );

    expect(migration).toMatch(
      /grant\s+select\s+on table public\.public_houses\s+to anon,\s*authenticated/i,
    );

    expect(migration).not.toMatch(
      /grant\s+select\s+on table public\.houses\s+to anon/i,
    );
  });

  it("keeps dependent public policies functional", () => {
    expect(migration).toMatch(
      /public\.is_public_house_active\(\s*house_id\s*\)/,
    );

    expect(migration).toMatch(
      /public\.is_public_house_active\(\s*task\.house_id\s*\)/,
    );
  });

  it("routes public readers through the safe view", () => {
    expect(publicReader).toContain(
      '.from("public_houses")',
    );
    expect(publicReader).not.toContain(
      '.from("houses")',
    );

    expect(publicSearch).toContain(
      '.from("public_houses")',
    );
    expect(publicSearch).not.toContain(
      '.from("houses")',
    );
  });

  it("models denied exploit access without real env", async () => {
    const requests: string[] = [];

    const fakeFetch: typeof globalThis.fetch =
      async (input) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;

        requests.push(url);

        if (url.includes("/rest/v1/houses")) {
          return new Response(
            JSON.stringify({
              code: "42501",
              details: null,
              hint: null,
              message:
                "permission denied for table houses",
            }),
            {
              status: 403,
              headers: {
                "content-type":
                  "application/json",
              },
            },
          );
        }

        return new Response(
          JSON.stringify([
            {
              id:
                "00000000-0000-0000-0000-000000000001",
              slug: "safe-house",
              name: "Safe house",
            },
          ]),
          {
            status: 200,
            headers: {
              "content-type":
                "application/json",
            },
          },
        );
      };

    const client =
      createPublishableSupabaseTestClient({
        supabaseUrl:
          "https://example.supabase.co",
        publishableKey:
          "test-publishable-key",
        fetch: fakeFetch,
      });

    const protectedResult = await client
      .from("houses")
      .select("current_access_code");

    expect(protectedResult.error).not.toBeNull();
    expect(protectedResult.data).toBeNull();

    const publicResult = await client
      .from("public_houses")
      .select("*");

    expect(publicResult.error).toBeNull();
    expect(publicResult.data).toHaveLength(1);

    expect(publicResult.data?.[0]).not.toHaveProperty(
      "current_access_code",
    );

    expect(
      requests.some((url) =>
        url.includes("/rest/v1/houses"),
      ),
    ).toBe(true);

    expect(
      requests.some((url) =>
        url.includes("/rest/v1/public_houses"),
      ),
    ).toBe(true);
  });
});
