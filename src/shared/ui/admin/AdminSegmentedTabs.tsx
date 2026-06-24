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
      {items.map((item) => {
        const isActive = item.key === activeKey;

        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.key)}
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
