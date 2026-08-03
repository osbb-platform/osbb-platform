import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./site-theme.css";

import { SiteFooter } from "@/src/modules/site/components/layout/SiteFooter";
import { SiteHeader } from "@/src/modules/site/components/layout/SiteHeader";
import { JsonLd } from "@/src/modules/site/components/seo/JsonLd";
import { getSiteCmsContent } from "@/src/modules/site/services/getSiteCmsContent";

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

export default async function SiteLayout({ children }: SiteLayoutProps) {
  const { settings } = await getSiteCmsContent();

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.organizationName,
    email: settings.email,
    telephone: settings.primaryPhone,
    url: "https://osbb-platform.com.ua",
  };

  return (
    <div className="site-theme-root">
      <JsonLd data={organizationJsonLd} />
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
