import type React from "react";
import Link from "next/link";

import { SpecialistContactRequestForm } from "@/src/modules/houses/components/SpecialistContactRequestForm";
import { getPublicHouseApartmentOptions } from "@/src/modules/apartments/services/public/getPublicHouseApartmentOptions";
import { getHouseBySlug } from "@/src/modules/houses/services/getHouseBySlug";
import { getPublishedHouseSpecialists } from "@/src/modules/houses/services/getPublishedHouseSpecialists";
import { CopyPhoneButton } from "@/src/modules/houses/components/CopyPhoneButton";
import { houseSpecialistsCopy } from "@/src/shared/publicCopy/house";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ category?: string; specialist?: string }>;
};

type SpecialistCard = {
  id: string;
  title: string;
  category: string;
  phones: string[];
  email: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

function sortSpecialists(items: SpecialistCard[]) {
  return [...items].sort((left, right) => {
    const rightTime = new Date(right.updatedAt || right.createdAt).getTime();
    const leftTime = new Date(left.updatedAt || left.createdAt).getTime();

    if (!Number.isNaN(rightTime) && !Number.isNaN(leftTime) && rightTime !== leftTime) {
      return rightTime - leftTime;
    }

    return left.title.localeCompare(right.title, "uk");
  });
}

function ContactRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  if (!value) return null;

  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="w-20 shrink-0 text-xs font-semibold uppercase tracking-[0.16em] text-[#7A746B] sm:w-[112px]">
        {label}
      </div>
      <div className="min-w-0 break-words text-sm leading-7 text-[#34465B]">
        {value}
      </div>
    </div>
  );
}

function SpecialistCardView({
  item,
  slug,
  activeCategory,
}: {
  item: SpecialistCard;
  slug: string;
  activeCategory: string;
}) {
  return (
    <article className="w-full min-w-0 rounded-[30px] border border-[#E4DBD1] bg-[#F6F2EC] p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-7">
      <div className="flex flex-wrap items-center gap-2">
        {item.category ? (
          <span className="inline-flex rounded-full border border-[#D2C6B8] bg-[#E7DED3] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2F3A4F]">
            {item.category}
          </span>
        ) : null}
      </div>

      <h2 className="mt-5 break-words text-3xl font-semibold tracking-tight text-[#1F2A37]">
        {item.title}
      </h2>

      <div className="mt-6 space-y-3">
        <ContactRow
          label={houseSpecialistsCopy.card.phone}
          value={
            item.phones.length > 0
              ? item.phones.join(", ")
              : houseSpecialistsCopy.card.phoneHidden
          }
        />
        <ContactRow
          label={houseSpecialistsCopy.form.email}
          value={item.email}
        />
        <ContactRow
          label={houseSpecialistsCopy.card.hours}
          value={item.description || houseSpecialistsCopy.card.hoursEmpty}
        />
      </div>

      <div className="mt-6">
        {item.phones.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {item.phones.map((phone) => (
              <CopyPhoneButton key={`${item.id}-${phone}`} phone={phone} />
            ))}
          </div>
        ) : (
          <Link
            prefetch={false}
            href={`/house/${slug}/specialists?category=${encodeURIComponent(activeCategory)}&specialist=${encodeURIComponent(item.id)}`}
            scroll={false}
            className="inline-flex min-h-[46px] items-center justify-center rounded-full border border-[#E4DBD1] bg-[#EFE7DD] px-5 text-sm font-semibold text-[#2A3642] transition hover:bg-[#E5DBCF]"
          >
            {houseSpecialistsCopy.card.request}
          </Link>
        )}
      </div>
    </article>
  );
}

