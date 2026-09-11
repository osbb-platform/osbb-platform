import { describe, expect, it } from "vitest";
import {
  canChangeHouseObjectKind,
  formatHouseUnitLabel,
  getHouseUnitTerminology,
  normalizeHouseObjectKind,
  stripHouseUnitLabelPrefix,
} from "@/src/shared/utils/houses/houseUnitTerminology";

describe("Track 4: house unit terminology (apartment building vs garden association)", () => {
  it("normalizes unknown/missing object_kind to apartment_building (backward compatible default)", () => {
    expect(normalizeHouseObjectKind(undefined)).toBe("apartment_building");
    expect(normalizeHouseObjectKind(null)).toBe("apartment_building");
    expect(normalizeHouseObjectKind("something_else")).toBe("apartment_building");
    expect(normalizeHouseObjectKind("apartment_building")).toBe("apartment_building");
  });

  it("recognizes garden_association explicitly", () => {
    expect(normalizeHouseObjectKind("garden_association")).toBe("garden_association");
  });

  it("apartment building terminology", () => {
    const terms = getHouseUnitTerminology("apartment_building");
    expect(terms.full).toBe("Квартира");
    expect(terms.short).toBe("Кв.");
    expect(terms.nominativeLower).toBe("квартира");
    expect(terms.genitiveLower).toBe("квартири");
    expect(terms.accusativeLower).toBe("квартиру");
    expect(terms.nominativePluralLower).toBe("квартири");
    expect(terms.genitivePluralLower).toBe("квартир");
    expect(terms.instrumentalPluralLower).toBe("квартирами");
    expect(terms.instrumentalSingularLower).toBe("квартирою");
    expect(terms.selectLabel).toBe("Оберіть квартиру");
    expect(terms.numberLabel(12)).toBe("Кв. 12");
  });

  it("garden association terminology", () => {
    const terms = getHouseUnitTerminology("garden_association");
    expect(terms.full).toBe("Ділянка");
    expect(terms.short).toBe("Д.");
    expect(terms.nominativeLower).toBe("ділянка");
    expect(terms.genitiveLower).toBe("ділянки");
    expect(terms.accusativeLower).toBe("ділянку");
    expect(terms.nominativePluralLower).toBe("ділянки");
    expect(terms.genitivePluralLower).toBe("ділянок");
    expect(terms.instrumentalPluralLower).toBe("ділянками");
    expect(terms.instrumentalSingularLower).toBe("ділянкою");
    expect(terms.selectLabel).toBe("Оберіть ділянку");
    expect(terms.numberLabel(12)).toBe("Д. 12");
  });

  it("strips existing apartment/garden prefixes from raw labels", () => {
    expect(stripHouseUnitLabelPrefix("Кв. 12")).toBe("12");
    expect(stripHouseUnitLabelPrefix("кв 12")).toBe("12");
    expect(stripHouseUnitLabelPrefix("Квартира 12")).toBe("12");
    expect(stripHouseUnitLabelPrefix("Д. 5")).toBe("5");
    expect(stripHouseUnitLabelPrefix("Ділянка 5")).toBe("5");
    expect(stripHouseUnitLabelPrefix("12")).toBe("12");
  });

  it("formats a raw label with the correct prefix for the object kind, regardless of the label's original prefix", () => {
    expect(formatHouseUnitLabel("12", "apartment_building")).toBe("Кв. 12");
    expect(formatHouseUnitLabel("Кв. 12", "apartment_building")).toBe("Кв. 12");
    expect(formatHouseUnitLabel("12", "garden_association")).toBe("Д. 12");
    expect(formatHouseUnitLabel("Кв. 12", "garden_association")).toBe("Д. 12");
  });

  describe("canChangeHouseObjectKind (server-side guard decision)", () => {
    it("always allows keeping the same object_kind, regardless of existing units", () => {
      expect(
        canChangeHouseObjectKind({
          currentObjectKind: "apartment_building",
          nextObjectKind: "apartment_building",
          activeUnitsCount: 500,
        }),
      ).toBe(true);
    });

    it("allows switching kind when the house has zero active units", () => {
      expect(
        canChangeHouseObjectKind({
          currentObjectKind: "apartment_building",
          nextObjectKind: "garden_association",
          activeUnitsCount: 0,
        }),
      ).toBe(true);
    });

    it("blocks switching kind once the house has at least one active unit", () => {
      expect(
        canChangeHouseObjectKind({
          currentObjectKind: "apartment_building",
          nextObjectKind: "garden_association",
          activeUnitsCount: 1,
        }),
      ).toBe(false);

      expect(
        canChangeHouseObjectKind({
          currentObjectKind: "garden_association",
          nextObjectKind: "apartment_building",
          activeUnitsCount: 869,
        }),
      ).toBe(false);
    });
  });
});
