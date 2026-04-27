import {
  adminTabBaseClass,
  adminTabCountBaseClass,
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
};

export function AdminSegmentedTabs({
  items,
  activeKey,
  onChange,
  className = "",
}: AdminSegmentedTabsProps) {
  return (
    <div className={["flex flex-wrap gap-3", className].filter(Boolean).join(" ")}>
      {items.map((item) => {
        const isActive = item.key === activeKey;

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={[
              "inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
              isActive
                ? "border border-[var(--cms-tab-active-bg)] bg-[var(--cms-tab-active-bg)] text-[var(--cms-tab-active-text)]"
                : "border border-[var(--cms-border)] bg-[var(--cms-surface)] text-[var(--cms-text)] hover:bg-[var(--cms-surface-muted)]",
            ].join(" ")}
          >
            <span>{item.label}</span>

            {typeof item.count === "number" ? (
              <span
                className={[
                  "inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold",
                  isActive
                    ? "bg-[var(--cms-tab-active-count-bg)] text-[var(--cms-tab-active-text)]"
                    : "bg-[var(--cms-surface-muted)] text-[var(--cms-text-muted)]",
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
