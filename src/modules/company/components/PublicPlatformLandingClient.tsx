"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useActionState,
  useEffect,
  
  useRef,
  useState,
  useTransition,
} from "react";
import {
  createCompanyContactRequest,
  type CreateCompanyContactRequestState,
} from "@/src/modules/company/actions/createCompanyContactRequest";
import { logCompanySearchEvent } from "@/src/modules/company/actions/logCompanySearchEvent";

type SearchItem = {
  id: string;
  name: string;
  slug: string;
  address: string;
  osbb_name: string | null;
  short_description: string | null;
  public_description: string | null;
  cover_image_path: string | null;
  cover_image_url: string | null;
  district: {
    id: string;
    name: string;
    slug: string;
    theme_color: string;
  } | null;
};

const initialRequestState: CreateCompanyContactRequestState = {
  error: null,
  successMessage: null,
};

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function getHouseWord(count: number) {
  if (count === 1) return "будинок";
  if (count >= 2 && count <= 4) return "будинки";
  return "будинків";
}

type ConnectHouseModalProps = {
  onClose: () => void;
};

function ConnectHouseModal({ onClose }: ConnectHouseModalProps) {
  const [requestState, requestAction, isRequestPending] = useActionState(
    createCompanyContactRequest,
    initialRequestState,
  );

  const isSuccess = Boolean(requestState.successMessage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="w-full max-w-3xl rounded-[32px] border border-[#e7dfd2] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Підключення будинку
            </h2>

            {!isSuccess ? (
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Залиште заявку, і ми зв’яжемося з вами для обговорення підключення
                будинку до платформи.
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Закрити"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
          >
            <CloseIcon />
          </button>
        </div>

        {!isSuccess ? (
          <form action={requestAction} className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Ваше ім’я
              </label>
              <input
                name="requesterName"
                type="text"
                className="h-12 w-full rounded-2xl border border-[#ddd3c1] bg-white px-4 text-slate-950 outline-none transition focus:border-slate-900"
                placeholder="Наприклад, Ірина"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                name="requesterEmail"
                type="email"
                className="h-12 w-full rounded-2xl border border-[#ddd3c1] bg-white px-4 text-slate-950 outline-none transition focus:border-slate-900"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Телефон
              </label>
              <input
                name="requesterPhone"
                type="text"
                className="h-12 w-full rounded-2xl border border-[#ddd3c1] bg-white px-4 text-slate-950 outline-none transition focus:border-slate-900"
                placeholder="+380..."
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Назва будинку
              </label>
              <input
                name="houseName"
                type="text"
                className="h-12 w-full rounded-2xl border border-[#ddd3c1] bg-white px-4 text-slate-950 outline-none transition focus:border-slate-900"
                placeholder="Назва будинку"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Назва ОСББ
              </label>
              <input
                name="osbbName"
                type="text"
                className="h-12 w-full rounded-2xl border border-[#ddd3c1] bg-white px-4 text-slate-950 outline-none transition focus:border-slate-900"
                placeholder="За наявності"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Адреса будинку
              </label>
              <input
                name="address"
                type="text"
                className="h-12 w-full rounded-2xl border border-[#ddd3c1] bg-white px-4 text-slate-950 outline-none transition focus:border-slate-900"
                placeholder="Місто, вулиця, номер будинку"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Коментар
              </label>
              <textarea
                name="comment"
                rows={4}
                className="w-full rounded-2xl border border-[#ddd3c1] bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-slate-900"
                placeholder="Коротко опишіть ваш запит"
              />
            </div>

            {requestState.error ? (
              <div className="sm:col-span-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {requestState.error}
              </div>
            ) : null}

            <div className="sm:col-span-2 pt-1">
              <button
                type="submit"
                disabled={isRequestPending}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {isRequestPending ? "Надсилаємо..." : "Надіслати заявку"}
              </button>
            </div>
          </form>
        ) : (
          <div className="py-8 sm:py-12">
            <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 px-6 py-8 text-center sm:px-8 sm:py-10">
              <h3 className="text-2xl font-semibold text-slate-950 sm:text-3xl">
                Дякуємо!
              </h3>

              <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Заявку надіслано. Ми зв’яжемося з вами для обговорення підключення
                будинку.
              </p>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                >
                  Закрити
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function PublicPlatformLandingClient() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [, startClickLog] = useTransition();
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (query.trim().length < 3) {
      setItems([]);
      setHasSearched(false);
      setIsLoading(false);
      return;
    }

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(async () => {
      try {
        setIsLoading(true);

        const response = await fetch(
          `/api/company/search-houses?q=${encodeURIComponent(query.trim())}`,
          { method: "GET" },
        );

        if (!response.ok) {
          throw new Error("Search failed");
        }

        const payload = (await response.json()) as { items: SearchItem[] };
        setItems(payload.items ?? []);
        setHasSearched(true);
      } catch (error) {
        console.error(error);
        setItems([]);
        setHasSearched(true);
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const showResults = !isLoading && hasSearched && items.length > 0;
  const showEmptyState = !isLoading && hasSearched && items.length === 0;

  function handleResultClick(item: SearchItem) {
    startClickLog(async () => {
      try {
        await logCompanySearchEvent({
          query: query.trim(),
          eventType: "result_click",
          matchedHouseId: item.id,
          matchedHouseSlug: item.slug,
          resultsCount: items.length,
          metadata: {
            source: "landing_search",
          },
        });
      } catch (error) {
        console.error(error);
      }
    });
  }

  return (
    <main className="min-h-screen bg-[#f7f4ee] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-[#e7dfd2] bg-[#f7f4ee]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Image
              src="/favicon.ico"
              alt="OSBB Platform"
              width={36}
              height={36}
              className="rounded-lg"
              priority
            />
            <span className="text-sm font-medium text-slate-900 sm:text-base">
              OSBB Platform
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsRegisterOpen(true)}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50 sm:px-5"
          >
            Підключити будинок
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6 sm:pb-12 sm:pt-8 lg:px-8 lg:pb-16">
        <div className="rounded-[32px] border border-[#e7dfd2] bg-white px-5 py-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:px-8 sm:py-10 lg:px-12 lg:py-12">
          <div className="mx-auto max-w-4xl">
            <div className="inline-flex rounded-full bg-[#eef4ec] px-3 py-1 text-sm font-medium text-emerald-700">
              OSBB Platform
            </div>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-7xl">
              Усе про ваш будинок
              <br className="hidden sm:block" />— в одному кабінеті
            </h1>

            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600 sm:text-xl">
              Знайдіть свій будинок за адресою, назвою ОСББ або назвою будинку та
              перейдіть до особистого кабінету.
            </p>

            <div className="mt-10">
              <label
                htmlFor="public-house-search"
                className="mb-3 block text-sm font-medium text-slate-700"
              >
                Пошук будинку
              </label>

              <div className="relative">
                <div className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
                  <SearchIcon />
                </div>

                <input
                  id="public-house-search"
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Введіть адресу, назву ОСББ, будинку або slug"
                  className="h-16 w-full rounded-[28px] border border-[#ddd3c1] bg-white pl-14 pr-5 text-lg text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900"
                />
              </div>

              <p className="mt-3 text-sm text-slate-500">
                Щоб побачити результат, введіть щонайменше 3 символи.
              </p>
            </div>
          </div>
        </div>

        {(isLoading || hasSearched) ? (
          <section className="mt-8">
            <div className="rounded-[32px] border border-[#e7dfd2] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.05)] sm:p-8">
              {isLoading ? (
                <div className="grid gap-5">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div
                      key={index}
                      className="overflow-hidden rounded-[28px] border border-[#e7dfd2] bg-white"
                    >
                      <div className="h-56 animate-pulse bg-slate-200" />
                      <div className="space-y-3 p-6">
                        <div className="h-7 w-2/3 animate-pulse rounded bg-slate-200" />
                        <div className="h-5 w-5/6 animate-pulse rounded bg-slate-200" />
                        <div className="h-12 w-44 animate-pulse rounded-2xl bg-slate-200" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {showResults ? (
                <div>
                  <div className="mb-6 text-xl font-semibold text-slate-950 sm:text-2xl">
                    За запитом “{query}” знайдено {items.length} {getHouseWord(items.length)}
                  </div>

                  <div className="flex flex-col gap-5">
                    {items.map((item) => (
                      <article
                        key={item.id}
                        className="overflow-hidden rounded-[28px] border border-[#e7dfd2] bg-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
                      >
                        <div className="relative aspect-[16/7] bg-[#f3efe8]">
                          {item.cover_image_url ? (
                            <Image
                              src={item.cover_image_url}
                              alt={item.name}
                              fill
                              sizes="100vw"
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                              Фото будинку буде додано пізніше
                            </div>
                          )}
                        </div>

                        <div className="p-6 sm:p-8">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <h3 className="text-2xl font-semibold text-slate-950 sm:text-3xl">
                                {item.name}
                              </h3>

                              <p className="mt-3 text-base leading-7 text-slate-600 sm:text-lg">
                                {item.address}
                              </p>

                              {item.osbb_name ? (
                                <p className="mt-2 text-sm text-slate-500 sm:text-base">
                                  ОСББ: {item.osbb_name}
                                </p>
                              ) : null}
                            </div>

                            {item.district ? (
                              <span
                                className="inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-medium text-white"
                                style={{ backgroundColor: item.district.theme_color }}
                              >
                                {item.district.name}
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-6">
                            <Link
                              href={`/house/${item.slug}`}
                              onClick={() => handleResultClick(item)}
                              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                            >
                              Перейти в кабінет
                            </Link>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}

              {showEmptyState ? (
                <div className="rounded-[28px] border border-dashed border-[#ddd3c1] bg-[#fbfaf7] px-6 py-12 text-center sm:px-10 sm:py-16">
                  <h3 className="text-2xl font-semibold text-slate-950 sm:text-3xl">
                    Будинок не знайдено
                  </h3>

                  <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                    Можливо, ви ввели дані з помилкою або такого будинку ще немає в системі.
                    Спробуйте уточнити запит або залиште заявку на підключення.
                  </p>

                  <div className="mt-8">
                    <button
                      type="button"
                      onClick={() => setIsRegisterOpen(true)}
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                    >
                      Підключити будинок
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
      </section>

      {isRegisterOpen ? (
        <ConnectHouseModal onClose={() => setIsRegisterOpen(false)} />
      ) : null}
    </main>
  );
}
