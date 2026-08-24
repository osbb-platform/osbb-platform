import { describe, expect, it } from "vitest";

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("P08 chairman cabinet UI contract", () => {
  it("adds direct chairman route without adding navigation", () => {
    const page = read("app/(public)/house/[slug]/chairman/page.tsx");
    const navigation = read(
      "src/modules/houses/components/PublicHouseNavigation.tsx",
    );

    expect(page).toContain("ChairmanAnnouncementForm");
    expect(page).toContain("Кабінет голови ОСББ");
    expect(navigation).not.toContain("/chairman");
    expect(navigation).not.toContain("Кабінет голови");
  });

  it("keeps the chairman form publish-only and PDF-free", () => {
    const form = read(
      "src/modules/houses/chairman/ChairmanAnnouncementForm.tsx",
    );

    expect(form).toContain("createChairmanAnnouncement");
    expect(form).not.toContain('type="file"');
    expect(form).not.toContain("AnnouncementPdf");
    expect(form).toContain(
      "Оголошення опубліковано; подальше керування — менеджер.",
    );
  });

  it("reuses the common house gate and does not change loginToHouse", () => {
    const layout = read("app/(public)/house/[slug]/layout.tsx");
    const gate = read(
      "src/modules/houses/components/HousePasswordGate.tsx",
    );
    const login = read("src/modules/houses/actions/loginToHouse.ts");

    expect(layout).toContain("HousePasswordGate");
    expect(layout).toContain("validateHouseSession");
    expect(gate).toContain("house-chairman-return");
    expect(gate).toContain("window.sessionStorage.setItem");
    expect(login).toContain('redirect("/")');
    expect(login).not.toContain("chairman");
  });

  it("returns from the existing common login through a constrained client bridge", () => {
    const rootPage = read("app/(site)/page.tsx");
    const bridge = read(
      "src/modules/houses/chairman/ChairmanReturnRedirect.tsx",
    );

    expect(rootPage).toContain("<ChairmanReturnRedirect />");
    expect(bridge).toContain("CHAIRMAN_PATH_PATTERN");
    expect(bridge).toContain("window.sessionStorage.removeItem");
    expect(bridge).toContain("router.replace(returnPath)");
  });
});
