import { SiteRoutePlaceholder } from "@/src/modules/site/components/SiteRoutePlaceholder";
import {
  sitePageTitles,
  siteReleases,
} from "@/src/modules/site/data/siteContent";

export default function ReleasesPage() {
  const latestRelease = siteReleases[0];

  return (
    <SiteRoutePlaceholder
      title={sitePageTitles.releases}
      description={latestRelease?.summary}
    />
  );
}
