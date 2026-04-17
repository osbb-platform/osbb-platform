import { notFound } from "next/navigation";
import { ensureHouseHomePage } from "@/src/modules/houses/services/ensureHouseHomePage";
import { getHouseHomePageByHouseId } from "@/src/modules/houses/services/getHouseHomePageByHouseId";
import { getHouseBySlug } from "@/src/modules/houses/services/getHouseBySlug";
import { getPublishedHouseSections } from "@/src/modules/houses/services/getPublishedHouseSections";

export async function getPublishedHomeSectionsBySlug(slug: string) {
  const house = await getHouseBySlug(slug);

  if (!house) {
    notFound();
  }

  let homePage = await getHouseHomePageByHouseId(house.id);

  if (!homePage) {
    homePage = await ensureHouseHomePage({
      houseId: house.id,
    });
  }

  const sections = await getPublishedHouseSections(homePage.id);

  return {
    house,
    sections,
  };
}
