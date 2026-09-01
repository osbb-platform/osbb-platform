const houseDisplayCollator = new Intl.Collator("uk", {
  numeric: true,
  sensitivity: "base",
});

export type HouseNaturalOrderItem = {
  id: string;
  name?: string | null;
  address?: string | null;
  created_at?: string | null;
};

function getHouseDisplayKey(
  house: HouseNaturalOrderItem,
): string {
  const name = house.name?.trim() ?? "";
  if (name) return name;

  return house.address?.trim() ?? "";
}

export function compareHouseDisplayOrder(
  left: HouseNaturalOrderItem,
  right: HouseNaturalOrderItem,
): number {
  const displayResult = houseDisplayCollator.compare(
    getHouseDisplayKey(left),
    getHouseDisplayKey(right),
  );

  if (displayResult !== 0) return displayResult;

  const addressResult = houseDisplayCollator.compare(
    left.address?.trim() ?? "",
    right.address?.trim() ?? "",
  );

  if (addressResult !== 0) return addressResult;

  const createdAtResult = houseDisplayCollator.compare(
    left.created_at?.trim() ?? "",
    right.created_at?.trim() ?? "",
  );

  if (createdAtResult !== 0) return createdAtResult;

  return houseDisplayCollator.compare(left.id, right.id);
}

export function sortHousesByDisplayOrder<
  T extends HouseNaturalOrderItem,
>(
  houses: readonly T[],
): T[] {
  return [...houses].sort(compareHouseDisplayOrder);
}
