export default function AdminPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-sm">
          <div className="mb-4 inline-flex rounded-full bg-slate-800 px-3 py-1 text-sm font-medium text-slate-200">
            Admin Foundation
          </div>

          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Admin Panel Skeleton
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
            Это стартовая заглушка админской зоны. На следующих шагах здесь
            появятся auth, protected routes, RBAC и каркас CMS.
          </p>
        </div>
      </section>
    </main>
  );
}
