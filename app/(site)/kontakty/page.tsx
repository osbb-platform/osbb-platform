import { SiteRoutePlaceholder } from "@/src/modules/site/components/SiteRoutePlaceholder";
import {
  sitePageTitles,
  siteSettings,
} from "@/src/modules/site/data/siteContent";

export default function ContactsPage() {
  return (
    <SiteRoutePlaceholder
      title={sitePageTitles.contacts}
      description={`${siteSettings.primaryPhone} · ${siteSettings.email}`}
    />
  );
}
