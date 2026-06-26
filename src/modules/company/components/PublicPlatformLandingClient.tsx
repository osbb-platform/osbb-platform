// ════════════════════════════════════════════════════════════════════════
// src/modules/company/components/PublicPlatformLandingClient.tsx
// Блок 3 · Розвідний лендінг головного домену.
//
// ПОВНА ПЕРЕРОБКА ВИГЛЯДУ; уся логіка — 1-в-1 (резолв дому, пошук, debounce,
// logCompanySearchEvent, houseUrl, createCompanyContactRequest, імена полів,
// імена експортів). Платформений рівень → акцент нейтральний брендовий;
// КРІМ бейджа району в картці результату — там колір конкретного дому.
//
// Оформлення лише через токени --pub-* і примітиви @/src/shared/ui/public.
// ════════════════════════════════════════════════════════════════════════
"use client";

import { houseUrl } from "@/src/shared/config/app/domains";
import Image from "next/image";
import Link from "next/link";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import type { CSSProperties } from "react";
import {
  createCompanyContactRequest,
  type CreateCompanyContactRequestState,
} from "@/src/modules/company/actions/createCompanyContactRequest";
import { logCompanySearchEvent } from "@/src/modules/company/actions/logCompanySearchEvent";
import {
  PubButton,
  PubCard,
  PubEmptyState,
  PubFormField,
  PubInput,
  PubModal,
  PubSkeleton,
  PubTextarea,
} from "@/src/shared/ui/public";
import { PubIcon } from "@/src/shared/ui/public/PublicIcons";

// Нейтральний бренд-акцент платформи (немає дому → немає кольору району).
const PLATFORM_ACCENT = "#16a34a";

