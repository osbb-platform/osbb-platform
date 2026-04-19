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
      <div className="overflow-hidden rounded-[32px] border border-[var(--border)] bg-white shadow-sm">
        <div className="grid min-h-[280px] sm:min-h-[420px] lg:grid-cols-2">
          <div className="relative min-h-[280px] bg-slate-100">
            {coverImageUrl ? (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url("${coverImageUrl}")` }}
              />
            ) : null}
          </div>

          <div className="flex flex-col justify-between p-4 sm:p-8">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                {publishedAt}
              </div>

              <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950 sm:mt-4 sm:text-3xl">
                {headline}
              </h2>

              <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 sm:mt-6 sm:text-base sm:leading-8">
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
                        ? "bg-slate-900"
                        : "bg-slate-300"
                    }`}
                    aria-label={`Перейти до матеріалу ${index + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goPrev}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-lg text-slate-900 transition hover:bg-slate-100"
                >
                  ←
                </button>

                <button
                  type="button"
                  onClick={goNext}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-lg text-slate-900 transition hover:bg-slate-100"
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
