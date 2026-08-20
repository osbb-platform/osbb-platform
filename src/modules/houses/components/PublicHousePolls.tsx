"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import type { PollAnswerInput } from "@/src/modules/houses/resident/pollsRepository";
import { getResidentPollResults } from "@/src/modules/houses/resident/getResidentPollResults";
import { submitPollAnswers } from "@/src/modules/houses/resident/submitPollAnswers";
import type {
  PollResultsReadModel,
  PollResultQuestion,
} from "@/src/modules/houses/services/pollResultsModel";
import type {
  PublishedHousePoll,
  PublishedPollQuestion,
} from "@/src/modules/houses/services/getPublishedHousePolls";

type ApartmentOption = {
  id: string;
  label: string;
  ownerName: string;
};

type Props = {
  slug: string;
  polls: PublishedHousePoll[];
  apartments: ApartmentOption[];
};

type DraftValue =
  | string
  | boolean
  | number
  | string[]
  | undefined;

function publicApartmentLabel(label: string) {
  const trimmed = label.trim();
  const withoutPrefix = trimmed.replace(/^кв\.?\s*/i, "").trim();
  const withoutOwner = withoutPrefix.replace(/\s+—.*$/u, "").trim();

  return withoutOwner || withoutPrefix || trimmed;
}

function pollStatusLabel(status: PublishedHousePoll["pollStatus"]) {
  if (status === "active") return "Триває";
  if (status === "completed") return "Завершено";
  return "Опубліковано";
}

function identityLabel(identity: PublishedHousePoll["identityMode"]) {
  return identity === "anonymous" ? "Анонімне" : "Відкрите";
}

function visibilityCopy(
  visibility: PublishedHousePoll["resultsVisibility"],
) {
  if (visibility === "immediate") {
    return "Результати відкриються після вашої відповіді.";
  }

  if (visibility === "after_completion") {
    return "Результати відкриються після завершення опитування.";
  }

  return "Результати доступні лише адміністрації.";
}

function visibilityReasonCopy(
  reason: PollResultsReadModel["visibilityReason"],
) {
  if (reason === "RESPOND_FIRST") {
    return "Щоб побачити поточні результати, спочатку дайте власну відповідь.";
  }

  if (reason === "UNTIL_COMPLETION") {
    return "Результати будуть доступні мешканцям після завершення опитування.";
  }

  if (reason === "HIDDEN") {
    return "Адміністратор приховав результати цього опитування від мешканців.";
  }

  return "";
}

function questionHasAnswer(
  question: PublishedPollQuestion,
  value: DraftValue,
) {
  if (question.questionType === "multiple_choice") {
    return Array.isArray(value) && value.length > 0;
  }

  if (question.questionType === "yes_no") {
    return typeof value === "boolean";
  }

  if (question.questionType === "scale") {
    return typeof value === "number";
  }

  return typeof value === "string" && value.trim().length > 0;
}

function buildAnswer(
  question: PublishedPollQuestion,
  value: DraftValue,
): PollAnswerInput | null {
  if (!questionHasAnswer(question, value)) {
    return null;
  }

  if (
    question.questionType === "single_choice" &&
    typeof value === "string"
  ) {
    return {
      questionId: question.id,
      optionId: value,
    };
  }

  if (
    question.questionType === "multiple_choice" &&
    Array.isArray(value)
  ) {
    return {
      questionId: question.id,
      optionIds: value,
    };
  }

  if (
    question.questionType === "yes_no" &&
    typeof value === "boolean"
  ) {
    return {
      questionId: question.id,
      value,
    };
  }

  if (
    question.questionType === "scale" &&
    typeof value === "number"
  ) {
    return {
      questionId: question.id,
      value,
    };
  }

  if (
    question.questionType === "free_text" &&
    typeof value === "string"
  ) {
    return {
      questionId: question.id,
      value: value.trim(),
    };
  }

  return null;
}

