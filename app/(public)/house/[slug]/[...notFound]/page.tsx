// ════════════════════════════════════════════════════════════════════════
// app/(public)/house/[slug]/[...notFound]/page.tsx
// Блок 2 · Заглушка «сторінку не знайдено» (Тип 2, всередині кабінету).
//
// Сенс: будинок існує (layout відпрацював → є chrome і --pub-accent району),
// але внутрішній URL застарілий/некоректний. Реальні розділи мають пріоритет —
// цей catch-all ловить лише «зайві» шляхи.
//
// НЕ обгортаємо власною .pub-theme-root — екран рендериться ВСЕРЕДИНІ
// layout.tsx кабінету, акцент району вже діє. Тільки токени --pub-* і Pub*.
// Серверний компонент; getHouseBySlug — лише для назви будинку в тексті
// (необов'язково), жодних дій, що ламають рендер.
// ════════════════════════════════════════════════════════════════════════
import Link from "next/link";
import { PubCard } from "@/src/shared/ui/public/PubCard";
import { PubButton } from "@/src/shared/ui/public/PubButton";
import { PubIcon } from "@/src/shared/ui/public/PublicIcons";
import { getHouseBySlug } from "@/src/modules/houses/services/getHouseBySlug";

type Props = {
  params: Promise<{ slug: string; notFound?: string[] }>;
};

export default async function PublicHouseCatchAllNotFound({ params }: Props) {
  const { slug } = await params;

  // Необов'язково: дістати назву будинку для тексту. Безпечно ковтаємо помилку,
  // щоб рендер заглушки не залежав від доступності даних.
  let houseName: string | null = null;
  try {
    const house = await getHouseBySlug(slug);
    houseName = house?.name ?? null;
  } catch {
    houseName = null;
  }

  return (
    <div className="px-4 py-8">
      <PubCard
        elevated
        elevation="md"
        padding="lg"
        className="mx-auto max-w-[560px] rounded-[var(--r-3xl)] text-center"
      >
        <div className="flex justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-[var(--r-pill)] bg-[var(--pub-accent-soft)] text-[var(--pub-accent-strong)]">
            <PubIcon name="search" className="h-7 w-7" />
          </span>
        </div>

        <h1 className="mt-5 font-[var(--font-serif)] text-[28px] font-semibold leading-[1.12] tracking-[-0.01em] text-[var(--pub-text)] sm:text-[32px]">
          Сторінку не знайдено
        </h1>

        <p className="mx-auto mt-4 max-w-[440px] text-[15px] leading-7 text-[var(--pub-text-muted)] sm:text-base">
          Можливо, посилання застаріле. Поверніться на головну сторінку{" "}
          {houseName ? (
            <span className="font-semibold text-[var(--pub-text)]">
              будинку «{houseName}»
            </span>
          ) : (
            "будинку"
          )}{" "}
          — там усі актуальні розділи.
        </p>

        <div className="mt-7 flex justify-center">
          <Link prefetch={false} href={`/house/${slug}`}>
            <PubButton
              variant="primary"
              size="lg"
              leftIcon={<PubIcon name="home" className="h-5 w-5" />}
            >
              На головну будинку
            </PubButton>
          </Link>
        </div>
      </PubCard>
    </div>
  );
}
