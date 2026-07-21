"use client";

import { ROUTES } from "@/src/shared/config/routes/routes.config";
import {
  useEffect,
  useRef,
  useMemo,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/src/shared/ui/admin/Skeleton";
import type {
  HouseSectionCounters,
  HouseSectionCounterValue,
} from "@/src/modules/houses/services/getHouseSectionCounters";
import { HouseTabsCustomizationModal } from "@/src/modules/houses/components/HouseTabsCustomizationModal";

type HouseSectionTabsProps = {
  houseId: string;
  activeBlock: string;
  counters?: HouseSectionCounters;
  contentTargetId?: string;
};

export const houseNavigationBlocks = [
  { value: "announcements", label: "Оголошення" },
  { value: "reports", label: "Звіти" },
  { value: "plan", label: "План робіт" },
  { value: "meetings", label: "Збори" },
  { value: "debtors", label: "Боржники" },
  { value: "specialists", label: "Спеціалісти" },
  { value: "information", label: "Інформація" },
  { value: "board", label: "Правління" },
  { value: "requisites", label: "Реквізити" },
  { value: "founding-documents", label: "Установчі документи" },
] as const;

type HouseBlockValue = (typeof houseNavigationBlocks)[number]["value"];

type HouseTabsConfig = {
  order: HouseBlockValue[];
  pinned: HouseBlockValue[];
};

const HOUSE_TABS_STORAGE_KEY = "osbb.houseTabs.v1";
const HOUSE_TABS_CHANGE_EVENT = "osbb-house-tabs-change";

function isHouseBlockValue(value: unknown): value is HouseBlockValue {
  return houseNavigationBlocks.some((block) => block.value === value);
}

function normalizeTabsConfig(rawValue: string): HouseTabsConfig {
  const defaultOrder = houseNavigationBlocks.map((block) => block.value);

  if (!rawValue) {
    return { order: defaultOrder, pinned: [] };
  }

  try {
    const parsed = JSON.parse(rawValue) as {
      order?: unknown;
      pinned?: unknown;
    };

    const storedOrder = Array.isArray(parsed.order)
      ? parsed.order.filter(isHouseBlockValue)
      : [];
    const order = [
      ...storedOrder,
      ...defaultOrder.filter((value) => !storedOrder.includes(value)),
    ];

    const pinned = Array.isArray(parsed.pinned)
      ? parsed.pinned.filter(
          (value): value is HouseBlockValue =>
            isHouseBlockValue(value) && order.includes(value),
        )
      : [];

    return {
      order,
      pinned: Array.from(new Set(pinned)),
    };
  } catch {
    return { order: defaultOrder, pinned: [] };
  }
}

function getTabsStorageSnapshot() {
  if (typeof window === "undefined") return "";

  try {
    return window.localStorage.getItem(HOUSE_TABS_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function subscribeToTabsStorage(onStoreChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === HOUSE_TABS_STORAGE_KEY) onStoreChange();
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(HOUSE_TABS_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(HOUSE_TABS_CHANGE_EVENT, onStoreChange);
  };
}

function writeTabsConfig(config: HouseTabsConfig) {
  try {
    window.localStorage.setItem(HOUSE_TABS_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new Event(HOUSE_TABS_CHANGE_EVENT));
  } catch {
    // localStorage can be unavailable in restricted browser contexts.
  }
}

export function getHouseBlockLabel(value: string) {
  return (
    houseNavigationBlocks.find((block) => block.value === value)?.label ??
    "розділ"
  );
}

function CounterBadges({
  value,
  inverse = false,
}: {
  value?: HouseSectionCounterValue;
  inverse?: boolean;
}) {
  const warning = value?.warning ?? 0;
  const info = value?.info ?? 0;

  if (warning <= 0 && info <= 0) return null;

  return (
    <span className="ml-1.5 inline-flex items-center gap-1">
      {warning > 0 ? (
        <span
          className={`inline-flex min-w-5 items-center justify-center rounded-[var(--r-pill)] px-1.5 text-[11px] font-semibold ${
            inverse
              ? "bg-white/20 text-white"
              : "bg-[var(--cms-warning-bg)] text-[var(--cms-warning-text)]"
          }`}
          aria-label={`Чернетки: ${warning}`}
          title={`Чернетки: ${warning}`}
        >
          {warning}
        </span>
      ) : null}
      {info > 0 ? (
        <span
          className={`inline-flex min-w-5 items-center justify-center rounded-[var(--r-pill)] px-1.5 text-[11px] font-semibold ${
            inverse
              ? "bg-white/20 text-white"
              : "bg-[var(--cms-info-bg)] text-[var(--cms-info-text)]"
          }`}
          aria-label={`Нові звернення: ${info}`}
          title={`Нові звернення: ${info}`}
        >
          {info}
        </span>
      ) : null}
    </span>
  );
}

export function HouseSectionTabs({
  houseId,
  activeBlock,
  counters = {},
  contentTargetId,
}: HouseSectionTabsProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [selectedBlock, setSelectedBlock] = useState(activeBlock);
  const [menuOpen, setMenuOpen] = useState(false);
  const [customizationOpen, setCustomizationOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const storedConfigRaw = useSyncExternalStore(
    subscribeToTabsStorage,
    getTabsStorageSnapshot,
    () => "",
  );
  const tabsConfig = useMemo(
    () => normalizeTabsConfig(storedConfigRaw),
    [storedConfigRaw],
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSelectedBlock(activeBlock);
  }, [activeBlock]);

  useEffect(() => {
    if (!contentTargetId) {
      setPortalTarget(null);
      return;
    }

    setPortalTarget(document.getElementById(contentTargetId));
  }, [contentTargetId]);

  useEffect(() => {
    portalTarget?.setAttribute("aria-busy", isPending ? "true" : "false");
  }, [isPending, portalTarget]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  function navigate(nextBlock: string) {
    if (nextBlock === selectedBlock || isPending) {
      setMenuOpen(false);
      return;
    }

    setSelectedBlock(nextBlock);
    setMenuOpen(false);

    startTransition(() => {
      router.push(`${ROUTES.admin.houses}/${houseId}?block=${nextBlock}`);
    });
  }

  const orderedBlocks = tabsConfig.order
    .map((value) =>
      houseNavigationBlocks.find((block) => block.value === value),
    )
    .filter(
      (block): block is (typeof houseNavigationBlocks)[number] =>
        Boolean(block),
    );
  const pinnedValues = new Set(tabsConfig.pinned);
  const pinnedBlocks = orderedBlocks.filter((block) =>
    pinnedValues.has(block.value),
  );
  const regularBlocks = orderedBlocks.filter(
    (block) => !pinnedValues.has(block.value),
  );
  const visibleBlocks = [
    ...pinnedBlocks,
    ...regularBlocks.slice(0, Math.max(0, 6 - pinnedBlocks.length)),
  ];
  const visibleValues = new Set(visibleBlocks.map((block) => block.value));
  const overflowBlocks = orderedBlocks.filter(
    (block) => !visibleValues.has(block.value),
  );
  const activeIsHidden = overflowBlocks.some(
    (block) => block.value === selectedBlock,
  );
  const moreLabel = activeIsHidden
    ? `Ще: ${getHouseBlockLabel(selectedBlock)}`
    : "Ще";

  return (
    <div className="relative z-40 min-w-0 overflow-visible">
      <div
        role="tablist"
        aria-label="Розділи будинку"
        className="flex min-w-0 flex-wrap items-center gap-2 overflow-visible"
      >
        {visibleBlocks.map((block) => {
          const isActive = block.value === selectedBlock;

          return (
            <button
              key={block.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={isPending}
              onClick={() => navigate(block.value)}
              className={`inline-flex h-9 flex-none items-center justify-center whitespace-nowrap rounded-[var(--r-pill)] px-3 text-sm font-medium transition ${
                isActive
                  ? "bg-[var(--cms-accent-primary)] text-white shadow-[var(--cms-shadow-sm)]"
                  : "bg-[var(--cms-surface-muted)] text-[var(--cms-text-muted)] hover:bg-[var(--cms-pill-bg)] hover:text-[var(--cms-text)]"
              } disabled:cursor-wait disabled:opacity-70`}
            >
              <span>{block.label}</span>
              <CounterBadges
                value={counters[block.value]}
                inverse={isActive}
              />
            </button>
          );
        })}

        {overflowBlocks.length > 0 ? (
          <div ref={menuRef} className="relative z-50 flex-none">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              disabled={isPending}
              onClick={() => setMenuOpen((current) => !current)}
              className={`inline-flex h-9 max-w-[220px] items-center gap-1.5 truncate rounded-[var(--r-pill)] px-3 text-sm font-medium transition ${
                activeIsHidden
                  ? "bg-[var(--cms-accent-primary)] text-white shadow-[var(--cms-shadow-sm)]"
                  : "bg-[var(--cms-surface-muted)] text-[var(--cms-text-muted)] hover:bg-[var(--cms-pill-bg)] hover:text-[var(--cms-text)]"
              } disabled:cursor-wait disabled:opacity-70`}
            >
              <span className="truncate">{moreLabel}</span>
              {activeIsHidden ? (
                <CounterBadges
                  value={counters[selectedBlock as keyof HouseSectionCounters]}
                  inverse
                />
              ) : null}
              <span aria-hidden="true">▾</span>
            </button>

            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full z-[90] mt-2 min-w-[220px] rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-1.5 shadow-[var(--cms-shadow-lg)]"
              >
                {overflowBlocks.map((block) => {
                  const isActive = block.value === selectedBlock;

                  return (
                    <button
                      key={block.value}
                      type="button"
                      role="menuitem"
                      onClick={() => navigate(block.value)}
                      className={`flex w-full items-center gap-2 rounded-[var(--r-md)] px-3 py-2 text-left text-sm transition ${
                        isActive
                          ? "bg-[var(--cms-pill-bg)] font-semibold text-[var(--cms-accent-primary)]"
                          : "text-[var(--cms-text)] hover:bg-[var(--cms-surface-muted)]"
                      }`}
                    >
                      <span className="flex-1">{block.label}</span>
                      <CounterBadges value={counters[block.value]} />
                    </button>
                  );
                })}

                <div className="my-1 border-t border-[var(--cms-border)]" />

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setCustomizationOpen(true);
                  }}
                  className="flex w-full items-center rounded-[var(--r-md)] px-3 py-2 text-left text-sm font-medium text-[var(--cms-text)] transition hover:bg-[var(--cms-surface-muted)]"
                >
                  Налаштувати вкладки…
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {customizationOpen ? (
        <HouseTabsCustomizationModal
          blocks={houseNavigationBlocks}
          order={tabsConfig.order}
          pinned={tabsConfig.pinned}
          onClose={() => setCustomizationOpen(false)}
          onSave={(nextConfig) => {
            writeTabsConfig({
              order: nextConfig.order.filter(isHouseBlockValue),
              pinned: nextConfig.pinned.filter(isHouseBlockValue),
            });
            setCustomizationOpen(false);
          }}
        />
      ) : null}

      {isPending && portalTarget
        ? createPortal(
            <div
              className="absolute inset-0 z-40 rounded-[var(--r-xl)] bg-[color-mix(in_srgb,var(--cms-surface)_92%,transparent)] p-4 backdrop-blur-[2px]"
              aria-live="polite"
              aria-label={`Відкриваємо розділ «${getHouseBlockLabel(selectedBlock)}»`}
            >
              <div className="space-y-4 rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-5 shadow-[var(--cms-shadow-sm)]">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <Skeleton variant="text" className="h-4 w-[34%]" />
                    <Skeleton variant="text" className="w-[58%]" />
                  </div>
                  <Skeleton variant="block" className="h-9 w-28" />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Skeleton variant="card" />
                  <Skeleton variant="card" />
                </div>

                <div className="space-y-3">
                  <Skeleton variant="row" />
                  <Skeleton variant="row" />
                  <Skeleton variant="row" />
                </div>
              </div>
            </div>,
            portalTarget,
          )
        : null}
    </div>
  );
}