const platformThemeStyle = {
  ["--pub-accent" as string]: PLATFORM_ACCENT,
  ["--pub-accent-contrast" as string]: "#ffffff",
} as CSSProperties;

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
    <PubModal
      open
      onClose={onClose}
      eyebrow="OSBB Platform"
      title="Підключення будинку"
      size="lg"
      disableOverlayClose={isRequestPending}
    >
      {!isSuccess ? (
        <form action={requestAction} className="grid gap-5">
          <p className="text-[15px] leading-7 text-[var(--pub-text-muted)]">
            Залиште заявку, і ми зв’яжемося з вами для обговорення підключення
            будинку до платформи.
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            <PubFormField label="Ваше ім’я">
              {(id) => (
                <PubInput
                  id={id}
                  name="requesterName"
                  type="text"
                  placeholder="Наприклад, Ірина"
                />
              )}
            </PubFormField>

            <PubFormField label="Email">
              {(id) => (
                <PubInput
                  id={id}
                  name="requesterEmail"
                  type="email"
                  placeholder="you@example.com"
                />
              )}
            </PubFormField>

            <PubFormField label="Телефон">
              {(id) => (
                <PubInput
                  id={id}
                  name="requesterPhone"
                  type="text"
                  placeholder="+380..."
                />
              )}
            </PubFormField>

            <PubFormField label="Назва будинку">
              {(id) => (
                <PubInput
                  id={id}
                  name="houseName"
                  type="text"
                  placeholder="Назва будинку"
                />
              )}
            </PubFormField>

            <PubFormField label="Назва ОСББ">
              {(id) => (
                <PubInput
                  id={id}
                  name="osbbName"
                  type="text"
                  placeholder="За наявності"
                />
              )}
            </PubFormField>

            <PubFormField label="Адреса будинку">
              {(id) => (
                <PubInput
                  id={id}
                  name="address"
                  type="text"
                  placeholder="Місто, вулиця, номер будинку"
                />
              )}
            </PubFormField>

            <PubFormField label="Коментар" className="sm:col-span-2">
              {(id) => (
                <PubTextarea
                  id={id}
                  name="comment"
                  rows={4}
                  placeholder="Коротко опишіть ваш запит"
                />
              )}
            </PubFormField>
          </div>

          {requestState.error ? (
            <div
              role="alert"
              className="rounded-[var(--r-lg)] border border-[var(--pub-danger-border)] bg-[var(--pub-danger-bg)] px-4 py-3 text-sm font-medium text-[var(--pub-danger-text)]"
            >
              {requestState.error}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
            <PubButton type="button" variant="secondary" onClick={onClose}>
              Скасувати
            </PubButton>
            <PubButton type="submit" variant="primary" loading={isRequestPending}>
              {isRequestPending ? "Надсилаємо..." : "Надіслати заявку"}
            </PubButton>
          </div>
        </form>
      ) : (
        <div className="py-2 text-center">
          <div className="flex justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-[var(--r-pill)] bg-[var(--pub-success-bg)] text-[var(--pub-success-text)]">
              <PubIcon name="check" className="h-7 w-7" />
            </span>
          </div>

          <h3 className="mt-4 font-[var(--font-serif)] text-[24px] font-semibold text-[var(--pub-text)]">
            Дякуємо!
          </h3>

          <p className="mx-auto mt-3 max-w-md text-[15px] leading-7 text-[var(--pub-text-muted)]">
            Заявку надіслано. Ми зв’яжемося з вами для обговорення підключення
            будинку.
          </p>

          <div className="mt-7 flex justify-center">
            <PubButton variant="primary" onClick={onClose}>
              Закрити
            </PubButton>
          </div>
        </div>
      )}
    </PubModal>
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
    <div
      className="pub-theme-root"
      data-house-theme="light"
      style={platformThemeStyle}
    >
      <main className="min-h-[100dvh] bg-[var(--pub-bg)] text-[var(--pub-text)]">
        {/* ── Шапка ── */}
        <header className="sticky top-0 z-30 border-b border-[var(--pub-border)] bg-[var(--pub-header-bg)]/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--r-lg)] bg-[var(--pub-accent)] font-[var(--font-serif)] text-[18px] font-semibold leading-none text-[var(--pub-accent-contrast)] shadow-[var(--pub-shadow-sm)]">
                О
              </span>
              <span className="font-[var(--font-serif)] text-[17px] font-semibold tracking-[-0.01em] text-[var(--pub-text)] sm:text-lg">
                OSBB Platform
              </span>
            </div>

            <PubButton
              variant="primary"
              size="sm"
              onClick={() => setIsRegisterOpen(true)}
            >
              Підключити будинок
            </PubButton>
          </div>
        </header>

        <section className="mx-auto max-w-6xl px-4 pb-12 pt-7 sm:px-6 sm:pb-14 sm:pt-9 lg:px-8 lg:pb-20">
          {/* ── Hero + пошук ── */}
          <PubCard
            elevated
            elevation="lg"
            padding="none"
            className="rounded-[var(--r-3xl)] px-5 py-9 sm:px-8 sm:py-11 lg:px-14 lg:py-14"
          >
            <div className="mx-auto max-w-4xl">
              <div className="inline-flex items-center rounded-[var(--r-pill)] border border-[var(--pub-accent-border)] bg-[var(--pub-accent-soft)] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--pub-accent-strong)]">
                OSBB Platform
              </div>

              <h1 className="mt-5 font-[var(--font-serif)] text-[36px] font-semibold leading-[1.05] tracking-[-0.02em] text-[var(--pub-text)] sm:text-5xl lg:text-[68px]">
                Усе про ваш будинок
                <br className="hidden sm:block" />— в одному кабінеті
              </h1>

              <p className="mt-5 max-w-3xl text-[17px] leading-8 text-[var(--pub-text-muted)] sm:text-xl">
                Знайдіть свій будинок за адресою, назвою ОСББ або назвою будинку
                та перейдіть до особистого кабінету.
              </p>

              <div className="mt-9">
                <label
                  htmlFor="public-house-search"
                  className="mb-3 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--pub-text-soft)]"
                >
                  Пошук будинку
                </label>

                <PubInput
                  id="public-house-search"
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Введіть адресу, назву ОСББ, будинку або slug"
                  leftIcon={<PubIcon name="search" className="h-5 w-5" />}
                  className="h-16 rounded-[var(--r-2xl)] !pl-14 text-base sm:text-lg"
                />

                <p className="mt-3 text-[13px] text-[var(--pub-text-soft)]">
                  Щоб побачити результат, введіть щонайменше 3 символи.
                </p>
              </div>
            </div>
          </PubCard>

          {/* ── Результати / стани ── */}
          {isLoading || hasSearched ? (
            <div className="mt-8">
              {isLoading ? (
                <div className="grid gap-5">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <PubCard
                      key={index}
                      elevated
                      elevation="sm"
                      padding="none"
                      className="overflow-hidden rounded-[var(--r-3xl)]"
                    >
                      <PubSkeleton
                        variant="block"
                        width="100%"
                        height={208}
                        className="rounded-none"
                      />
                      <div className="space-y-3 p-6">
                        <PubSkeleton variant="block" width="66%" height={28} />
                        <PubSkeleton variant="block" width="83%" height={20} />
                        <PubSkeleton
                          variant="block"
                          width={176}
                          height={48}
                          className="rounded-[var(--r-pill)]"
                        />
                      </div>
                    </PubCard>
                  ))}
                </div>
              ) : null}

              {showResults ? (
                <div>
                  <div className="mb-6 text-[15px] text-[var(--pub-text-muted)]">
                    За запитом{" "}
                    <span className="font-semibold text-[var(--pub-text)]">
                      «{query}»
                    </span>{" "}
                    знайдено{" "}
                    <span className="font-semibold text-[var(--pub-text)]">
                      {items.length} {getHouseWord(items.length)}
                    </span>
                  </div>

                  <div className="flex flex-col gap-5">
                    {items.map((item) => (
                      <PubCard
                        key={item.id}
                        elevated
                        elevation="md"
                        padding="none"
                        interactive
                        className="overflow-hidden rounded-[var(--r-3xl)]"
                      >
                        <div className="relative aspect-[16/7] bg-[var(--pub-bg-quiet)]">
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
                            <div className="flex h-full w-full items-center justify-center text-sm text-[var(--pub-text-soft)]">
                              Фото будинку буде додано пізніше
                            </div>
                          )}
                        </div>

                        <div className="p-6 sm:p-8">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <h3 className="font-[var(--font-serif)] text-[24px] font-semibold leading-tight text-[var(--pub-text)] sm:text-[28px]">
                                {item.name}
                              </h3>

                              <p className="mt-3 text-[15px] leading-7 text-[var(--pub-text-muted)] sm:text-base">
                                {item.address}
                              </p>

                              {item.osbb_name ? (
                                <p className="mt-2 text-[13px] text-[var(--pub-text-soft)] sm:text-sm">
                                  ОСББ: {item.osbb_name}
                                </p>
                              ) : null}
                            </div>

                            {/* Бейдж району — колір конкретного дому (доречно тут). */}
                            {item.district ? (
                              <span
                                className="inline-flex shrink-0 items-center rounded-[var(--r-pill)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white"
                                style={{
                                  backgroundColor: item.district.theme_color,
                                }}
                              >
                                {item.district.name}
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-6">
                            <Link
                              href={houseUrl(item.slug)}
                              onClick={() => handleResultClick(item)}
                            >
                              <PubButton
                                variant="primary"
                                rightIcon={
                                  <PubIcon
                                    name="chevron-right"
                                    className="h-5 w-5"
                                  />
                                }
                              >
                                Перейти в кабінет
                              </PubButton>
                            </Link>
                          </div>
                        </div>
                      </PubCard>
                    ))}
                  </div>
                </div>
              ) : null}

              {showEmptyState ? (
                <PubEmptyState
                  icon={<PubIcon name="search" className="h-7 w-7" />}
                  title="Будинок не знайдено"
                  description="Можливо, ви ввели дані з помилкою або такого будинку ще немає в системі. Спробуйте уточнити запит або зверніться до голови ОСББ."
                  action={
                    <PubButton
                      variant="primary"
                      onClick={() => setIsRegisterOpen(true)}
                    >
                      Підключити будинок
                    </PubButton>
                  }
                  className="rounded-[var(--r-3xl)] py-14"
                />
              ) : null}
            </div>
          ) : null}
        </section>
      </main>

      {isRegisterOpen ? (
        <ConnectHouseModal onClose={() => setIsRegisterOpen(false)} />
      ) : null}
    </div>
  );
}

export { ConnectHouseModal };
