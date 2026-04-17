import { AdminForgotPasswordForm } from "@/src/modules/auth/components/AdminForgotPasswordForm";

export default function AdminForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-sm">
          <div className="mb-4 inline-flex rounded-full bg-slate-800 px-3 py-1 text-sm font-medium text-slate-200">
            Password recovery
          </div>

          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Восстановление доступа
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
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
