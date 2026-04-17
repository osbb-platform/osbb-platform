import { getHouseHomePageByHouseId } from "@/src/modules/houses/services/getHouseHomePageByHouseId";
import { getPublishedHomeSectionsBySlug } from "@/src/modules/houses/services/getPublishedHomeSectionsBySlug";
import { getPublishedHouseSections } from "@/src/modules/houses/services/getPublishedHouseSections";

type EnsureSectionFn = (params: {
  housePageId: string;
  houseSlug: string;
}) => Promise<string>;

type GetEnsuredPublishedHomeSectionsBySlugParams = {
  slug: string;
  ensureSection?: EnsureSectionFn;
};

export async function getEnsuredPublishedHomeSectionsBySlug({
  slug,
  ensureSection,
}: GetEnsuredPublishedHomeSectionsBySlugParams) {
  const base = await getPublishedHomeSectionsBySlug(slug);

  if (!ensureSection) {
    return base;
  }

  const homePage = await getHouseHomePageByHouseId(base.house.id);

  if (!homePage) {
    return base;
  }

  await ensureSection({
    housePageId: homePage.id,
    houseSlug: base.house.slug,
  });

  const sections = await getPublishedHouseSections(homePage.id);

  return {
    house: base.house,
    sections,
  };
}
