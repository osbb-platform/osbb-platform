import { notFound } from "next/navigation";

import { getPublicHouseApartmentOptions } from "@/src/modules/apartments/services/public/getPublicHouseApartmentOptions";
import { PublicHousePolls } from "@/src/modules/houses/components/PublicHousePolls";
import { getHouseBySlug } from "@/src/modules/houses/services/getHouseBySlug";
import { getPublishedHousePolls } from "@/src/modules/houses/services/getPublishedHousePolls";
import { PubSectionHeader } from "@/src/shared/ui/public/PubSectionHeader";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PublicHousePollsPage({
  params,
}: Props) {
  const { slug } = await params;
  const house = await getHouseBySlug(slug);

  if (!house) {
    notFound();
  }

  const [polls, apartments] = await Promise.all([
    getPublishedHousePolls(house.id),
    getPublicHouseApartmentOptions({
      houseId: house.id,
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <PubSectionHeader
        eyebrow="Участь мешканців"
        title="Опитування"
        description="Оберіть квартиру, дайте відповіді на активні опитування та переглядайте результати, коли це дозволено налаштуваннями."
      />

      <div className="mt-6">
        <PublicHousePolls
          slug={slug}
          polls={polls}
          apartments={apartments}
        />
      </div>
    </div>
  );
}
