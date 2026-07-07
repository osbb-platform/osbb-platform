import {
  readdirSync,
  readFileSync,
} from "node:fs";
import {
  extname,
  join,
  sep,
} from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";

const PROJECT_ROOT = process.cwd();

const CODE_EXTENSIONS = new Set([
  ".cjs",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".ts",
  ".tsx",
]);

const EXCLUDED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
]);

const SERVICE_ROLE_FACTORY =
  "src/integrations/supabase/server/admin.ts";

const ALLOWED_SERVICE_ROLE_CONSUMERS = [
  "src/modules/auth/actions/finalizeAdminRegistration.ts",
  "src/modules/auth/actions/updateCurrentAdminProfile.ts",
  "src/modules/employees/actions/createEmployee.ts",
  "src/modules/employees/actions/deleteEmployee.ts",
  "src/modules/employees/actions/sendEmployeeInvite.ts",
  "src/modules/files/services/resolveSignedFileUrl.ts",
  "src/modules/houses/actions/changeHousePassword.ts",
  "src/modules/houses/actions/createHouse.ts",
  "src/modules/houses/actions/loginToHouse.ts",
  "src/modules/houses/services/bootstrapHouseContent.ts",
  "src/modules/houses/services/generateHouseAnnouncementPdf.ts",
  "src/shared/security/serverRateLimit.ts",
].sort();

const QUARANTINED_TABLE_BASELINE = {
  house_sections: {},
  house_pages: {
    "src/modules/houses/actions/deleteArchivedHouse.ts": 1,
    "src/modules/houses/services/bootstrapHouseContent.ts": 1,
    "src/modules/houses/services/getAdminDashboardBatchData.ts": 1,
    "src/modules/houses/services/getAdminHousePages.ts": 1,
    "src/modules/houses/services/getHouseHomePageByHouseId.ts": 1,
    "src/modules/houses/services/getHouseInformationPageByHouseId.ts": 1,
    "src/modules/houses/services/getPublishedHousePage.ts": 1,
  },
  content_versions: {
    "src/modules/company/actions/updateCompanySection.ts": 2,
    "src/modules/company/services/bootstrapCompanyPageContent.ts": 1,
  },
  platform_change_history: {
    "src/modules/history/services/getPlatformChangeHistory.ts": 2,
    "src/modules/history/services/getPlatformHistoryFilterOptions.ts": 1,
    "src/modules/history/services/logPlatformChange.ts": 1,
  },
} satisfies Record<string, Record<string, number>>;

function toPosixPath(path: string) {
  return path.split(sep).join("/");
}

function collectRepositoryFiles(
  absoluteDirectory = PROJECT_ROOT,
  relativeDirectory = "",
): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(absoluteDirectory, {
    withFileTypes: true,
  })) {
    if (
      entry.isDirectory()
      && EXCLUDED_DIRECTORIES.has(entry.name)
    ) {
      continue;
    }

    const relativePath = relativeDirectory
      ? `${relativeDirectory}/${entry.name}`
      : entry.name;

    const absolutePath = join(
      absoluteDirectory,
      entry.name,
    );

    if (entry.isDirectory()) {
      files.push(
        ...collectRepositoryFiles(
          absolutePath,
          relativePath,
        ),
      );

      continue;
    }

    files.push(toPosixPath(relativePath));
  }

  return files.sort();
}

function isLiveCodeFile(path: string) {
  if (!CODE_EXTENSIONS.has(extname(path))) {
    return false;
  }

  return ![
    "docs/",
    "src/legacy-v1/",
    "supabase/",
    "tests/",
  ].some((prefix) => path.startsWith(prefix));
}

const liveCodeFiles = collectRepositoryFiles()
  .filter(isLiveCodeFile);

function readRepositoryFile(path: string) {
  return readFileSync(
    join(PROJECT_ROOT, path),
    "utf8",
  );
}

function collectLegacyImports() {
  const pattern =
    /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|\bimport\s*)["'][^"']*legacy-v1(?:\/[^"']*)?["']/;

  return liveCodeFiles.flatMap((path) => {
    const source = readRepositoryFile(path);

    return pattern.test(source)
      ? [path]
      : [];
  });
}

function collectServiceRoleConsumers() {
  return liveCodeFiles
    .filter((path) => path !== SERVICE_ROLE_FACTORY)
    .filter((path) =>
      readRepositoryFile(path)
        .includes("createSupabaseAdminClient"),
    )
    .sort();
}

function collectDirectTableUsage(
  table: keyof typeof QUARANTINED_TABLE_BASELINE,
) {
  const pattern = new RegExp(
    String.raw`\.from\(\s*["']${table}["']\s*\)`,
    "g",
  );

  const usage: Record<string, number> = {};

  for (const path of liveCodeFiles) {
    const matches =
      readRepositoryFile(path).match(pattern);

    if (matches?.length) {
      usage[path] = matches.length;
    }
  }

  return Object.fromEntries(
    Object.entries(usage).sort(
      ([left], [right]) =>
        left.localeCompare(right),
    ),
  );
}

describe("architecture forbidden-pattern guard", () => {
  it("keeps src/legacy-v1 quarantined from live code", () => {
    expect(collectLegacyImports()).toEqual([]);
  });

  it("keeps service-role client consumers on the explicit allowlist", () => {
    expect(
      collectServiceRoleConsumers(),
    ).toEqual(
      ALLOWED_SERVICE_ROLE_CONSUMERS,
    );
  });

  for (
    const table
    of Object.keys(
      QUARANTINED_TABLE_BASELINE,
    ) as Array<
      keyof typeof QUARANTINED_TABLE_BASELINE
    >
  ) {
    it(`keeps direct ${table} usage at the reviewed baseline`, () => {
      expect(
        collectDirectTableUsage(table),
      ).toEqual(
        QUARANTINED_TABLE_BASELINE[table],
      );
    });
  }
});