function ResultQuestion({
  question,
}: {
  question: PollResultQuestion;
}) {
  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--pub-border)] bg-[var(--pub-surface)] p-4">
      <div className="font-semibold text-[var(--pub-text)]">
        {question.question}
      </div>

      {question.options.length > 0 ? (
        <div className="mt-3 space-y-2">
          {question.options.map((option) => (
            <div
              key={option.id}
              className="flex items-center justify-between gap-3 rounded-[var(--r-md)] bg-[var(--pub-bg-quiet)] px-3 py-2 text-sm"
            >
              <span>{option.label}</span>
              <strong>{option.count}</strong>
            </div>
          ))}
        </div>
      ) : null}

      {question.yesNo ? (
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-[var(--r-md)] bg-[var(--pub-bg-quiet)] px-3 py-2">
            Так: <strong>{question.yesNo.yes}</strong>
          </div>
          <div className="rounded-[var(--r-md)] bg-[var(--pub-bg-quiet)] px-3 py-2">
            Ні: <strong>{question.yesNo.no}</strong>
          </div>
        </div>
      ) : null}

      {question.scale ? (
        <div className="mt-3">
          <div className="text-sm text-[var(--pub-text-muted)]">
            Середня оцінка:{" "}
            <strong className="text-[var(--pub-text)]">
              {question.scale.average === null
                ? "—"
                : question.scale.average.toFixed(2)}
            </strong>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {question.scale.distribution.map((item) => (
              <span
                key={item.value}
                className="rounded-[var(--r-pill)] bg-[var(--pub-bg-quiet)] px-3 py-1 text-xs text-[var(--pub-text)]"
              >
                {item.value}: {item.count}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {question.freeText ? (
        <div className="mt-3 text-sm text-[var(--pub-text-muted)]">
          Текстових відповідей:{" "}
          <strong className="text-[var(--pub-text)]">
            {question.freeText.count}
          </strong>
        </div>
      ) : null}
    </div>
  );
}

function PollCard({
  slug,
  apartmentId,
  poll,
}: {
  slug: string;
  apartmentId: string;
  poll: PublishedHousePoll;
}) {
  const [isPending, startTransition] = useTransition();
  const [answers, setAnswers] = useState<Record<string, DraftValue>>({});
  const [result, setResult] = useState<PollResultsReadModel | null>(null);
  const [resultLoaded, setResultLoaded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isActive = poll.pollStatus === "active";
  const hasResponded = result?.hasResponded === true;

  useEffect(() => {
    let cancelled = false;

    if (!apartmentId) {
      return () => {
        cancelled = true;
      };
    }

    startTransition(async () => {
      const response = await getResidentPollResults({
        slug,
        pollId: poll.id,
        apartmentId,
      });

      if (cancelled) return;

      if (!response.ok) {
        setError(response.message);
        setResultLoaded(true);
        return;
      }

      setResult(response.data);
      setResultLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [apartmentId, poll.id, slug]);

  const requiredComplete = useMemo(
    () =>
      poll.questions.every(
        (question) =>
          !question.isRequired ||
          questionHasAnswer(
            question,
            answers[question.id],
          ),
      ),
    [answers, poll.questions],
  );

  function setQuestionValue(
    questionId: string,
    value: DraftValue,
  ) {
    setAnswers((current) => ({
      ...current,
      [questionId]: value,
    }));
  }

  function toggleMultiple(
    questionId: string,
    optionId: string,
  ) {
    const current = answers[questionId];
    const selected = Array.isArray(current) ? current : [];

    setQuestionValue(
      questionId,
      selected.includes(optionId)
        ? selected.filter((item) => item !== optionId)
        : [...selected, optionId],
    );
  }

  function submit() {
    if (!apartmentId) {
      setError("Оберіть квартиру.");
      return;
    }

    if (!requiredComplete) {
      setError("Дайте відповідь на всі обов’язкові питання.");
      return;
    }

    const payload = poll.questions
      .map((question) =>
        buildAnswer(
          question,
          answers[question.id],
        ),
      )
      .filter(
        (answer): answer is PollAnswerInput =>
          answer !== null,
      );

    setError(null);
    setMessage(null);

    startTransition(async () => {
      const response = await submitPollAnswers({
        slug,
        pollId: poll.id,
        apartmentId,
        answers: payload,
      });

      if (!response.ok) {
        setError(response.message);
        return;
      }

      setMessage("Вашу відповідь збережено.");

      const refreshed = await getResidentPollResults({
        slug,
        pollId: poll.id,
        apartmentId,
      });

      if (!refreshed.ok) {
        setError(refreshed.message);
        return;
      }

      setResult(refreshed.data);
      setResultLoaded(true);
    });
  }

  return (
    <article className="rounded-[var(--r-xl)] border border-[var(--pub-border)] bg-[var(--pub-surface-elevated)] p-5 shadow-[var(--pub-shadow-sm)] sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--pub-text)]">
            {poll.title}
          </h2>
          {poll.description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--pub-text-muted)]">
              {poll.description}
            </p>
          ) : null}
        </div>

        <span className="w-fit rounded-[var(--r-pill)] bg-[var(--pub-accent-tint)] px-3 py-1 text-xs font-semibold text-[var(--pub-text)]">
          {pollStatusLabel(poll.pollStatus)}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--pub-text-muted)]">
        <span className="rounded-[var(--r-pill)] border border-[var(--pub-border)] px-3 py-1">
          {identityLabel(poll.identityMode)}
        </span>
        <span className="rounded-[var(--r-pill)] border border-[var(--pub-border)] px-3 py-1">
          {visibilityCopy(poll.resultsVisibility)}
        </span>
      </div>

      {poll.identityMode === "anonymous" ? (
        <div className="mt-4 rounded-[var(--r-lg)] bg-[var(--pub-bg-quiet)] p-4 text-sm leading-6 text-[var(--pub-text-muted)]">
          Система фіксує лише те, що квартира вже взяла участь.
          Самі відповіді не зберігають зв’язок із квартирою.
        </div>
      ) : null}

      {!apartmentId ? (
        <div className="mt-5 rounded-[var(--r-lg)] border border-[var(--pub-border)] bg-[var(--pub-bg-quiet)] p-4 text-sm text-[var(--pub-text-muted)]">
          Оберіть квартиру вище, щоб перевірити участь і відповісти.
        </div>
      ) : null}

      {apartmentId && resultLoaded && hasResponded ? (
        <div className="mt-5 rounded-[var(--r-lg)] border border-[var(--pub-border)] bg-[var(--pub-accent-tint)] p-4 text-sm font-semibold text-[var(--pub-text)]">
          Ця квартира вже відповіла. Повторне редагування або відправлення недоступне.
        </div>
      ) : null}

      {apartmentId && isActive && !hasResponded ? (
        <div className="mt-6 space-y-5">
          {poll.questions.map((question, questionIndex) => {
            const value = answers[question.id];

            return (
              <fieldset
                key={question.id}
                disabled={isPending}
                className="rounded-[var(--r-lg)] border border-[var(--pub-border)] p-4"
              >
                <legend className="px-2 text-sm font-semibold text-[var(--pub-text)]">
                  {questionIndex + 1}. {question.question}
                  {question.isRequired ? " *" : ""}
                </legend>

                {question.description ? (
                  <p className="mb-3 text-sm leading-6 text-[var(--pub-text-muted)]">
                    {question.description}
                  </p>
                ) : null}

                {question.questionType === "single_choice" ? (
                  <div className="space-y-2">
                    {question.options.map((option) => (
                      <label
                        key={option.id}
                        className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--r-md)] bg-[var(--pub-bg-quiet)] px-3 py-2 text-sm"
                      >
                        <input
                          type="radio"
                          name={`${poll.id}-${question.id}`}
                          checked={value === option.id}
                          onChange={() =>
                            setQuestionValue(
                              question.id,
                              option.id,
                            )
                          }
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                ) : null}

                {question.questionType === "multiple_choice" ? (
                  <div className="space-y-2">
                    {question.options.map((option) => {
                      const selected = Array.isArray(value)
                        ? value
                        : [];

                      return (
                        <label
                          key={option.id}
                          className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--r-md)] bg-[var(--pub-bg-quiet)] px-3 py-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={selected.includes(option.id)}
                            onChange={() =>
                              toggleMultiple(
                                question.id,
                                option.id,
                              )
                            }
                          />
                          <span>{option.label}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : null}

                {question.questionType === "yes_no" ? (
                  <div className="grid grid-cols-2 gap-2">
                    {[true, false].map((choice) => (
                      <button
                        key={String(choice)}
                        type="button"
                        onClick={() =>
                          setQuestionValue(
                            question.id,
                            choice,
                          )
                        }
                        className={`min-h-11 rounded-[var(--r-pill)] border px-4 text-sm font-semibold ${
                          value === choice
                            ? "border-[var(--pub-accent)] bg-[var(--pub-accent)] text-[var(--pub-accent-contrast)]"
                            : "border-[var(--pub-border)] bg-[var(--pub-surface)] text-[var(--pub-text)]"
                        }`}
                      >
                        {choice ? "Так" : "Ні"}
                      </button>
                    ))}
                  </div>
                ) : null}

                {question.questionType === "scale" &&
                question.scaleMax ? (
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(
                        { length: question.scaleMax },
                        (_, index) => index + 1,
                      ).map((scaleValue) => (
                        <button
                          key={scaleValue}
                          type="button"
                          onClick={() =>
                            setQuestionValue(
                              question.id,
                              scaleValue,
                            )
                          }
                          className={`h-11 min-w-11 rounded-[var(--r-pill)] border px-3 text-sm font-semibold ${
                            value === scaleValue
                              ? "border-[var(--pub-accent)] bg-[var(--pub-accent)] text-[var(--pub-accent-contrast)]"
                              : "border-[var(--pub-border)] bg-[var(--pub-surface)] text-[var(--pub-text)]"
                          }`}
                        >
                          {scaleValue}
                        </button>
                      ))}
                    </div>

                    {(question.scaleMinLabel ||
                      question.scaleMaxLabel) ? (
                      <div className="mt-2 flex justify-between gap-3 text-xs text-[var(--pub-text-muted)]">
                        <span>{question.scaleMinLabel}</span>
                        <span className="text-right">
                          {question.scaleMaxLabel}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {question.questionType === "free_text" ? (
                  <textarea
                    value={
                      typeof value === "string" ? value : ""
                    }
                    onChange={(event) =>
                      setQuestionValue(
                        question.id,
                        event.target.value,
                      )
                    }
                    rows={4}
                    maxLength={2000}
                    placeholder="Ваша відповідь"
                    className="w-full rounded-[var(--r-lg)] border border-[var(--pub-border-strong)] bg-[var(--pub-surface)] px-4 py-3 text-sm text-[var(--pub-text)] outline-none focus:border-[var(--pub-accent)]"
                  />
                ) : null}
              </fieldset>
            );
          })}

          <button
            type="button"
            disabled={isPending || !requiredComplete}
            onClick={submit}
            className="inline-flex min-h-12 items-center justify-center rounded-[var(--r-pill)] bg-[var(--pub-accent)] px-6 text-sm font-semibold text-[var(--pub-accent-contrast)] shadow-[var(--pub-shadow-sm)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending
              ? "Зберігаємо..."
              : "Надіслати відповіді"}
          </button>
        </div>
      ) : null}

      {apartmentId &&
      poll.pollStatus !== "active" &&
      !hasResponded ? (
        <div className="mt-5 rounded-[var(--r-lg)] bg-[var(--pub-bg-quiet)] p-4 text-sm text-[var(--pub-text-muted)]">
          {poll.pollStatus === "completed"
            ? "Опитування завершено. Нові відповіді не приймаються."
            : "Опитування ще не відкрито для відповідей."}
        </div>
      ) : null}

      {message ? (
        <div
          aria-live="polite"
          className="mt-5 rounded-[var(--r-lg)] bg-[var(--pub-accent-tint)] p-4 text-sm font-semibold text-[var(--pub-text)]"
        >
          {message}
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="mt-5 rounded-[var(--r-lg)] border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      ) : null}

      {apartmentId && resultLoaded && result ? (
        <section className="mt-6 border-t border-[var(--pub-border)] pt-5">
          <h3 className="font-semibold text-[var(--pub-text)]">
            Результати
          </h3>

          {result.canViewResults ? (
            <div className="mt-4 space-y-3">
              {result.participationCount !== null ? (
                <div className="text-sm text-[var(--pub-text-muted)]">
                  Взяли участь квартир:{" "}
                  <strong className="text-[var(--pub-text)]">
                    {result.participationCount}
                  </strong>
                </div>
              ) : null}

              {result.questions.map((question) => (
                <ResultQuestion
                  key={question.id}
                  question={question}
                />
              ))}

              {result.residentFreeTextNotice ? (
                <p className="text-xs leading-5 text-[var(--pub-text-muted)]">
                  {result.residentFreeTextNotice}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-[var(--pub-text-muted)]">
              {visibilityReasonCopy(
                result.visibilityReason,
              )}
            </p>
          )}
        </section>
      ) : null}
    </article>
  );
}

export function PublicHousePolls({
  slug,
  polls,
  apartments,
}: Props) {
  const [selectedApartmentId, setSelectedApartmentId] =
    useState("");

  const selectedApartment = apartments.find(
    (apartment) =>
      apartment.id === selectedApartmentId,
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--r-xl)] border border-[var(--pub-border)] bg-[var(--pub-surface-elevated)] p-5 shadow-[var(--pub-shadow-sm)] sm:p-6">
        <label>
          <span className="mb-2 block text-sm font-semibold text-[var(--pub-text)]">
            Ваша квартира
          </span>
          <select
            value={selectedApartmentId}
            onChange={(event) =>
              setSelectedApartmentId(
                event.target.value,
              )
            }
            className="h-12 w-full rounded-[var(--r-lg)] border border-[var(--pub-border-strong)] bg-[var(--pub-surface)] px-4 text-sm text-[var(--pub-text)] outline-none focus:border-[var(--pub-accent)]"
          >
            <option value="">
              Оберіть квартиру
            </option>
            {apartments.map((apartment) => (
              <option
                key={apartment.id}
                value={apartment.id}
              >
                Кв. {publicApartmentLabel(apartment.label)}
              </option>
            ))}
          </select>
        </label>

        {selectedApartment ? (
          <p className="mt-2 text-xs text-[var(--pub-text-muted)]">
            Участь і захист від повторної відповіді перевіряються для
            квартири {publicApartmentLabel(selectedApartment.label)}.
          </p>
        ) : null}
      </section>

      {polls.length === 0 ? (
        <div className="rounded-[var(--r-xl)] border border-[var(--pub-border)] bg-[var(--pub-surface-elevated)] p-8 text-center">
          <h2 className="text-lg font-semibold text-[var(--pub-text)]">
            Опитувань поки немає
          </h2>
          <p className="mt-2 text-sm text-[var(--pub-text-muted)]">
            Коли адміністрація опублікує опитування, воно з’явиться тут.
          </p>
        </div>
      ) : (
        polls.map((poll) => (
          <PollCard
            key={`${poll.id}:${selectedApartmentId || "none"}`}
            slug={slug}
            apartmentId={selectedApartmentId}
            poll={poll}
          />
        ))
      )}
    </div>
  );
}
