import { SiteRoutePlaceholder } from "@/src/modules/site/components/SiteRoutePlaceholder";
import {
  sitePageTitles,
  siteSettings,
} from "@/src/modules/site/data/siteContent";

export default function PrivacyPage() {
  return (
    <SiteRoutePlaceholder
      title={sitePageTitles.privacy}
      description={`Тимчасовий каркас документа. Власник даних: ${siteSettings.legalName}.`}
    />
  );
}
