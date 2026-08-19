"use client";

import {
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  initOnlineBallot,
} from "@/src/modules/houses/resident/initOnlineBallot";

type VoteChoice =
  | "for"
  | "against"
  | "abstained";

type Question = {
  id: string;
  title: string;
  description: string;
};

type Apartment = {
  id: string;
  label: string;
};

type QuestionResult = {
  questionId: string;
  forAreaM2: number;
  againstAreaM2: number;
  abstainedAreaM2: number;
  participatingAreaM2: number;
  forPercent: number;
  againstPercent: number;
  abstainedPercent: number;
};

type ApartmentResult = {
  apartmentId: string;
  apartmentAreaM2: number;
  confirmedAreaM2: number;
  remainingAreaM2: number;
  status:
    | "not_voted"
    | "partially"
    | "fully";
};

type Aggregation = {
  totalHouseAreaM2: number;
  confirmedAreaM2: number;
  participationPercent: number;
  questions: QuestionResult[];
  apartments: ApartmentResult[];
};

type Props = {
  slug: string;
  meetingId: string;
  isActive: boolean;
  questions: Question[];
  apartments: Apartment[];
  aggregation: Aggregation | null;
};

function formatArea(value: number) {
  return new Intl.NumberFormat(
    "uk-UA",
    {
      minimumFractionDigits:
        Number.isInteger(value) ? 0 : 1,
      maximumFractionDigits: 2,
    },
  ).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat(
    "uk-UA",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  ).format(value);
}

function normalizeAreaInput(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "")
    .replace(",", ".");
}

function apartmentStatusLabel(
  status: ApartmentResult["status"],
) {
  if (status === "fully") {
    return "Повністю проголосовано";
  }

  if (status === "partially") {
    return "Частково проголосовано";
  }

  return "Ще не голосували";
}

function statusClasses(
  status: ApartmentResult["status"],
) {
  if (status === "fully") {
    return "border-[var(--pub-success-border)] bg-[var(--pub-success-bg)] text-[var(--pub-success-text)]";
  }

  if (status === "partially") {
    return "border-[var(--pub-border-strong)] bg-[var(--pub-bg-quiet)] text-[var(--pub-text)]";
  }

  return "border-[var(--pub-border)] bg-[var(--pub-surface)] text-[var(--pub-text-muted)]";
}

