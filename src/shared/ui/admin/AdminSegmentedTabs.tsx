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
