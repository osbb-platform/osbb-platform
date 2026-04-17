import { AdminLoginForm } from "@/src/modules/auth/components/AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6 py-16">
        <div className="w-full rounded-3xl border border-slate-800 bg-slate-900 p-10 shadow-sm">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-5xl font-semibold tracking-tight text-white">
              Вход в панель управления
            </h1>

            <p className="mt-5 text-xl leading-9 text-slate-400">
              Войдите под аккаунтом сотрудника управляющей компании, чтобы получить
              доступ к административной панели.
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
