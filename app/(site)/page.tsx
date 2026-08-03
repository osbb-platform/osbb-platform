import { SiteRoutePlaceholder } from "@/src/modules/site/components/SiteRoutePlaceholder";
import {
  sitePageTitles,
  sitePrototypeFigures,
} from "@/src/modules/site/data/siteContent";

export default function SiteHomePage() {
  return (
    <SiteRoutePlaceholder
      title={sitePageTitles.home}
      description={`Затверджений прототип буде перенесено поетапно. Демонстраційний показник: ${sitePrototypeFigures.houses} будинків.`}
    />
  );
}
