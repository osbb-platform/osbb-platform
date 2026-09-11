// Track 4: single source of truth for "apartment" vs "garden plot"
// terminology, driven by houses.object_kind. Internal identifiers
// (house_apartments, apartment_id, apartment_label, ...) are unaffected —
// this only controls user-facing wording.
export type HouseObjectKind = "apartment_building" | "garden_association";

export const HOUSE_OBJECT_KIND_OPTIONS: Array<{
  value: HouseObjectKind;
  label: string;
}> = [
  { value: "apartment_building", label: "Багатоквартирний будинок" },
  { value: "garden_association", label: "Садове товариство" },
];

export function normalizeHouseObjectKind(value: unknown): HouseObjectKind {
  return value === "garden_association" ? "garden_association" : "apartment_building";
}

export type HouseUnitTerminology = {
  objectKind: HouseObjectKind;
  /** "Квартира" | "Ділянка" */
  full: string;
  /** "Кв." | "Д." */
  short: string;
  /** "квартира" | "ділянка" — lowercase nominative, for prose like "Ваша ..." */
  nominativeLower: string;
  /** "квартири" | "ділянки" — genitive, for prose like "... для квартири 12" */
  genitiveLower: string;
  /** "квартиру" | "ділянку" — accusative, for prose like "Введіть квартиру" */
  accusativeLower: string;
  /** "квартири" | "ділянки" — nominative plural, for prose like "показуються квартири" */
  nominativePluralLower: string;
  /** "квартир" | "ділянок" — genitive plural, for prose like "список квартир" */
  genitivePluralLower: string;
  /** "квартирами" | "ділянками" — instrumental plural, for prose like "керування квартирами" */
  instrumentalPluralLower: string;
  /** "квартирою" | "ділянкою" — instrumental singular, for prose like "зв'язку з квартирою" */
  instrumentalSingularLower: string;
  /** "Оберіть квартиру" | "Оберіть ділянку" */
  selectLabel: string;
  /** e.g. numberLabel("12") -> "Кв. 12" | "Д. 12" */
  numberLabel: (value: string | number) => string;
};

const APARTMENT_BUILDING_TERMS: HouseUnitTerminology = {
  objectKind: "apartment_building",
  full: "Квартира",
  short: "Кв.",
  nominativeLower: "квартира",
  genitiveLower: "квартири",
  accusativeLower: "квартиру",
  nominativePluralLower: "квартири",
  genitivePluralLower: "квартир",
  instrumentalPluralLower: "квартирами",
  instrumentalSingularLower: "квартирою",
  selectLabel: "Оберіть квартиру",
  numberLabel: (value) => `Кв. ${value}`,
};

const GARDEN_ASSOCIATION_TERMS: HouseUnitTerminology = {
  objectKind: "garden_association",
  full: "Ділянка",
  short: "Д.",
  nominativeLower: "ділянка",
  genitiveLower: "ділянки",
  accusativeLower: "ділянку",
  nominativePluralLower: "ділянки",
  genitivePluralLower: "ділянок",
  instrumentalPluralLower: "ділянками",
  instrumentalSingularLower: "ділянкою",
  selectLabel: "Оберіть ділянку",
  numberLabel: (value) => `Д. ${value}`,
};

export function getHouseUnitTerminology(
  objectKind: unknown,
): HouseUnitTerminology {
  return normalizeHouseObjectKind(objectKind) === "garden_association"
    ? GARDEN_ASSOCIATION_TERMS
    : APARTMENT_BUILDING_TERMS;
}

// Matches whichever unit-word prefix (apartment- or garden-style) a raw
// label already carries, so mixed/legacy data normalizes the same way
// regardless of which object_kind produced it.
const UNIT_LABEL_PREFIX_PATTERN = /^(квартира|кв\.?|прим\.?|ділянка|д\.?)\s*/iu;

export function stripHouseUnitLabelPrefix(label: string): string {
  return label.trim().replace(UNIT_LABEL_PREFIX_PATTERN, "").trim();
}

// Re-applies the correct short prefix for the house's object_kind, after
// stripping any existing prefix (of either kind) from the raw label. This
// replaces four independently-duplicated normalize/prefix implementations
// that only ever handled the apartment-building wording.
// Pure decision extracted from updateHouse.ts so the "can this house's
// object_kind be changed right now" rule is unit-testable without a full
// server-action/DB harness. A house that already has real units under one
// meaning ("Кв. 12" as an apartment) must not silently be relabeled to mean
// something else ("Д. 12" as a garden plot).
export function canChangeHouseObjectKind(params: {
  currentObjectKind: unknown;
  nextObjectKind: unknown;
  activeUnitsCount: number;
}): boolean {
  const current = normalizeHouseObjectKind(params.currentObjectKind);
  const next = normalizeHouseObjectKind(params.nextObjectKind);

  if (current === next) {
    return true;
  }

  return params.activeUnitsCount <= 0;
}

// For sentence-initial use of a lowercase form (e.g. genitivePluralLower at
// the start of a UI label like "Квартир без рядка: 3").
export function capitalizeFirst(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

export function formatHouseUnitLabel(
  label: string,
  objectKind: unknown,
): string {
  const terms = getHouseUnitTerminology(objectKind);
  const stripped = stripHouseUnitLabelPrefix(label);
  return stripped ? `${terms.short} ${stripped}` : terms.short;
}
