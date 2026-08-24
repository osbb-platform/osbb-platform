import { describe, expect, it } from "vitest";

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("P08 chairman final acceptance contract", () => {
  it("binds chairman publishing to resident security boundary and 5/hour", () => {
    const guard = read("src/modules/houses/chairman/guard.ts");
    const policies = read("src/shared/security/rateLimitPolicies.ts");
    const resident = read("src/modules/houses/resident/withResidentSession.ts");

    expect(guard).toContain("withResidentSession");
    expect(guard).toContain(
      "rateLimitPolicy: rateLimitPolicies.chairmanPublish",
    );
    expect(policies).toContain('scope: "chairman_publish"');
    expect(policies).toContain("windowSeconds: 60 * 60");
    expect(policies).toContain("maxAttempts: 5");
    expect(resident).toContain("assertSameOrigin");
    expect(resident).toContain("validateHouseSession");
  });

  it("keeps house and lifecycle server-owned", () => {
    const action = read(
      "src/modules/houses/chairman/createChairmanAnnouncement.ts",
    );

    expect(action).toContain("house_id: context.houseId");
    expect(action).toContain('lifecycle_status: "published"');
    expect(action).toContain("published_at: now");
    expect(action).toContain("created_by: null");

    const inputBlock =
      action.match(
        /export type CreateChairmanAnnouncementInput = \{[\s\S]*?\n\};/,
      )?.[0] ?? "";

    expect(inputBlock).toContain("slug: string");
    expect(inputBlock).toContain("title: string");
    expect(inputBlock).toContain("body: string");
    expect(inputBlock).toContain("level: AnnouncementLevel");
    expect(inputBlock).not.toContain("houseId");
    expect(inputBlock).not.toContain("lifecycle");
    expect(inputBlock).not.toContain("status");
    expect(inputBlock).not.toContain("published_at");
    expect(inputBlock).not.toContain("created_by");
    expect(inputBlock).not.toContain("pdf");
  });

  it("records honest chairman history and manager task", () => {
    const guard = read("src/modules/houses/chairman/guard.ts");
    const action = read(
      "src/modules/houses/chairman/createChairmanAnnouncement.ts",
    );

    expect(guard).toContain('CHAIRMAN_ACTOR_NAME = "Голова ОСББ"');
    expect(guard).toContain('CHAIRMAN_ACTOR_ROLE = "chairman"');
    expect(guard).toContain('CHAIRMAN_SOURCE = "chairman_cabinet"');

    expect(action).toContain("actor_admin_id: null");
    expect(action).toContain("actor_name: CHAIRMAN_ACTOR_NAME");
    expect(action).toContain("actor_role: CHAIRMAN_ACTOR_ROLE");
    expect(action).toContain("source: CHAIRMAN_SOURCE");
    expect(action).toContain('title: "Перевірити оголошення голови"');
  });

  it("keeps UI direct-only and PDF/edit/archive/delete free", () => {
    const form = read(
      "src/modules/houses/chairman/ChairmanAnnouncementForm.tsx",
    );
    const navigation = read(
      "src/modules/houses/components/PublicHouseNavigation.tsx",
    );

    expect(form).toContain("Опублікувати оголошення");
    expect(form).toContain(
      "Оголошення опубліковано; подальше керування — менеджер.",
    );
    expect(form).not.toContain('type="file"');
    expect(form).not.toContain("AnnouncementPdf");
    expect(form).not.toContain("archive");
    expect(form).not.toContain("delete");
    expect(navigation).not.toContain("/chairman");
    expect(navigation).not.toContain("Кабінет голови");
  });

  it("leaves common login/password and admin announcement flow intact", () => {
    const login = read("src/modules/houses/actions/loginToHouse.ts");
    const password = read(
      "src/modules/houses/actions/changeHousePassword.ts",
    );
    const adminCreate = read(
      "src/modules/content-engine/v2/handlers/announcements/commands/create.ts",
    );

    expect(login).not.toContain("chairman");
    expect(password).not.toContain("chairman");
    expect(adminCreate).toContain('lifecycle_status: "draft"');
    expect(adminCreate).toContain("created_by: ctx.user.id");
  });
});
