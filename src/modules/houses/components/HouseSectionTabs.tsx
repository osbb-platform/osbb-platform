"use client";

import { ROUTES } from "@/src/shared/config/routes/routes.config";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

type HouseSectionTabsProps = {
  houseId: string;
  activeBlock: string;
  onPendingBlockChange?: (block: string | null) => void;
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

export function getHouseBlockLabel(value: string) {
  return (
    houseNavigationBlocks.find((block) => block.value === value)?.label ??
    "розділ"
  );
}

export function HouseSectionTabs({
  houseId,
  activeBlock,
  onPendingBlockChange,
}: HouseSectionTabsProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [selectedBlock, setSelectedBlock] = useState(activeBlock);
  const [visibleCount, setVisibleCount] = useState<number>(houseNavigationBlocks.length);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const recalculate = useCallback(() => {
    const container = containerRef.current;
    const measure = measureRef.current;

    if (!container || !measure) {
      return;
    }

    const tabWidths = Array.from(
      measure.querySelectorAll<HTMLElement>("[data-measure-tab]"),
    ).map((element) => element.offsetWidth);

    const moreButton = measure.querySelector<HTMLElement>("[data-measure-more]");
    const availableWidth = container.clientWidth;
    const moreWidth = moreButton?.offsetWidth ?? 92;
    const gap = 8;
    const totalWidth =
      tabWidths.reduce((sum, width) => sum + width, 0) +
      gap * Math.max(0, tabWidths.length - 1);

    if (totalWidth <= availableWidth) {
      setVisibleCount(houseNavigationBlocks.length);
      return;
    }

    let consumed = moreWidth;
    let nextVisibleCount = 0;

    for (const width of tabWidths) {
      const nextWidth = consumed + width + gap;

      if (nextWidth > availableWidth) {
        break;
      }

      consumed = nextWidth;
      nextVisibleCount += 1;
    }

    setVisibleCount(Math.max(1, nextVisibleCount));
  }, []);

  useLayoutEffect(() => {
    recalculate();

    const container = containerRef.current;

    if (!container) {
      return;
    }

    const observer = new ResizeObserver(recalculate);
    observer.observe(container);

    return () => observer.disconnect();
  }, [recalculate]);

  useEffect(() => {
    setSelectedBlock(activeBlock);
  }, [activeBlock]);

  useEffect(() => {
    if (!isPending) {
      onPendingBlockChange?.(null);
    }
  }, [isPending, onPendingBlockChange]);

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
    onPendingBlockChange?.(nextBlock);

    startTransition(() => {
      router.push(`${ROUTES.admin.houses}/${houseId}?block=${nextBlock}`);
    });
  }

  const visibleBlocks = houseNavigationBlocks.slice(0, visibleCount);
  const overflowBlocks = houseNavigationBlocks.slice(visibleCount);
  const activeIsHidden = overflowBlocks.some(
    (block) => block.value === selectedBlock,
  );
  const moreLabel = activeIsHidden
    ? `Ще: ${getHouseBlockLabel(selectedBlock)}`
    : "Ще";

  return (
    <div className="relative min-w-0">
      <div
        ref={containerRef}
        role="tablist"
        aria-label="Розділи будинку"
        className="flex min-w-0 items-center gap-2 overflow-hidden"
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
              {block.label}
            </button>
          );
        })}

        {overflowBlocks.length > 0 ? (
          <div ref={menuRef} className="relative flex-none">
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
              <span aria-hidden="true">▾</span>
            </button>

            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-2 min-w-[220px] rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] p-1.5 shadow-[var(--cms-shadow-lg)]"
              >
                {overflowBlocks.map((block) => {
                  const isActive = block.value === selectedBlock;

                  return (
                    <button
                      key={block.value}
                      type="button"
                      role="menuitem"
                      onClick={() => navigate(block.value)}
                      className={`flex w-full items-center rounded-[var(--r-md)] px-3 py-2 text-left text-sm transition ${
                        isActive
                          ? "bg-[var(--cms-pill-bg)] font-semibold text-[var(--cms-accent-primary)]"
                          : "text-[var(--cms-text)] hover:bg-[var(--cms-surface-muted)]"
                      }`}
                    >
                      {block.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none fixed -left-[9999px] top-0 flex items-center gap-2 opacity-0"
      >
        {houseNavigationBlocks.map((block) => (
          <span
            key={block.value}
            data-measure-tab
            className="inline-flex h-9 items-center whitespace-nowrap rounded-[var(--r-pill)] px-3 text-sm font-medium"
          >
            {block.label}
          </span>
        ))}
        <span
          data-measure-more
          className="inline-flex h-9 items-center whitespace-nowrap rounded-[var(--r-pill)] px-3 text-sm font-medium"
        >
          Ще: Установчі документи ▾
        </span>
      </div>
    </div>
  );
}
