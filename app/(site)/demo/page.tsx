import { SiteRoutePlaceholder } from "@/src/modules/site/components/SiteRoutePlaceholder";
import {
  sitePageTitles,
  siteSettings,
} from "@/src/modules/site/data/siteContent";

export default function DemoPage() {
  return (
    <SiteRoutePlaceholder
      title={sitePageTitles.demo}
      description={`Демонстраційний кабінет: ${siteSettings.demoHouseName}, ${siteSettings.demoHouseAddress}. Код доступу зберігається централізовано в siteContent.ts.`}
    />
  );
}
