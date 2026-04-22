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
                ? "bg-[var(--cms-primary)] text-[var(--cms-primary-contrast)]"
                : "border border-[var(--cms-border-strong)] bg-[var(--cms-surface-elevated)] text-[var(--cms-text)] hover:bg-[var(--cms-pill-bg)]",
            ].join(" ")}
          >
            <span>{item.label}</span>

            {typeof item.count === "number" ? (
              <span
                className={[
                  adminTabCountBaseClass,
                  isActive
                    ? "bg-black/10 text-[var(--cms-primary-contrast)]"
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
