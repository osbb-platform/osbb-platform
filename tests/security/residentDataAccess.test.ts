import {
  readFileSync,
} from "node:fs";
import {
  join,
} from "node:path";
import {
  describe,
  expect,
  it,
} from "vitest";

const ROOT = process.cwd();

function read(relativePath: string) {
  return readFileSync(
    join(ROOT, relativePath),
    "utf-8",
  );
}

const additiveMigration = read(
  "supabase/migrations/202607060002_add_resident_data_readers.sql",
);

const lockdownMigration = read(
  "supabase/migrations/202607060003_lock_resident_data.sql",
);

describe("S1.T3 resident data boundary", () => {
  it("validates the concrete house session before sensitive reads", () => {
    expect(additiveMigration).toMatch(
      /create or replace function public\.is_house_session_valid_for_house/i,
    );

    expect(additiveMigration).toMatch(
      /session\.house_id = target_house_id[\s\S]*session\.session_token = target_session_token[\s\S]*session\.expires_at > timezone\('utc', now\(\)\)[\s\S]*session\.session_version = access\.session_version/i,
    );

    expect(additiveMigration).toMatch(
      /get_resident_house_debtors[\s\S]*if not public\.is_house_session_valid_for_house[\s\S]*from public\.house_debtors_settings/i,
    );

    expect(additiveMigration).toMatch(
      /get_resident_house_meetings[\s\S]*if not public\.is_house_session_valid_for_house[\s\S]*from public\.house_meetings/i,
    );

    expect(additiveMigration).toMatch(
      /get_resident_house_apartment_options[\s\S]*if not public\.is_house_session_valid_for_house[\s\S]*from public\.house_apartments/i,
    );

    expect(additiveMigration).toMatch(
      /get_resident_house_bell_feed[\s\S]*if not public\.is_house_session_valid_for_house[\s\S]*with raw_feed as/i,
    );
  });

  it("does not expose resident owner names through apartment or debtor payloads", () => {
    expect(additiveMigration).toContain(
      "''::text as owner_name",
    );

    expect(additiveMigration).toContain(
      "regexp_replace(",
    );

    const apartmentReader = read(
      "src/modules/apartments/services/public/getPublicHouseApartmentOptions.ts",
    );

    const footer = read(
      "src/modules/houses/components/PublicHouseFooter.tsx",
    );

    const specialistForm = read(
      "src/modules/houses/components/SpecialistContactRequestForm.tsx",
    );

    expect(apartmentReader).not.toContain(
      "SUPABASE_SERVICE_ROLE_KEY",
    );

    expect(apartmentReader).not.toContain(
      "SUPABASE_SERVICE_KEY",
    );

    expect(apartmentReader).not.toContain(
      "owner_name",
    );

    expect(apartmentReader).not.toContain(
      "ownerName",
    );

    expect(footer).not.toContain(
      "ownerName",
    );

    expect(specialistForm).not.toContain(
      "ownerName",
    );
  });

  it("removes anonymous direct table access during the lockdown phase", () => {
    const policyNames = [
      "Public can read house debtors settings",
      "Public can read published house debtors items",
      "Public can read published house meetings",
      "Public can read published house meeting questions",
      "Public can read published house meeting manual votes",
    ];

    for (const policyName of policyNames) {
      expect(lockdownMigration).toContain(
        `"${policyName}"`,
      );
    }

    const protectedTables = [
      "house_debtors_settings",
      "house_debtors_items",
      "house_meetings",
      "house_meeting_questions",
      "house_meeting_manual_votes",
      "house_meeting_votes",
      "house_apartments",
    ];

    for (const table of protectedTables) {
      expect(lockdownMigration).toMatch(
        new RegExp(
          `revoke select[\\s\\S]*?public\\.${table}[\\s\\S]*?from anon`,
          "i",
        ),
      );
    }

    expect(lockdownMigration).toMatch(
      /revoke execute[\s\S]*public\.get_house_bell_feed\(uuid, integer\)[\s\S]*from anon/i,
    );
  });

  it("uses only session-gated RPCs in resident readers", () => {
    const readers = [
      [
        "src/modules/houses/services/getPublishedHouseDebtors.ts",
        "get_resident_house_debtors",
      ],
      [
        "src/modules/houses/services/getPublishedHouseMeetings.ts",
        "get_resident_house_meetings",
      ],
      [
        "src/modules/houses/services/getPublicHouseBellFeed.ts",
        "get_resident_house_bell_feed",
      ],
      [
        "src/modules/apartments/services/public/getPublicHouseApartmentOptions.ts",
        "get_resident_house_apartment_options",
      ],
    ] as const;

    for (const [path, rpcName] of readers) {
      const source = read(path);

      expect(source).toContain(rpcName);
      expect(source).toContain(
        "target_session_token: sessionToken",
      );
      expect(source).not.toContain(
        "unstable_cache",
      );
    }

    expect(
      read(
        "src/modules/houses/services/getPublishedHouseDebtors.ts",
      ),
    ).not.toMatch(
      /\.from\("house_debtors_/,
    );

    expect(
      read(
        "src/modules/houses/services/getPublishedHouseMeetings.ts",
      ),
    ).not.toMatch(
      /\.from\("house_meeting/,
    );

    expect(
      read(
        "src/modules/apartments/services/public/getPublicHouseApartmentOptions.ts",
      ),
    ).not.toContain(
      '.from("house_apartments")',
    );
  });

  it("propagates the request-bound session token to every resident call site", () => {
    const callSites = [
      "app/(public)/house/[slug]/page.tsx",
      "app/(public)/house/[slug]/layout.tsx",
      "app/(public)/house/[slug]/debtors/page.tsx",
      "app/(public)/house/[slug]/meetings/page.tsx",
      "app/(public)/house/[slug]/specialists/page.tsx",
      "src/modules/houses/services/getPublicHouseHomeDashboard.ts",
    ];

    for (const path of callSites) {
      expect(read(path)).toContain(
        "sessionToken",
      );
    }
  });
});
