import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { siteSettings } from "@/src/modules/site/data/siteContent";
import { ROUTES } from "@/src/shared/config/routes/routes.config";

type SiteLayoutProps = Readonly<{
  children: ReactNode;
}>;

const siteNoindex = process.env.SITE_NOINDEX === "true";

export const metadata: Metadata = {
  robots: siteNoindex
    ? {
        index: false,
        follow: false,
        nocache: true,
        googleBot: {
          index: false,
          follow: false,
          noimageindex: true,
        },
      }
    : undefined,
};

export default function SiteLayout({ children }: SiteLayoutProps) {
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteSettings.organizationName,
    email: siteSettings.email,
    telephone: siteSettings.primaryPhone,
    url: "https://osbb-platform.com.ua",
  };

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href={ROUTES.site.home} className="font-semibold">
            {siteSettings.organizationName}
          </Link>

          <nav aria-label="Основна навігація" className="flex gap-4 text-sm">
            <Link href={ROUTES.site.capabilities}>Можливості</Link>
            <Link href={ROUTES.site.pricing}>Вартість</Link>
            <Link href={ROUTES.site.contacts}>Контакти</Link>
          </nav>
        </div>
      </header>

      {children}

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-zinc-600 sm:px-8">
          <span>{siteSettings.organizationName}</span>
          <a href={`mailto:${siteSettings.email}`}>{siteSettings.email}</a>
        </div>
      </footer>
    </div>
  );
}
