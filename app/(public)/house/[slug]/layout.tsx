import type { ReactNode } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { HousePasswordGate } from "@/src/modules/houses/components/HousePasswordGate";
import { PublicHouseBell } from "@/src/modules/houses/components/PublicHouseBell";
import { PublicHouseFooter } from "@/src/modules/houses/components/PublicHouseFooter";
import { PublicHouseNavigation } from "@/src/modules/houses/components/PublicHouseNavigation";
import { getAdminHouseApartments } from "@/src/modules/apartments/services/getAdminHouseApartments";
import { getHouseBySlug } from "@/src/modules/houses/services/getHouseBySlug";
import { getPublicHouseBellFeed } from "@/src/modules/houses/services/getPublicHouseBellFeed";
import { validateHouseSession } from "@/src/modules/houses/services/validateHouseSession";
import { getHouseAccessCookieName } from "@/src/shared/utils/security/getHouseAccessCookieName";
import { houseCopy } from "@/src/shared/publicCopy/house";

type PublicHouseLayoutProps = {
  children: ReactNode;
  params: Promise<{
    slug: string;
  }>;
};

export default async function PublicHouseLayout({
  children,
  params,
}: PublicHouseLayoutProps) {
  const { slug } = await params;
  const house = await getHouseBySlug(slug);

  if (!house) {
    notFound();
  }

  const districtColor = house.district?.theme_color ?? "#16a34a";

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(getHouseAccessCookieName(slug))?.value;

  const hasAccess = sessionToken
    ? await validateHouseSession({
        slug,
        sessionToken,
      })
    : false;

  const initialLockedUntil = Number(
    cookieStore.get(`house-access-lock-${slug}`)?.value ?? 0,
  );

  if (!hasAccess) {
    return (
      <HousePasswordGate
        initialLockedUntil={initialLockedUntil}
        slug={slug}
        houseName={house.name}
        houseAddress={house.address}
        shortDescription={house.short_description}
        publicDescription={house.public_description}
        houseCoverImageUrl={house.cover_image_url ?? null}
        districtName={house.district?.name ?? null}
        districtColor={districtColor}
      />
    );
  }

  const bellFeed = await getPublicHouseBellFeed({
    houseId: house.id,
  });

  const apartmentsData = await getAdminHouseApartments({
    houseId: house.id,
    includeArchivedSummary: false,
  });

  const apartmentOptions = apartmentsData.items
    .map((item) => ({
      id: item.id,
      label: item.apartment_label,
      ownerName: item.owner_name,
    }))
    .sort((left, right) => left.label.localeCompare(right.label, "uk"));

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-white/95">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href={`/house/${slug}`}
            className="flex min-w-0 items-center gap-4 rounded-full pr-3 transition hover:bg-slate-50"
          >
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-sm"
              style={{ backgroundColor: districtColor }}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 11.5L12 4l9 7.5" />
                <path d="M5.5 10.5V20h13V10.5" />
                <path d="M9.5 20v-5h5v5" />
              </svg>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="truncate text-lg font-semibold text-slate-950">
                  {house.name}
                </div>

                <div
                  className="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white"
                  style={{ backgroundColor: districtColor }}
                >
                  {house.district?.name ?? houseCopy.common.houseFallback}
                </div>
              </div>

              <div className="truncate text-sm text-slate-500">
                {house.address}
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <PublicHouseBell feed={bellFeed} />

            <PublicHouseNavigation
              slug={slug}
              houseName={house.name}
              districtColor={districtColor}
            />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </div>

      <PublicHouseFooter
        districtColor={districtColor}
        houseId={house.id}
        houseSlug={house.slug}
        houseName={house.name}
        apartmentOptions={apartmentOptions}
      />
    </main>
  );
}