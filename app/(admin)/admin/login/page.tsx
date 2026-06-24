import { AdminLoginForm } from "@/src/modules/auth/components/AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <main className="cms-theme-root min-h-screen bg-[var(--cms-bg)] text-[var(--cms-text)]">
      <section className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6 py-16">
        <div className="w-full rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface)] p-10 shadow-[var(--cms-shadow-sm)]">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-5xl font-semibold tracking-tight text-[var(--cms-text)]">
              Вхід до кабінету
            </h1>

            <p className="mt-5 text-xl leading-9 text-[var(--cms-text-muted)]">
              Увійдіть, щоб працювати з будинками, оновлювати інформацію та керувати процесами.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-2xl">
            <AdminLoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}
