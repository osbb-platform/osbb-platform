export default function PublicHomePage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <div className="max-w-3xl rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <div className="mb-4 inline-flex rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-700">
            PHASE 1 · Core Foundation
          </div>

          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            OSBB Platform
          </h1>

          <p className="mt-4 text-base leading-7 text-[var(--muted)] sm:text-lg">
            Базовый фундамент платформы управляющей компании: главный сайт,
            шаблон дома, CMS, роли, безопасность и масштабирование.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <div className="rounded-2xl border border-[var(--border)] px-4 py-2 text-sm">
              Next.js
            </div>
            <div className="rounded-2xl border border-[var(--border)] px-4 py-2 text-sm">
              TypeScript
            </div>
            <div className="rounded-2xl border border-[var(--border)] px-4 py-2 text-sm">
              Tailwind
            </div>
            <div className="rounded-2xl border border-[var(--border)] px-4 py-2 text-sm">
              Supabase
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
