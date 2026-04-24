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
              adminTabBaseClass,
              isActive
                ? "border border-[var(--cms-tab-active-border)] bg-[var(--cms-tab-active-bg)] text-[var(--cms-tab-active-text)] shadow-sm"
                : "border border-[var(--cms-border-strong)] bg-[var(--cms-tab-inactive-bg)] text-[var(--cms-text)] hover:bg-[var(--cms-pill-bg)]",
            ].join(" ")}
          >
            <span>{item.label}</span>

            {typeof item.count === "number" ? (
              <span
                className={[
                  adminTabCountBaseClass,
                  isActive
                    ? "bg-[var(--cms-tab-active-count-bg)] text-[var(--cms-tab-active-text)]"
                    : "bg-[var(--cms-pill-bg)] text-[var(--cms-pill-text)]",
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
