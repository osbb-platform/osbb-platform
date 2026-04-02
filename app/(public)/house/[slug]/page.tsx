type HousePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function HousePage({ params }: HousePageProps) {
  const { slug } = await params;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <div className="mb-4 inline-flex rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-700">
            House Fallback Route
          </div>

          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Дом: {slug}
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Это временный fallback-маршрут дома для локальной разработки. На
            следующих шагах сюда будет встроена логика публичного первого экрана
            дома, пароля дома, темизации района и загрузки контента.
          </p>
        </div>
      </section>
    </main>
  );
}
