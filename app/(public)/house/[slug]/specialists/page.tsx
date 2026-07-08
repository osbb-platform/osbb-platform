import Link from "next/link";

import { SpecialistContactRequestForm } from "@/src/modules/houses/components/SpecialistContactRequestForm";
import { getPublicHouseApartmentOptions } from "@/src/modules/apartments/services/public/getPublicHouseApartmentOptions";
import { getHouseBySlug } from "@/src/modules/houses/services/getHouseBySlug";
import { getPublishedHouseSpecialists } from "@/src/modules/houses/services/getPublishedHouseSpecialists";
import { CopyPhoneButton } from "@/src/modules/houses/components/CopyPhoneButton";
import { houseSpecialistsCopy } from "@/src/shared/publicCopy/house";
import { PubSectionHeader } from "@/src/shared/ui/public/PubSectionHeader";
import { PubFilterTabs, type PubFilterTabItem } from "@/src/shared/ui/public/PubFilterTabs";
import { PubBadge } from "@/src/shared/ui/public/PubBadge";
import { PubIcon } from "@/src/shared/ui/public/PublicIcons";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ category?: string; specialist?: string }>;
};

type SpecialistCard = {
  id: string;
  title: string;
  category: string;
  phones: string[];
  phoneTypes: Array<"mobile" | "landline" | "free">;
  email: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

function normalizePhoneType(value: unknown): "mobile" | "landline" | "free" {
  return value === "landline" || value === "free" ? value : "mobile";
}

function getPhoneTypeLabel(value: "mobile" | "landline" | "free") {
  if (value === "landline") return "Міський";
  if (value === "free") return "Безкоштовний 0-800";
  return "Мобільний";
}

function getTelHref(phone: string) {
  const normalized = phone.replace(/[^+\d]/g, "");
  return normalized ? `tel:${normalized}` : "#";
}

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
      <div className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--pub-text-soft)] sm:w-[112px]">
        {label}
      </div>
      <div className="min-w-0 break-words text-sm leading-7 text-[var(--pub-text)]">
        {value}
      </div>
    </div>
  );
}

function SpecialistCardView({
  item,
  activeCategory,
}: {
  item: SpecialistCard;
  activeCategory: string;
}) {
  return (
    <article className="w-full min-w-0 rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-6 shadow-[var(--pub-shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--pub-shadow-md)] sm:p-7">
      <div className="flex flex-wrap items-center gap-2">
        {item.category ? (
          <PubBadge tone="accent" size="sm">
            {item.category}
          </PubBadge>
        ) : null}
      </div>

      <h2 className="mt-5 break-words font-[var(--font-serif)] text-2xl font-semibold tracking-tight text-[var(--pub-text)] sm:text-3xl">
        {item.title}
      </h2>

      <div className="mt-6 space-y-3">
        {item.phones.length > 0 ? (
          <div className="flex min-w-0 items-start gap-3">
            <div className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--pub-text-soft)] sm:w-[112px]">
              {houseSpecialistsCopy.card.phone}
            </div>
            <div className="grid min-w-0 gap-2">
              {item.phones.map((phone, index) => {
                const phoneType = normalizePhoneType(item.phoneTypes[index]);

                return (
                  <a
                    key={`${item.id}-${phone}-tel`}
                    href={getTelHref(phone)}
                    className="min-w-0 break-words text-sm font-semibold leading-7 text-[var(--pub-text)] underline decoration-[var(--pub-border-strong)] underline-offset-4 transition hover:text-[var(--pub-accent-strong)]"
                  >
                    <span className="text-[var(--pub-text-soft)]">{getPhoneTypeLabel(phoneType)}: </span>
                    {phone}
                  </a>
                );
              })}
            </div>
          </div>
        ) : (
          <ContactRow
            label={houseSpecialistsCopy.card.phone}
            value={houseSpecialistsCopy.card.phoneHidden}
          />
        )}
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
            href={`/specialists?category=${encodeURIComponent(activeCategory)}&specialist=${encodeURIComponent(item.id)}`}
            scroll={false}
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[var(--r-pill)] border border-[var(--pub-border-strong)] bg-[var(--pub-surface-elevated)] px-5 text-sm font-semibold text-[var(--pub-text)] transition hover:bg-[var(--pub-bg-quiet)]"
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
  void slug;
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

  const apartmentOptions = await getPublicHouseApartmentOptions({
    houseId: house.id,
  });

  const activeSpecialists = sortSpecialists(
    specialistsData.specialists.map((item) => ({
      id: item.id,
      title: item.content.title,
      category: item.content.category,
      phones: item.content.phones,
      phoneTypes: item.content.phoneTypes,
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

  const filterTabs: PubFilterTabItem[] = filterItems.map((item) => ({
    key: item.key,
    label: item.label,
    href: `/specialists?category=${encodeURIComponent(item.key)}`,
    count: item.count,
    active: activeCategory === item.key,
  }));

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
      <div className="grid min-w-0 gap-6">
        <PubSectionHeader
          title={houseSpecialistsCopy.page.title}
          description={houseSpecialistsCopy.page.description}
        >
          {filterTabs.length > 1 ? (
            <PubFilterTabs items={filterTabs} ariaLabel={houseSpecialistsCopy.page.title} />
          ) : null}
        </PubSectionHeader>

        {filteredSpecialists.length > 0 ? (
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            {filteredSpecialists.map((item) => (
              <SpecialistCardView
                key={item.id}
                item={item}
                activeCategory={activeCategory}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[var(--r-2xl)] border border-dashed border-[var(--pub-border-strong)] bg-[var(--pub-surface)] p-6 text-center text-sm text-[var(--pub-text-muted)] shadow-[var(--pub-shadow-sm)] sm:p-8">
            {houseSpecialistsCopy.page.empty}
          </div>
        )}
      </div>

      {canOpenModal && selectedSpecialist ? (
        <>
          <Link
            prefetch={false}
            href={`/specialists?category=${encodeURIComponent(activeCategory)}`}
            scroll={false}
            className="fixed inset-0 z-40 bg-[var(--pub-overlay)] backdrop-blur-[2px]"
            aria-label={houseSpecialistsCopy.page.closeModal}
          />

          <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6">
            <div className="max-h-[85vh] w-full max-w-[720px] overflow-y-auto rounded-[var(--r-2xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] shadow-[var(--pub-shadow-lg)]">
              <div className="flex items-start justify-between gap-3 border-b border-[var(--pub-border)] px-4 py-4 sm:px-7 sm:py-6">
                <div>
                  <h2 className="font-[var(--font-serif)] text-2xl font-semibold tracking-tight text-[var(--pub-text)] sm:text-3xl">
                    Заявка спеціалісту
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--pub-text-muted)]">
                    Телефон спеціаліста приховано. Залиште заявку — і ми передамо звернення в управляючу компанію.
                  </p>
                </div>

                <Link
                  prefetch={false}
                  href={`/specialists?category=${encodeURIComponent(activeCategory)}`}
                  scroll={false}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--r-pill)] border border-[var(--pub-border)] bg-[var(--pub-surface)] text-[var(--pub-text-muted)] transition hover:bg-[var(--pub-bg-quiet)]"
                >
                  <PubIcon name="close" className="h-5 w-5" />
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
