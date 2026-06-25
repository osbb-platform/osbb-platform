import type { ReactNode } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import "../../public-theme.css";
import { HousePasswordGate } from "@/src/modules/houses/components/HousePasswordGate";
import { PublicHouseBell } from "@/src/modules/houses/components/PublicHouseBell";
import { PublicHouseFooter } from "@/src/modules/houses/components/PublicHouseFooter";
import { PublicHouseNavigation } from "@/src/modules/houses/components/PublicHouseNavigation";
import { PublicHouseAnalyticsTracker } from "@/src/modules/analytics/components/PublicHouseAnalyticsTracker";
import { getPublicHouseApartmentOptions } from "@/src/modules/apartments/services/public/getPublicHouseApartmentOptions";
import { getHouseBySlug } from "@/src/modules/houses/services/getHouseBySlug";
import { getChairmanForHouse } from "@/src/modules/houses/services/getPublishedHouseBoard";
import { getPublicHouseBellFeed } from "@/src/modules/houses/services/getPublicHouseBellFeed";
import { validateHouseSession } from "@/src/modules/houses/services/validateHouseSession";
import { getHouseAccessCookieName } from "@/src/shared/utils/security/getHouseAccessCookieName";
import { houseCopy } from "@/src/shared/publicCopy/house";
import { getDistrictAccentStyle } from "@/src/modules/houses/utils/resolveDistrictAccent";
import {
  PublicThemeProvider,
  PublicThemeScript,
  PublicThemeSwitch,
} from "@/src/shared/ui/public";
import { PubIcon } from "@/src/shared/ui/public/PublicIcons";

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
      <div
        id="pub-theme-root"
        className="pub-theme-root"
        data-house-theme="light"
        style={getDistrictAccentStyle(districtColor)}
      >
        <PublicThemeScript slug={slug} />
        <PublicHouseAnalyticsTracker houseId={house.id} houseSlug={house.slug} />
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
      </div>
    );
  }

  const rawChairman = await getChairmanForHouse(house.id);

  const chairman = rawChairman
    ? {
        name: rawChairman.name.trim(),
        role: rawChairman.role.trim() || null,
        phone: rawChairman.phone.trim() || null,
      }
    : null;

  const bellFeed = await getPublicHouseBellFeed({
    houseId: house.id,
  });

  const apartmentOptions = await getPublicHouseApartmentOptions({
    houseId: house.id,
  });

  return (
    <div
      id="pub-theme-root"
      className="pub-theme-root min-h-screen bg-[var(--pub-bg)] text-[var(--pub-text)]"
      data-house-theme="light"
      style={getDistrictAccentStyle(districtColor)}
    >
      <PublicThemeScript slug={slug} />
      <PublicThemeProvider slug={slug}>
        <PublicHouseAnalyticsTracker houseId={house.id} houseSlug={house.slug} />

        <header className="sticky top-0 z-50 border-b border-[var(--pub-border)] bg-[var(--pub-header-bg)]/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 py-2.5 sm:gap-4 sm:px-6 lg:px-8">
            <Link
              prefetch={false}
              href={"/"}
              className="flex min-w-0 items-center gap-4 rounded-[var(--r-lg)] pr-3 transition-all duration-200 hover:bg-[var(--pub-bg-quiet)]"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--r-lg)] bg-[var(--pub-accent)] text-[var(--pub-accent-contrast)] shadow-[var(--pub-shadow-sm)]">
                <PubIcon name="home" className="h-6 w-6" />
              </span>

              <span className="min-w-0">
                <span className="block max-w-[360px] truncate text-lg font-semibold leading-tight text-[var(--pub-text)]">
                  {house.name}
                </span>

                <span className="mt-1 inline-flex max-w-[260px] truncate rounded-[var(--r-pill)] bg-[var(--pub-accent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--pub-accent-contrast)]">
                  {house.district?.name ?? houseCopy.common.houseFallback}
                </span>
              </span>
            </Link>

            <div className="flex items-center gap-2.5">
              <PublicHouseBell feed={bellFeed} />

              <div className="hidden lg:block">
                <PublicThemeSwitch />
              </div>

              <PublicHouseNavigation
                chairman={chairman}
                slug={slug}
                houseName={house.name}
                houseAddress={house.address}
                districtName={house.district?.name ?? houseCopy.common.houseFallback}
                districtColor={districtColor}
              />
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1280px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
          {children}
        </div>

        <PublicHouseFooter
          districtColor={districtColor}
          houseId={house.id}
          houseSlug={house.slug}
          houseName={house.name}
          apartmentOptions={apartmentOptions}
          managementCompany={house.management_company}
        />
      </PublicThemeProvider>
    </div>
  );
}
