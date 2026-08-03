type StatusBadgeProps = {
  children?: string;
};

export function StatusBadge({
  children = "Восени 2026",
}: StatusBadgeProps) {
  return (
    <span className="osbb-badge osbb-badge--soon">
      {children}
    </span>
  );
}
