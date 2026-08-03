import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./site-theme.css";

import { SiteFooter } from "@/src/modules/site/components/layout/SiteFooter";
import { SiteHeader } from "@/src/modules/site/components/layout/SiteHeader";
import { JsonLd } from "@/src/modules/site/components/seo/JsonLd";
import { siteSettings } from "@/src/modules/site/data/siteContent";

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
    <div className="site-theme-root">
      <JsonLd data={organizationJsonLd} />
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
