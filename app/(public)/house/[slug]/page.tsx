import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { HousePasswordGate } from "@/src/modules/houses/components/HousePasswordGate";
import { getHouseBySlug } from "@/src/modules/houses/services/getHouseBySlug";
import { getPublishedHousePage } from "@/src/modules/houses/services/getPublishedHousePage";
import { getPublishedHouseSections } from "@/src/modules/houses/services/getPublishedHouseSections";
import { validateHouseSession } from "@/src/modules/houses/services/validateHouseSession";
import { getHouseAccessCookieName } from "@/src/shared/utils/security/getHouseAccessCookieName";

type HousePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function HousePage({ params }: HousePageProps) {
  const { slug } = await params;

  const house = await getHouseBySlug(slug);

  if (!house) {
    notFound();
  }

  const districtColor = house.district?.theme_color ?? "#7c3aed";

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(getHouseAccessCookieName(slug))?.value;

  const hasAccess = sessionToken
    ? await validateHouseSession({
        slug,
        sessionToken,
      })
    : false;

  if (!hasAccess) {
    return (
      <HousePasswordGate
        slug={slug}
        houseName={house.name}
        districtName={house.district?.name ?? null}
        districtColor={districtColor}
      />
    );
  }

  const homePage = await getPublishedHousePage(house.id, "home");

  if (!homePage) {
    notFound();
  }

  const sections = await getPublishedHouseSections(homePage.id);

  const heroSection = sections.find((section) => section.kind === "hero");

  const heroContent =
    heroSection && typeof heroSection.content === "object" && heroSection.content
      ? heroSection.content
      : {};

  const headline =
    typeof heroContent.headline === "string"
      ? heroContent.headline
      : house.name;

  const subheadline =
    typeof heroContent.subheadline === "string"
      ? heroContent.subheadline
      : house.public_description ?? "Информация по дому скоро будет доступна.";

  const ctaLabel =
    typeof heroContent.ctaLabel === "string"
      ? heroContent.ctaLabel
      : "Подробнее";

  return (
    <main
      className="min-h-screen text-[var(--foreground)]"
      style={{ backgroundColor: "var(--background)" }}
    >
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <div
            className="mb-4 inline-flex rounded-full px-3 py-1 text-sm font-medium text-white"
            style={{ backgroundColor: districtColor }}
          >
            {house.district?.name ?? "Район не указан"}
          </div>

          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            {headline}
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--muted)] sm:text-lg">
            {subheadline}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border)] px-4 py-3">
              <div className="text-sm text-[var(--muted)]">Дом</div>
              <div className="mt-1 font-medium">{house.name}</div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] px-4 py-3">
              <div className="text-sm text-[var(--muted)]">Адрес</div>
              <div className="mt-1 font-medium">{house.address}</div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] px-4 py-3">
              <div className="text-sm text-[var(--muted)]">ОСББ</div>
              <div className="mt-1 font-medium">
                {house.osbb_name ?? "Не указано"}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] px-4 py-3">
              <div className="text-sm text-[var(--muted)]">CTA</div>
              <div className="mt-1 font-medium">{ctaLabel}</div>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-dashed border-[var(--border)] p-4">
            <div className="text-sm font-medium">Доступ к дому подтвержден</div>
            <div className="mt-2 text-sm text-[var(--muted)]">
              Сессия дома валидна. Контент загружен из Supabase.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
