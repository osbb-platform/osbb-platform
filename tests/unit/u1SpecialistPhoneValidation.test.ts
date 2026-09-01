import { describe, expect, it } from "vitest";

import {
  SPECIALIST_SERVICE_NUMBERS,
  isValidSpecialistPhone,
  normalizeSpecialistPhone,
  toSpecialistTelephoneHref,
} from "../../src/modules/houses/utils/specialistPhone";

describe("U1-T1 specialist phone validation", () => {
  it("accepts the exact supported short service numbers", () => {
    expect([...SPECIALIST_SERVICE_NUMBERS]).toEqual([
      "101",
      "102",
      "103",
      "104",
      "112",
      "1545",
    ]);

    for (const phone of SPECIALIST_SERVICE_NUMBERS) {
      expect(isValidSpecialistPhone(phone)).toBe(true);
    }
  });

  it("preserves ordinary local phone compatibility", () => {
    expect(isValidSpecialistPhone("12345")).toBe(true);
    expect(isValidSpecialistPhone("044 123 45 67")).toBe(true);
    expect(isValidSpecialistPhone("0800 00 00 00")).toBe(true);
  });

  it("accepts international plus phones with 8-15 digits", () => {
    expect(isValidSpecialistPhone("+12345678")).toBe(true);
    expect(isValidSpecialistPhone("+380 67 123 45 67")).toBe(true);
    expect(isValidSpecialistPhone("+123456789012345")).toBe(true);
  });

  it("rejects invalid short, textual, plus-service and oversized values", () => {
    for (const phone of [
      "1",
      "12",
      "100",
      "105",
      "9999",
      "abc",
      "телефон",
      "+++",
      "---",
      "+104",
      "+1234567",
      "+1234567890123456",
      "1234567890123456",
    ]) {
      expect(isValidSpecialistPhone(phone), phone).toBe(false);
    }
  });

  it("normalizes callable hrefs including tel:104", () => {
    expect(normalizeSpecialistPhone("104")).toBe("104");
    expect(toSpecialistTelephoneHref("104")).toBe("tel:104");
    expect(
      toSpecialistTelephoneHref("+380 (67) 123-45-67"),
    ).toBe("tel:+380671234567");
  });
});
