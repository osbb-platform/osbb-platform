import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(
    path.join(process.cwd(), relativePath),
    "utf8",
  );
}

describe("P07 T7 resident polls UI", () => {
  const page = read(
    "app/(public)/house/[slug]/polls/page.tsx",
  );
  const component = read(
    "src/modules/houses/components/PublicHousePolls.tsx",
  );
  const service = read(
    "src/modules/houses/services/getPublishedHousePolls.ts",
  );
  const navigation = read(
    "src/modules/houses/components/PublicHouseNavigation.tsx",
  );

  it("adds the dedicated resident route and navigation point", () => {
    expect(page).toContain("PublicHousePolls");
    expect(page).toContain("getPublishedHousePolls");
    expect(navigation).toContain(
      '{ label: "Опитування", href: () => "/polls" }',
    );
  });

  it("only loads published poll definitions via public RLS", () => {
    expect(service).toContain("createSupabasePublicClient");
    expect(service).toContain('.from("house_polls")');
    expect(service).toContain(
      '.eq("lifecycle_status", "published")',
    );
    expect(service).not.toContain("house_poll_answers");
    expect(service).not.toContain("house_poll_participation");
  });

  it("uses the existing resident apartment registry", () => {
    expect(page).toContain(
      "getPublicHouseApartmentOptions",
    );
    expect(component).toContain("Оберіть квартиру");
    expect(component).toContain("selectedApartmentId");
  });

  it("renders all five P07 question types", () => {
    for (const type of [
      "single_choice",
      "multiple_choice",
      "yes_no",
      "scale",
      "free_text",
    ]) {
      expect(component).toContain(`"${type}"`);
    }

    expect(component).toContain("scaleMinLabel");
    expect(component).toContain("scaleMaxLabel");
  });

  it("submits through the protected T4 server action only", () => {
    expect(component).toContain("submitPollAnswers({");
    expect(component).toContain("pollId: poll.id");
    expect(component).toContain("apartmentId");
    expect(component).not.toContain(
      'from("house_poll_answers")',
    );
    expect(component).not.toContain(
      'from("house_poll_participation")',
    );
  });

  it("loads hasResponded and safe T5 results through resident action", () => {
    expect(component).toContain("getResidentPollResults({");
    expect(component).toContain("result?.hasResponded === true");
    expect(component).toContain("result.canViewResults");
    expect(component).toContain("RESPOND_FIRST");
    expect(component).toContain("UNTIL_COMPLETION");
    expect(component).toContain("HIDDEN");
  });

  it("makes submitted answers immutable in resident UI", () => {
    expect(component).toContain(
      "Повторне редагування або відправлення недоступне",
    );
    expect(component).toContain("!hasResponded");
  });

  it("contains no Diia or meeting coupling", () => {
    expect(page.toLowerCase()).not.toContain("diia");
    expect(component.toLowerCase()).not.toContain("diia");
    expect(service).not.toContain("house_meetings");
    expect(component).not.toContain("initOnlineBallot");
  });
});
