type AdminDashboardWidgetCardProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  scroll?: boolean;
  maxRows?: number;
  className?: string;
};

export function AdminDashboardWidgetCard({
  title,
  subtitle,
  children,
  scroll = false,
  maxRows = 10,
  className = "",
}: AdminDashboardWidgetCardProps) {
  const maxHeightClass =
    maxRows <= 6 ? "max-h-[320px]" : "max-h-[420px]";

  return (
    <section
      className={`flex h-full min-h-[260px] flex-col rounded-3xl border border-slate-800 bg-slate-900 p-5 ${className}`}
    >
      <div className="mb-4 shrink-0">
        <h2 className="text-base font-semibold text-white">{title}</h2>

        {subtitle ? (
          <p className="mt-1 text-sm leading-6 text-slate-400">
            {subtitle}
          </p>
        ) : null}
      </div>

      <div
        className={
          scroll
            ? `min-h-0 flex-1 overflow-y-auto pr-1 ${maxHeightClass}`
            : "flex-1"
        }
      >
        {children}
      </div>
    </section>
  );
}
