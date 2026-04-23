"use client";

import { useMemo, useState } from "react";

type ArticleItem = {
  id: string;
  title: string | null;
  content: Record<string, unknown>;
};

type Props = {
  articles: ArticleItem[];
};

const CATEGORY_LABELS: Record<string, string> = {
  "О доме": "Про будинок",
  "Правила проживания": "Правила проживання",
  "Полезная информация": "Корисна інформація",
  "Контакты служб": "Контакти служб",
  "Инструкции для жильцов": "Інструкції для мешканців",
};

function normalizeCategoryLabel(value: unknown) {
  const category = typeof value === "string" ? value.trim() : "";
  if (!category) {
    return "";
  }

  return CATEGORY_LABELS[category] ?? category;
}

function formatPublishedAt(value: unknown) {
  if (typeof value !== "string" || !value) {
    return "Дату публікації не вказано";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Дату публікації не вказано";
  }

  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function PublicInformationSlider({
  articles,
}: Props) {
  const sortedArticles = useMemo(() => {
    return [...articles].sort((a, b) => {
      const aDate = new Date(
        String((a.content?.publishedAt as string) ?? ""),
      ).getTime();

      const bDate = new Date(
        String((b.content?.publishedAt as string) ?? ""),
      ).getTime();

      return bDate - aDate;
    });
  }, [articles]);

  const [activeIndex, setActiveIndex] = useState(0);

  const article = sortedArticles[activeIndex];

  if (!article) {
    return null;
  }

  const content =
    typeof article.content === "object" && article.content
      ? article.content
      : {};

  const headline =
    typeof content.headline === "string" && content.headline
      ? content.headline
      : article.title ?? "Матеріал";

  const body =
    typeof content.body === "string" && content.body.trim()
      ? content.body
      : "Текст матеріалу поки не заповнено.";

  const coverImageUrl =
    typeof content.coverImageUrl === "string"
      ? content.coverImageUrl
      : "";

  const publishedAt = formatPublishedAt(content.publishedAt);
  const categoryLabel = normalizeCategoryLabel(content.category);

  function goPrev() {
    setActiveIndex((prev) =>
      prev === 0 ? sortedArticles.length - 1 : prev - 1,
    );
  }

  function goNext() {
    setActiveIndex((prev) =>
      prev === sortedArticles.length - 1 ? 0 : prev + 1,
    );
  }

  return (
    <div className="mt-6">
      <div className="overflow-hidden rounded-[32px] border border-[#E4DBD1] bg-[#F9F6F2] shadow-[0_8px_24px_rgba(31,42,55,0.05)]">
        <div className="grid min-h-[280px] sm:min-h-[420px] lg:grid-cols-2">
          <div className="relative min-h-[280px] bg-[#ECE6DF]">
            {coverImageUrl ? (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url("${coverImageUrl}")` }}
              />
            ) : null}
          </div>

          <div className="flex flex-col justify-between p-4 sm:p-8">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                {categoryLabel ? (
                  <span className="inline-flex rounded-full border border-[#D8CEC2] bg-[#F3EEE8] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5B6B7C]">
                    {categoryLabel}
                  </span>
                ) : null}

                <div className="text-xs font-medium uppercase tracking-[0.2em] text-[#7B8A9A]">
                  {publishedAt}
                </div>
              </div>

              <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950 sm:mt-4 sm:text-3xl">
                {headline}
              </h2>

              <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#42546A] sm:mt-6 sm:text-base sm:leading-8">
                {body}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between sm:mt-8">
              <div className="flex items-center gap-2">
                {sortedArticles.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`h-2.5 w-2.5 rounded-full transition ${
                      index === activeIndex
                        ? "bg-[#1F2A37]"
                        : "bg-[#D6CEC2]"
                    }`}
                    aria-label={`Перейти до матеріалу ${index + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goPrev}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#D8CEC2] bg-[#F5F1EB] text-lg text-[#1F2A37] transition-all duration-200 hover:border-[#CFC3B6] hover:bg-[#EEE7DE]"
                >
                  ←
                </button>

                <button
                  type="button"
                  onClick={goNext}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#D8CEC2] bg-[#F5F1EB] text-lg text-[#1F2A37] transition-all duration-200 hover:border-[#CFC3B6] hover:bg-[#EEE7DE]"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
