import { notFound } from "next/navigation";
import { getHouseHomePageByHouseId } from "@/src/modules/houses/services/getHouseHomePageByHouseId";
import { getHouseBySlug } from "@/src/modules/houses/services/getHouseBySlug";
import { getPublishedHouseSections } from "@/src/modules/houses/services/getPublishedHouseSections";

export async function getPublishedHomeSectionsBySlug(slug: string) {
  const house = await getHouseBySlug(slug);

  if (!house) {
    notFound();
  }

  const homePage = await getHouseHomePageByHouseId(house.id);
  const sections = homePage ? await getPublishedHouseSections(homePage.id) : [];

  return {
    house,
    sections,
  };
}
