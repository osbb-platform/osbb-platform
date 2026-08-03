import { SiteRoutePlaceholder } from "@/src/modules/site/components/SiteRoutePlaceholder";
import { sitePageTitles } from "@/src/modules/site/data/siteContent";

export default function ResidentsPage() {
  return <SiteRoutePlaceholder title={sitePageTitles.residents} />;
}
