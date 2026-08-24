import { notFound } from "next/navigation";

import { ChairmanAnnouncementForm } from "@/src/modules/houses/chairman/ChairmanAnnouncementForm";
import { getHouseBySlug } from "@/src/modules/houses/services/getHouseBySlug";

type ChairmanCabinetPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ChairmanCabinetPage({
  params,
}: ChairmanCabinetPageProps) {
  const { slug } = await params;
  const house = await getHouseBySlug(slug);

  if (!house) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-[880px] px-4 py-8 sm:px-5 sm:py-10 lg:px-6 lg:py-12">
      <section className="mb-6">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--pub-text-soft)]">
          Кабінет голови ОСББ
        </div>

        <h1 className="mt-2 font-[var(--font-serif)] text-[clamp(2rem,5vw,3.4rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-[var(--pub-text)]">
          Публікація оголошення
        </h1>

        <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--pub-text-soft)]">
          {house.name}. Створене тут оголошення одразу публікується для мешканців.
          Подальше редагування, архівація та керування виконуються менеджером у CMS.
        </p>
      </section>

      <ChairmanAnnouncementForm slug={slug} />

      <div className="mt-4 text-sm leading-6 text-[var(--pub-text-soft)]">
        У кабінеті голови немає редагування, архівації, видалення або завантаження PDF.
      </div>
    </main>
  );
}
