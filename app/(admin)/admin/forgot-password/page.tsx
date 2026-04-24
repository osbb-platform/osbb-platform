import { AdminForgotPasswordForm } from "@/src/modules/auth/components/AdminForgotPasswordForm";

export default function AdminForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-[var(--cms-bg-page)] text-[var(--cms-text-primary)]">
      <section className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
        <div className="rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-8 shadow-sm">
          <div className="mb-4 inline-flex rounded-full border border-[var(--cms-border-primary)] bg-[var(--cms-bg-tertiary)] px-3 py-1 text-sm font-medium text-[var(--cms-text-secondary)]">
            Password recovery
          </div>

          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Восстановление доступа
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--cms-text-secondary)]">
            Укажите рабочий email сотрудника. Мы отправим ссылку для установки
            нового пароля.
          </p>

          <div className="mt-8">
            <AdminForgotPasswordForm />
          </div>
        </div>
      </section>
    </main>
  );
}
