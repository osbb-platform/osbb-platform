export function AdminTopbar() {
  return (
    <header className="hidden shrink-0 border-b border-[var(--cms-border)] bg-[var(--cms-surface)] px-6 py-4 shadow-[var(--cms-shadow-sm)] lg:block">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--cms-text-soft)]">
            OSBB Admin
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-serif)] text-[22px] font-semibold tracking-[-0.01em] text-[var(--cms-text)]">
            Панель керування
          </h1>
        </div>

        <div className="rounded-[var(--r-pill)] border border-[var(--cms-border)] bg-[var(--cms-pill-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--cms-pill-text)]">
          Design System 2.0
        </div>
      </div>
    </header>
  );
}
