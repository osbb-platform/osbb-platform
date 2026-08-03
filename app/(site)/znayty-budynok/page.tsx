import type { Metadata } from "next";

import { SiteRoutePlaceholder } from "@/src/modules/site/components/SiteRoutePlaceholder";
import { sitePageTitles } from "@/src/modules/site/data/siteContent";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
};

export default function FindHousePage() {
  return <SiteRoutePlaceholder title={sitePageTitles.findHouse} />;
}
