"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";

import { ROUTES } from "@/src/shared/config/routes/routes.config";
import { houseSearchTextMatches, normalizeHouseSearchText } from "@/src/modules/houses/utils/houseSearch";

const RECENT_HOUSES_STORAGE_KEY = "osbb.recentHouses.v1";
const RECENT_HOUSES_LIMIT = 5;

export type HouseSwitcherItem = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  districtName: string | null;
  districtColor: string | null;
};

type HouseSwitcherProps = {
  currentHouseId: string;
  currentHouseName: string;
  activeBlock: string;
  houses: HouseSwitcherItem[];
};

function readRecentHouseIds(): string[] {
  try {
    const rawValue = window.localStorage.getItem(RECENT_HOUSES_STORAGE_KEY);
    if (!rawValue) return [];

    const parsedValue: unknown = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) return [];

    return parsedValue.filter(
      (value): value is string => typeof value === "string",
    );
  } catch {
    return [];
  }
}

function writeRecentHouseIds(ids: string[]) {
  try {
    window.localStorage.setItem(
      RECENT_HOUSES_STORAGE_KEY,
      JSON.stringify(ids.slice(0, RECENT_HOUSES_LIMIT)),
    );
  } catch {
    // localStorage may be unavailable in private or restricted contexts.
  }
}

