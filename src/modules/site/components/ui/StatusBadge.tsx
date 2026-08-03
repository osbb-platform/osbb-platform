type StatusBadgeProps = {
  children?: string;
};

export function StatusBadge({
  children = "Скоро",
}: StatusBadgeProps) {
  return (
    <span className="osbb-badge osbb-badge--soon">
      {children}
    </span>
  );
}
