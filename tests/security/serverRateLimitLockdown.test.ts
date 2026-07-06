import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";

function readProjectFile(path: string) {
  return readFileSync(
    resolve(process.cwd(), path),
    "utf8",
  );
}

const executableSql = readProjectFile(
  "supabase/migrations/"
    + "202607060006_lock_house_access_rpcs.sql",
).replace(/--.*$/gm, "");

const houseLogin = readProjectFile(
  "src/modules/houses/actions/loginToHouse.ts",
);

const createHouse = readProjectFile(
  "src/modules/houses/actions/createHouse.ts",
);

const changeHousePassword = readProjectFile(
  "src/modules/houses/actions/"
    + "changeHousePassword.ts",
);

describe("S1.T5 house-access RPC lockdown", () => {
  it("locks both sensitive RPCs to service_role", () => {
    for (const rpcName of [
      "create_house_session",
      "upsert_house_access",
    ]) {
      expect(executableSql).toMatch(
        new RegExp(
          `revoke\\s+all\\s+on\\s+function\\s+public\\.${rpcName}`,
          "i",
        ),
      );

      expect(executableSql).toMatch(
        new RegExp(
          `grant\\s+execute\\s+on\\s+function\\s+public\\.${rpcName}`,
          "i",
        ),
      );
    }
  });

  it("does not replace functions or alter policies", () => {
    expect(executableSql).not.toMatch(
      /create\s+or\s+replace\s+function/i,
    );

    expect(executableSql).not.toMatch(
      /drop\s+function/i,
    );

    expect(executableSql).not.toMatch(
      /\b(create|alter|drop)\s+policy\b/i,
    );
  });

  it("keeps resident login server-only", () => {
    expect(houseLogin).toMatch(
      /createSupabaseAdminClient/,
    );

    expect(houseLogin).toMatch(
      /["']create_house_session["']/,
    );
  });

  it(
    "keeps house creation user-scoped except password setup",
    () => {
      expect(createHouse).toMatch(
        /const supabase = await createSupabaseServerClient\(\)/,
      );

      expect(createHouse).toMatch(
        /const accessAdminClient\s*=\s*createSupabaseAdminClient\(\)/,
      );

      expect(createHouse).toMatch(
        /await accessAdminClient\.rpc\(\s*"upsert_house_access"/,
      );

      expect(createHouse).not.toMatch(
        /await supabase\.rpc\(\s*"upsert_house_access"/,
      );

      const roleGuardIndex =
        createHouse.indexOf(
          "assertRegistryActionAccess({",
        );

      const insertIndex =
        createHouse.indexOf(
          "const { data: createdHouse, "
            + "error: insertError }",
        );

      const adminClientIndex =
        createHouse.indexOf(
          "const accessAdminClient",
        );

      const rpcIndex =
        createHouse.indexOf(
          '"upsert_house_access"',
        );

      expect(insertIndex).toBeGreaterThan(
        roleGuardIndex,
      );

      expect(adminClientIndex).toBeGreaterThan(
        insertIndex,
      );

      expect(rpcIndex).toBeGreaterThan(
        adminClientIndex,
      );
    },
  );

  it("checks exact house scope before service_role", () => {
    expect(changeHousePassword).toMatch(
      /createSupabaseActionClient/,
    );

    expect(changeHousePassword).toMatch(
      /["']admin_has_house_access["']/,
    );

    const roleGuardIndex =
      changeHousePassword.indexOf(
        "assertRegistryActionAccess({",
      );

    const scopeIndex =
      changeHousePassword.indexOf(
        '"admin_has_house_access"',
      );

    const adminClientIndex =
      changeHousePassword.indexOf(
        "const supabase = "
          + "createSupabaseAdminClient();",
      );

    const verificationIndex =
      changeHousePassword.indexOf(
        '"create_house_session"',
      );

    const mutationIndex =
      changeHousePassword.indexOf(
        '"upsert_house_access"',
      );

    expect(scopeIndex).toBeGreaterThan(
      roleGuardIndex,
    );

    expect(adminClientIndex).toBeGreaterThan(
      scopeIndex,
    );

    expect(verificationIndex).toBeGreaterThan(
      adminClientIndex,
    );

    expect(mutationIndex).toBeGreaterThan(
      verificationIndex,
    );
  });

  it("binds verification and update to one house", () => {
    expect(changeHousePassword).toMatch(
      /verificationResult\.house_id\s*!==\s*houseId/,
    );

    expect(changeHousePassword).toMatch(
      /verificationResult\.house_slug\s*!==\s*houseSlug/,
    );

    expect(changeHousePassword).toMatch(
      /\.eq\("id",\s*houseId\)\s*\.eq\("slug",\s*houseSlug\)/,
    );
  });
});
