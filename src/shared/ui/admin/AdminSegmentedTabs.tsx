import { useRef } from "react";

import {
  adminTabActiveClass,
  adminTabBaseClass,
  adminTabCountActiveClass,
  adminTabCountBaseClass,
  adminTabCountInactiveClass,
  adminTabInactiveClass,
} from "@/src/shared/ui/admin/adminStyles";

type AdminSegmentedTabItem = {
  key: string;
  label: string;
  count?: number;
};

type AdminSegmentedTabsProps = {
  items: AdminSegmentedTabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
  ariaLabel?: string;
};

export function AdminSegmentedTabs({
  items,
  activeKey,
  onChange,
  className = "",
  ariaLabel = "Фільтр",
}: AdminSegmentedTabsProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();

    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (currentIndex + direction + items.length) % items.length;
    const nextItem = items[nextIndex];

    if (!nextItem) {
      return;
    }

    onChange(nextItem.key);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div
      className={[
        "inline-flex max-w-full flex-wrap gap-2 rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] p-1.5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((item, index) => {
        const isActive = item.key === activeKey;

        return (
          <button
            key={item.key}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(item.key)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={[
              adminTabBaseClass,
              isActive ? adminTabActiveClass : adminTabInactiveClass,
            ].join(" ")}
          >
            <span>{item.label}</span>

            {typeof item.count === "number" ? (
              <span
                className={[
                  adminTabCountBaseClass,
                  isActive ? adminTabCountActiveClass : adminTabCountInactiveClass,
                ].join(" ")}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
