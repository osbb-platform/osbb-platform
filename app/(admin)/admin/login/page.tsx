import { AdminLoginForm } from "@/src/modules/auth/components/AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-[var(--cms-bg-page)] text-[var(--cms-text-primary)]">
      <section className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6 py-16">
        <div className="w-full rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-10 shadow-sm">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-5xl font-semibold tracking-tight text-[var(--cms-text-primary)]">
              Вхід до кабінету
            </h1>

            <p className="mt-5 text-xl leading-9 text-[var(--cms-text-secondary)]">
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