export function PublicOnlineMeetingVoting({
  slug,
  meetingId,
  isActive,
  questions,
  apartments,
  aggregation,
}: Props) {
  const [selectedApartmentId, setSelectedApartmentId] =
    useState("");

  const [ownedArea, setOwnedArea] =
    useState("");

  const [answers, setAnswers] =
    useState<Record<string, VoteChoice>>({});

  const [error, setError] =
    useState<string | null>(null);

  const [isPending, startTransition] =
    useTransition();

  const apartmentStats = useMemo(
    () =>
      new Map(
        (aggregation?.apartments ?? []).map(
          (item) => [
            item.apartmentId,
            item,
          ],
        ),
      ),
    [aggregation],
  );

  const availableApartments = useMemo(
    () =>
      apartments.filter((apartment) => {
        const stats =
          apartmentStats.get(apartment.id);

        return stats?.status !== "fully";
      }),
    [apartments, apartmentStats],
  );

  const selectedStats =
    selectedApartmentId
      ? apartmentStats.get(
          selectedApartmentId,
        ) ?? null
      : null;

  const allQuestionsAnswered =
    questions.length > 0 &&
    questions.every(
      (question) =>
        Boolean(answers[question.id]),
    );

  const parsedArea = Number(
    normalizeAreaInput(ownedArea),
  );

  const validArea =
    Number.isFinite(parsedArea) &&
    parsedArea > 0 &&
    Boolean(selectedStats) &&
    parsedArea <=
      (selectedStats?.remainingAreaM2 ?? 0);

  function setAnswer(
    questionId: string,
    choice: VoteChoice,
  ) {
    setAnswers((current) => ({
      ...current,
      [questionId]: choice,
    }));

    setError(null);
  }

  function submit() {
    setError(null);

    if (!aggregation) {
      setError(
        "Дані про площі голосування тимчасово недоступні.",
      );
      return;
    }

    if (
      !selectedApartmentId ||
      !selectedStats
    ) {
      setError(
        "Оберіть квартиру.",
      );
      return;
    }

    if (!validArea) {
      setError(
        `Вкажіть вашу площу в межах доступного залишку — до ${formatArea(
          selectedStats.remainingAreaM2,
        )} м².`,
      );
      return;
    }

    if (!allQuestionsAnswered) {
      setError(
        "Дайте відповідь на кожне питання зборів.",
      );
      return;
    }

    startTransition(() => {
      void (async () => {
        const result =
          await initOnlineBallot({
            slug,
            meetingId,
            apartmentId:
              selectedApartmentId,
            ownedAreaM2: parsedArea,
            answers: questions.map(
              (question) => ({
                questionId:
                  question.id,
                choice:
                  answers[question.id]!,
              }),
            ),
          });

        if (!result.ok) {
          setError(result.message);
          return;
        }

        const target =
          result.redirectUrl ??
          result.deepLink;

        if (!target) {
          setError(
            "Не вдалося відкрити підтвердження через Дію.",
          );
          return;
        }

        window.location.assign(target);
      })();
    });
  }

  return (
    <div className="mt-5 grid gap-4">
      <section className="rounded-[var(--r-xl)] border border-[var(--pub-border-strong)] bg-[var(--pub-bg-quiet)] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--pub-text-soft)]">
              Онлайн-голосування
            </div>

            <div className="mt-1 text-sm leading-6 text-[var(--pub-text-muted)]">
              Голоси рахуються за площею частки співвласника.
            </div>
          </div>

          {aggregation ? (
            <div className="rounded-[var(--r-pill)] border border-[var(--pub-border)] bg-[var(--pub-surface)] px-4 py-2 text-sm font-semibold text-[var(--pub-text)]">
              Участь:{" "}
              {formatPercent(
                aggregation.participationPercent,
              )}
              %
            </div>
          ) : null}
        </div>

        {aggregation ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[var(--r-lg)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-3">
              <div className="text-xs text-[var(--pub-text-soft)]">
                Площа будинку
              </div>
              <div className="mt-1 font-semibold text-[var(--pub-text)]">
                {formatArea(
                  aggregation.totalHouseAreaM2,
                )}{" "}
                м²
              </div>
            </div>

            <div className="rounded-[var(--r-lg)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-3">
              <div className="text-xs text-[var(--pub-text-soft)]">
                Підтверджено голосів
              </div>
              <div className="mt-1 font-semibold text-[var(--pub-text)]">
                {formatArea(
                  aggregation.confirmedAreaM2,
                )}{" "}
                м²
              </div>
            </div>

            <div className="rounded-[var(--r-lg)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-3">
              <div className="text-xs text-[var(--pub-text-soft)]">
                Участь у зборах
              </div>
              <div className="mt-1 font-semibold text-[var(--pub-text)]">
                {formatPercent(
                  aggregation.participationPercent,
                )}
                %
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-[var(--r-lg)] border border-dashed border-[var(--pub-border-strong)] p-4 text-sm leading-6 text-[var(--pub-text-muted)]">
            Дані про площі онлайн-голосування тимчасово недоступні.
          </div>
        )}
      </section>

      {aggregation?.questions.length ? (
        <section className="rounded-[var(--r-xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-4 sm:p-5">
          <div className="text-sm font-semibold text-[var(--pub-text)]">
            Поточні результати за площею
          </div>

          <div className="mt-4 grid gap-3">
            {questions.map((question) => {
              const result =
                aggregation.questions.find(
                  (item) =>
                    item.questionId ===
                    question.id,
                );

              if (!result) {
                return null;
              }

              return (
                <div
                  key={question.id}
                  className="rounded-[var(--r-lg)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] p-4"
                >
                  <div className="font-medium text-[var(--pub-text)]">
                    {question.title}
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-[var(--r-md)] border border-[var(--pub-success-border)] bg-[var(--pub-success-bg)] p-3 text-xs text-[var(--pub-success-text)]">
                      За:{" "}
                      {formatArea(
                        result.forAreaM2,
                      )}{" "}
                      м² ·{" "}
                      {formatPercent(
                        result.forPercent,
                      )}
                      %
                    </div>

                    <div className="rounded-[var(--r-md)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-3 text-xs text-[var(--pub-text-muted)]">
                      Проти:{" "}
                      {formatArea(
                        result.againstAreaM2,
                      )}{" "}
                      м² ·{" "}
                      {formatPercent(
                        result.againstPercent,
                      )}
                      %
                    </div>

                    <div className="rounded-[var(--r-md)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-3 text-xs text-[var(--pub-text-muted)]">
                      Утримались:{" "}
                      {formatArea(
                        result.abstainedAreaM2,
                      )}{" "}
                      м² ·{" "}
                      {formatPercent(
                        result.abstainedPercent,
                      )}
                      %
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {aggregation?.apartments.length ? (
        <section className="rounded-[var(--r-xl)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-4 sm:p-5">
          <div className="text-sm font-semibold text-[var(--pub-text)]">
            Статус квартир
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {apartments.map((apartment) => {
              const stats =
                apartmentStats.get(
                  apartment.id,
                );

              if (!stats) {
                return null;
              }

              return (
                <div
                  key={apartment.id}
                  className={`rounded-[var(--r-lg)] border p-3 ${statusClasses(
                    stats.status,
                  )}`}
                >
                  <div className="font-medium">
                    {apartment.label}
                  </div>

                  <div className="mt-1 text-xs opacity-80">
                    {apartmentStatusLabel(
                      stats.status,
                    )}
                  </div>

                  <div className="mt-2 text-xs opacity-80">
                    {formatArea(
                      stats.confirmedAreaM2,
                    )}{" "}
                    /{" "}
                    {formatArea(
                      stats.apartmentAreaM2,
                    )}{" "}
                    м²
                  </div>

                  {stats.status !== "fully" ? (
                    <div className="mt-1 text-xs opacity-80">
                      Залишок:{" "}
                      {formatArea(
                        stats.remainingAreaM2,
                      )}{" "}
                      м²
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {isActive ? (
        <section className="rounded-[var(--r-xl)] border border-[var(--pub-accent)] bg-[var(--pub-surface)] p-4 shadow-[var(--pub-shadow-sm)] sm:p-5">
          <div className="text-lg font-semibold text-[var(--pub-text)]">
            Ваш голос
          </div>

          <p className="mt-2 text-sm leading-6 text-[var(--pub-text-muted)]">
            Оберіть квартиру, вкажіть площу вашої частки та дайте одну відповідь на кожне питання. Після цього підтвердьте особу через Дію.
          </p>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-[var(--pub-text)]">
                Квартира
              </span>

              <select
                value={
                  selectedApartmentId
                }
                onChange={(event) => {
                  setSelectedApartmentId(
                    event.target.value,
                  );
                  setOwnedArea("");
                  setError(null);
                }}
                disabled={
                  isPending ||
                  !aggregation
                }
                className="h-12 w-full rounded-[var(--r-lg)] border border-[var(--pub-border-strong)] bg-[var(--pub-surface-elevated)] px-4 text-sm text-[var(--pub-text)] outline-none focus:border-[var(--pub-accent)]"
              >
                <option value="">
                  Оберіть квартиру
                </option>

                {availableApartments.map(
                  (apartment) => (
                    <option
                      key={apartment.id}
                      value={apartment.id}
                    >
                      {apartment.label}
                    </option>
                  ),
                )}
              </select>
            </label>

            {selectedStats ? (
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-[var(--r-lg)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] p-3">
                  <div className="text-xs text-[var(--pub-text-soft)]">
                    Загальна площа
                  </div>
                  <div className="mt-1 font-semibold text-[var(--pub-text)]">
                    {formatArea(
                      selectedStats.apartmentAreaM2,
                    )}{" "}
                    м²
                  </div>
                </div>

                <div className="rounded-[var(--r-lg)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] p-3">
                  <div className="text-xs text-[var(--pub-text-soft)]">
                    Вже підтверджено
                  </div>
                  <div className="mt-1 font-semibold text-[var(--pub-text)]">
                    {formatArea(
                      selectedStats.confirmedAreaM2,
                    )}{" "}
                    м²
                  </div>
                </div>

                <div className="rounded-[var(--r-lg)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] p-3">
                  <div className="text-xs text-[var(--pub-text-soft)]">
                    Доступний залишок
                  </div>
                  <div className="mt-1 font-semibold text-[var(--pub-text)]">
                    {formatArea(
                      selectedStats.remainingAreaM2,
                    )}{" "}
                    м²
                  </div>
                </div>
              </div>
            ) : null}

            <label className="grid gap-2">
              <span className="text-sm font-medium text-[var(--pub-text)]">
                Площа вашої частки, м²
              </span>

              <input
                type="text"
                inputMode="decimal"
                value={ownedArea}
                onChange={(event) => {
                  setOwnedArea(
                    event.target.value,
                  );
                  setError(null);
                }}
                disabled={
                  isPending ||
                  !selectedStats
                }
                placeholder={
                  selectedStats
                    ? `До ${formatArea(
                        selectedStats.remainingAreaM2,
                      )} м²`
                    : "Спочатку оберіть квартиру"
                }
                className="h-12 w-full rounded-[var(--r-lg)] border border-[var(--pub-border-strong)] bg-[var(--pub-surface-elevated)] px-4 text-sm text-[var(--pub-text)] outline-none placeholder:text-[var(--pub-text-soft)] focus:border-[var(--pub-accent)]"
              />
            </label>

            <div className="grid gap-3">
              {questions.map(
                (question, index) => (
                  <fieldset
                    key={question.id}
                    className="rounded-[var(--r-lg)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] p-4"
                  >
                    <legend className="px-1 text-sm font-semibold text-[var(--pub-text)]">
                      {index + 1}.{" "}
                      {question.title}
                    </legend>

                    {question.description ? (
                      <p className="mt-2 text-sm leading-6 text-[var(--pub-text-muted)]">
                        {question.description}
                      </p>
                    ) : null}

                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {(
                        [
                          [
                            "for",
                            "За",
                          ],
                          [
                            "against",
                            "Проти",
                          ],
                          [
                            "abstained",
                            "Утримуюсь",
                          ],
                        ] as const
                      ).map(
                        ([
                          choice,
                          label,
                        ]) => (
                          <label
                            key={choice}
                            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--r-md)] border border-[var(--pub-border)] bg-[var(--pub-surface)] px-3 text-sm text-[var(--pub-text)]"
                          >
                            <input
                              type="radio"
                              name={`question-${question.id}`}
                              value={choice}
                              checked={
                                answers[
                                  question
                                    .id
                                ] ===
                                choice
                              }
                              disabled={
                                isPending
                              }
                              onChange={() =>
                                setAnswer(
                                  question.id,
                                  choice,
                                )
                              }
                            />
                            {label}
                          </label>
                        ),
                      )}
                    </div>
                  </fieldset>
                ),
              )}
            </div>

            {error ? (
              <div
                role="alert"
                className="rounded-[var(--r-lg)] border border-[var(--pub-danger-border)] bg-[var(--pub-danger-bg)] p-4 text-sm leading-6 text-[var(--pub-danger-text)]"
              >
                {error}
              </div>
            ) : null}

            <div className="rounded-[var(--r-lg)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] p-4 text-xs leading-6 text-[var(--pub-text-muted)]">
              Після натискання ви перейдете до підтвердження через Дію. Платформа не зберігає паспортні дані або сирі персональні дані з Дії.
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={
                isPending ||
                !aggregation
              }
              className="inline-flex min-h-12 items-center justify-center rounded-[var(--r-pill)] bg-[var(--pub-accent)] px-6 text-sm font-semibold text-[var(--pub-accent-contrast)] shadow-[var(--pub-shadow-sm)] transition hover:brightness-[1.04] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending
                ? "Готуємо підтвердження…"
                : "Підтвердити через Дію"}
            </button>
          </div>
        </section>
      ) : (
        <div className="rounded-[var(--r-lg)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] p-4 text-sm text-[var(--pub-text-muted)]">
          Онлайн-голосування для цих зборів зараз закрите. Результати вище залишаються доступними.
        </div>
      )}
    </div>
  );
}