export function HouseSwitcher({
  currentHouseId,
  currentHouseName,
  activeBlock,
  houses,
}: HouseSwitcherProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentHouseIds, setRecentHouseIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [currentHouseId];

    const storedIds = readRecentHouseIds();
    return [
      currentHouseId,
      ...storedIds.filter((id) => id !== currentHouseId),
    ].slice(0, RECENT_HOUSES_LIMIT);
  });

  useEffect(() => {
    writeRecentHouseIds(recentHouseIds);
  }, [recentHouseIds]);

  useEffect(() => {
    if (!isOpen) return;

    searchInputRef.current?.focus();

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery("");
      }
    }

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const filteredHouses = useMemo(() => {
    const normalizedQuery = normalizeHouseSearchText(query);

    if (!normalizedQuery) return houses;

    return houses.filter((house) =>
      houseSearchTextMatches(
        [house.name, house.address ?? "", house.slug],
        normalizedQuery,
      ),
    );
  }, [houses, query]);

  const recentHouses = useMemo(() => {
    if (query.trim()) return [];

    return recentHouseIds
      .map((id) => houses.find((house) => house.id === id))
      .filter((house): house is HouseSwitcherItem => Boolean(house));
  }, [houses, query, recentHouseIds]);

  const recentHouseIdSet = useMemo(
    () => new Set(recentHouses.map((house) => house.id)),
    [recentHouses],
  );

  const remainingHouses = useMemo(
    () =>
      filteredHouses.filter((house) => !recentHouseIdSet.has(house.id)),
    [filteredHouses, recentHouseIdSet],
  );

  const selectableHouses = useMemo(
    () => [...recentHouses, ...remainingHouses],
    [recentHouses, remainingHouses],
  );



  function openSwitcher() {
    setIsOpen(true);
    setActiveIndex(
      Math.max(
        0,
        selectableHouses.findIndex((house) => house.id === currentHouseId),
      ),
    );
  }

  function selectHouse(house: HouseSwitcherItem) {
    const nextRecentIds = [
      house.id,
      ...recentHouseIds.filter((id) => id !== house.id),
    ].slice(0, RECENT_HOUSES_LIMIT);

    setRecentHouseIds(nextRecentIds);
    writeRecentHouseIds(nextRecentIds);
    setIsOpen(false);
    setQuery("");

    if (house.id === currentHouseId) return;

    router.push(
      `${ROUTES.admin.houses}/${house.id}?block=${encodeURIComponent(activeBlock)}`,
    );
  }

  function handleSearchKeyDown(
    event: ReactKeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) =>
        selectableHouses.length === 0
          ? 0
          : (index + 1) % selectableHouses.length,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) =>
        selectableHouses.length === 0
          ? 0
          : (index - 1 + selectableHouses.length) % selectableHouses.length,
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const safeActiveIndex =
        selectableHouses.length === 0
          ? 0
          : Math.min(activeIndex, selectableHouses.length - 1);
      const selectedHouse = selectableHouses[safeActiveIndex];
      if (selectedHouse) selectHouse(selectedHouse);
    }
  }

  function renderHouseOption(
    house: HouseSwitcherItem,
    index: number,
  ) {
    const isCurrent = house.id === currentHouseId;
    const isActive = index === activeIndex;

    return (
      <button
        key={house.id}
        type="button"
        role="option"
        aria-selected={isCurrent}
        onMouseEnter={() => setActiveIndex(index)}
        onClick={() => selectHouse(house)}
        className={[
          "flex w-full items-start gap-3 rounded-[var(--r-md)] px-3 py-2.5 text-left transition",
          isActive
            ? "bg-[var(--cms-surface-hover)]"
            : "hover:bg-[var(--cms-surface-hover)]",
        ].join(" ")}
      >
        <span
          aria-hidden="true"
          className="mt-1.5 size-2.5 shrink-0 rounded-full border border-[var(--cms-border)]"
          style={
            house.districtColor
              ? { backgroundColor: house.districtColor }
              : undefined
          }
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-3">
            <span className="text-sm font-semibold text-[var(--cms-text)]">
              {house.name}
            </span>
            {isCurrent ? (
              <span className="shrink-0 text-xs font-medium text-[var(--cms-text-muted)]">
                Поточний
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block text-xs text-[var(--cms-text-muted)]">
            {[house.address, house.slug].filter(Boolean).join(" · ")}
          </span>
          {house.districtName ? (
            <span className="mt-0.5 block text-xs text-[var(--cms-text-subtle)]">
              {house.districtName}
            </span>
          ) : null}
        </span>
      </button>
    );
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
            setQuery("");
          } else {
            openSwitcher();
          }
        }}
        className="group flex max-w-full items-start gap-2 rounded-[var(--r-md)] text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--cms-focus)]"
      >
        <span className="min-w-0 text-2xl font-semibold leading-tight text-[var(--cms-text)]">
          {currentHouseName}
        </span>
        <span
          aria-hidden="true"
          className="mt-1 shrink-0 text-sm text-[var(--cms-text-muted)] transition group-hover:text-[var(--cms-text)]"
        >
          ▾
        </span>
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-[80] w-[min(34rem,calc(100vw-2rem))] overflow-hidden rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface)] shadow-[var(--cms-shadow-lg)]">
          <div className="border-b border-[var(--cms-border)] p-3">
            <label className="sr-only" htmlFor="house-switcher-search">
              Пошук будинку
            </label>
            <input
              ref={searchInputRef}
              id="house-switcher-search"
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Назва, адреса або slug"
              autoComplete="off"
              className="min-h-10 w-full rounded-[var(--r-md)] border border-[var(--cms-border)] bg-[var(--cms-surface)] px-3 text-sm text-[var(--cms-text)] outline-none placeholder:text-[var(--cms-text-muted)] focus:border-[var(--cms-focus)] focus:ring-2 focus:ring-[var(--cms-focus-soft)]"
            />
          </div>

          <div
            role="listbox"
            aria-label="Будинки"
            className="max-h-[24rem] overflow-y-auto p-2"
          >
            {selectableHouses.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-[var(--cms-text-muted)]">
                Будинки не знайдено
              </p>
            ) : (
              <>
                {recentHouses.length > 0 ? (
                  <div>
                    <p className="px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-[var(--cms-text-muted)]">
                      Нещодавні
                    </p>
                    {recentHouses.map((house, index) =>
                      renderHouseOption(house, index),
                    )}
                  </div>
                ) : null}

                {remainingHouses.length > 0 ? (
                  <div className={recentHouses.length > 0 ? "mt-2" : undefined}>
                    <p className="px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-[var(--cms-text-muted)]">
                      Усі будинки
                    </p>
                    {remainingHouses.map((house, index) =>
                      renderHouseOption(house, recentHouses.length + index),
                    )}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