export default async function SpecialistsPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeCategory =
    resolvedSearchParams.category ?? houseSpecialistsCopy.filters.all;
  const selectedSpecialistId =
    typeof resolvedSearchParams.specialist === "string"
      ? resolvedSearchParams.specialist
      : "";

  const house = await getHouseBySlug(slug);

  if (!house) {
    return null;
  }
  const specialistsData = await getPublishedHouseSpecialists(house.id);

  const districtColor = house.district?.theme_color ?? "#16a34a";
  const apartmentOptions = await getPublicHouseApartmentOptions({
    houseId: house.id,
  });

  const activeSpecialists = sortSpecialists(
    specialistsData.specialists.map((item) => ({
      id: item.id,
      title: item.content.title,
      category: item.content.category,
      phones: item.content.phones,
      email: item.content.email,
      description: item.content.description,
      createdAt: item.content.createdAt,
      updatedAt: item.content.updatedAt,
    })),
  );

  const categoryCatalog = specialistsData.categories
    .map((category) => category.title)
    .filter(Boolean);

  const usedCategories = categoryCatalog.filter((category) =>
    activeSpecialists.some((item) => item.category === category),
  );

  const fallbackUsedCategories = activeSpecialists
    .map((item) => item.category)
    .filter(Boolean)
    .filter((category, index, array) => array.indexOf(category) === index)
    .filter((category) => !usedCategories.includes(category));

  const filterItems = [
    {
      key: houseSpecialistsCopy.filters.all,
      label: houseSpecialistsCopy.filters.all,
      count: activeSpecialists.length,
    },
    ...[...usedCategories, ...fallbackUsedCategories].map((category) => ({
      key: category,
      label: category,
      count: activeSpecialists.filter((item) => item.category === category).length,
    })),
  ];

  const filteredSpecialists =
    activeCategory === houseSpecialistsCopy.filters.all
      ? activeSpecialists
      : activeSpecialists.filter((item) => item.category === activeCategory);

  const selectedSpecialist = selectedSpecialistId
    ? activeSpecialists.find((item) => item.id === selectedSpecialistId) ?? null
    : null;

  const canOpenModal = selectedSpecialist && selectedSpecialist.phones.length === 0;

  return (
    <>
      <section className="mx-auto w-full min-w-0 max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid min-w-0 gap-6">
          <section className="w-full min-w-0 rounded-[28px] border border-[#E4DBD1] bg-[#F3EEE8] p-4 shadow-sm sm:rounded-[36px] sm:p-8 lg:p-10">
            <div className="min-w-0 text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-[#1F2A37] sm:text-4xl lg:text-6xl">
                {houseSpecialistsCopy.page.title}
              </h1>

              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#606773] sm:mt-5 sm:text-lg sm:leading-8">
                {houseSpecialistsCopy.page.description}
              </p>
            </div>

            {filterItems.length > 1 ? (
              <div className="mt-8 rounded-[28px] border border-[#DDD4CA] bg-[#ECE6DF] p-3 shadow-sm backdrop-blur-sm">
                <div className="flex w-full min-w-0 justify-center gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none]">
                  {filterItems.map((item) => {
                    const isActive = activeCategory === item.key;

                    return (
                      <Link
                        prefetch={false}
                        key={item.key}
                        href={`/house/${slug}/specialists?category=${encodeURIComponent(item.key)}`}
                        scroll={false}
                        className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition ${
                          isActive
                            ? "border-2 text-[color:var(--tab-active-text)] bg-[color:var(--tab-active-bg)]"
                            : "border border-[#D8CEC2] bg-[#EFE7DD] text-[#2A3642] hover:bg-[#F0E9E1]"
                        }`}
                        style={
                          isActive
                            ? ({
                                "--tab-active-bg": `${districtColor}20`,
                                "--tab-active-text": "#1F2A37",
                                borderColor: districtColor,
                              } as React.CSSProperties)
                            : undefined
                        }
                      >
                        <span>{item.label}</span>
                        <span
                          className={`inline-flex min-w-[22px] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                            isActive
                              ? "bg-[#D9CFC3] text-[#1F2A44] border border-[#C4B7A7]"
                              : "bg-[#E7DED3] text-[#2F3A4F] border border-[#D2C6B8]"
                          }`}
                        >
                          {item.count}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </section>

          {filteredSpecialists.length > 0 ? (
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              {filteredSpecialists.map((item) => (
                <SpecialistCardView
                  key={item.id}
                  item={item}
                  slug={slug}
                  activeCategory={activeCategory}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-[#DDD4CA] bg-white p-4 text-center text-sm text-[#7A746B] shadow-sm sm:rounded-[32px] sm:p-8">
              {houseSpecialistsCopy.page.empty}
            </div>
          )}
        </div>
      </section>

      {canOpenModal && selectedSpecialist ? (
        <>
          <Link
            prefetch={false}
            href={`/house/${slug}/specialists?category=${encodeURIComponent(activeCategory)}`}
            scroll={false}
            className="fixed inset-0 z-40 bg-[#1F2A37]/30 backdrop-blur-sm"
            aria-label={houseSpecialistsCopy.page.closeModal}
          />

          <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6">
            <div className="max-h-[85vh] w-full max-w-[720px] overflow-y-auto rounded-[28px] border border-[#E4DBD1] bg-[#F3EEE8] shadow-[0_20px_60px_rgba(0,0,0,0.12)] sm:rounded-[32px]">
              <div className="flex items-start justify-between gap-3 border-b border-[#E4DBD1] px-4 py-4 sm:px-7 sm:py-6">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-[#1F2A37] sm:text-3xl">
                    Заявка спеціалісту
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-[#606773]">
                    Телефон спеціаліста приховано. Залиште заявку — і ми передамо звернення в управляючу компанію.
                  </p>
                </div>

                <Link
                  prefetch={false}
                  href={`/house/${slug}/specialists?category=${encodeURIComponent(activeCategory)}`}
                  scroll={false}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#D8CEC2] bg-[#EFE7DD] text-[#2A3642] transition hover:bg-[#F0E9E1]"
                >
                  ✕
                </Link>
              </div>

              <div className="max-h-[64vh] overflow-y-auto px-6 py-6 sm:px-7">
                <SpecialistContactRequestForm
                  houseId={house.id}
                  houseSlug={house.slug}
                  houseName={house.name}
                  specialistId={selectedSpecialist.id}
                  specialistLabel={selectedSpecialist.title}
                  category={selectedSpecialist.category || houseSpecialistsCopy.page.title}
                  apartmentOptions={apartmentOptions}
                />
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
