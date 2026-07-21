"use client";

import { ROUTES } from "@/src/shared/config/routes/routes.config";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/src/shared/ui/admin/Skeleton";

type HouseSectionTabsProps = {
  houseId: string;
  activeBlock: string;
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

export function getHouseBlockLabel(value: string) {
  return (
    houseNavigationBlocks.find((block) => block.value === value)?.label ??
    "розділ"
  );
}

export function HouseSectionTabs({
  houseId,
  activeBlock,
  contentTargetId,
}: HouseSectionTabsProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [selectedBlock, setSelectedBlock] = useState(activeBlock);
  const [menuOpen, setMenuOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
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

  const visibleBlocks = houseNavigationBlocks.slice(0, 6);
  const overflowBlocks = houseNavigationBlocks.slice(6);
  const activeIsHidden = overflowBlocks.some(
    (block) => block.value === selectedBlock,
  );
  const moreLabel = activeIsHidden
    ? `Ще: ${getHouseBlockLabel(selectedBlock)}`
    : "Ще";

  return (
    <div className="relative min-w-0">
      <div
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
