import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const actions = readFileSync(
  join(
    process.cwd(),
    "src/modules/import-buffer/actions/debtors1cImportBufferActions.ts",
  ),
  "utf8",
);

describe("P04 transfer canonical registry accounts", () => {
  it("re-resolves matched apartment IDs inside the same active house registry", () => {
    expect(actions).toContain('from("house_apartments")');
    expect(actions).toContain('.eq("house_id", access.house.id)');
    expect(actions).toContain('.is("archived_at", null)');
    expect(actions).toContain('.in("id", matchedApartmentIds)');
  });

  it("dispatches canonical registry accounts instead of normalized source accounts", () => {
    expect(actions).toContain("canonicalAccountByApartmentId");
    expect(actions).toContain("String(row.matched_apartment_id)");
    expect(actions).not.toContain(
      "accountNumber: String(row.account_number_normalized)",
    );
  });

  it("fails closed when a matched apartment is no longer resolvable", () => {
    expect(actions).toContain("unresolvedMatchedApartmentIds");
    expect(actions).toContain(
      "Зіставлений реєстр квартир змінився. Завантажте preview повторно.",
    );
  });
});
