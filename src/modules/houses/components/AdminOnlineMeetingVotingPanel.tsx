"use client";

import { useState } from "react";

import { useAdminContentCommand } from "@/src/modules/content-engine/v2/client/useAdminContentCommand";
import type { AdminOnlineMeetingBallot } from "@/src/modules/houses/services/getAdminOnlineMeetingVoting";
import type { OnlineMeetingAggregation } from "@/src/modules/houses/services/getOnlineMeetingAggregation";
import {
  adminButtonClasses,
} from "@/src/shared/ui/admin/adminStyles";

type MeetingStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "review"
  | "completed"
  | "archived";

type Props = {
  houseId: string;
  meetingId: string;
  status: MeetingStatus;
  lifecycleStatus?: "draft" | "published" | "archived";
  lockVersion: number;
  aggregation: OnlineMeetingAggregation | null;
  ballots: AdminOnlineMeetingBallot[];
  canChangeWorkflowStatus: boolean;
  onMeetingChanged: (next: {
    status: MeetingStatus;
    lifecycleStatus?: "draft" | "published" | "archived";
    lockVersion: number;
    updatedAt: string;
  }) => void;
};

function formatArea(value: number) {
  return new Intl.NumberFormat("uk-UA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("uk-UA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function ballotStatusLabel(status: AdminOnlineMeetingBallot["status"]) {
  if (status === "confirmed") return "Підтверджено";
  if (status === "pending") return "Очікує підтвердження";
  if (status === "expired") return "Строк минув";
  if (status === "failed") return "Відхилено";
  return "Скасовано";
}

function apartmentStatusLabel(
  status: OnlineMeetingAggregation["apartments"][number]["status"],
) {
  if (status === "fully") return "Проголосовано повністю";
  if (status === "partially") return "Проголосовано частково";
  return "Не голосували";
}

export function AdminOnlineMeetingVotingPanel({
  houseId,
  meetingId,
  status,
  lifecycleStatus,
  lockVersion,
  aggregation,
  ballots,
  canChangeWorkflowStatus,
  onMeetingChanged,
}: Props) {
  const { dispatch, isPending } = useAdminContentCommand();
  const [notice, setNotice] = useState<string | null>(null);

  async function runCommand(command: "openVoting" | "closeVoting") {
    setNotice(null);

    const result = await dispatch<Record<string, unknown>>(
      {
        type: `meetings.${command}`,
        houseId,
        payload: {
          id: meetingId,
          lockVersion,
        },
      },
      {
        refreshOnSuccess: true,
        onError: setNotice,
      },
    );

    if (!result) return;

    const displayStatus = result.display_status;
    const nextStatus: MeetingStatus =
      displayStatus === "draft" ||
      displayStatus === "scheduled" ||
      displayStatus === "active" ||
      displayStatus === "review" ||
      displayStatus === "completed" ||
      displayStatus === "archived"
        ? displayStatus
        : status;

    const resultLifecycle = result.lifecycle_status;
    const nextLifecycle =
      resultLifecycle === "draft" ||
      resultLifecycle === "published" ||
      resultLifecycle === "archived"
        ? resultLifecycle
        : lifecycleStatus;

    const nextLockVersion =
      typeof result.lock_version === "number"
        ? result.lock_version
        : lockVersion + 1;

    onMeetingChanged({
      status: nextStatus,
      lifecycleStatus: nextLifecycle,
      lockVersion: nextLockVersion,
      updatedAt:
        typeof result.updated_at === "string"
          ? result.updated_at
          : new Date().toISOString(),
    });

    const warning = result.onlineVotingWarning;

    if (
      warning &&
      typeof warning === "object" &&
      "code" in warning &&
      warning.code === "APARTMENTS_WITHOUT_AREA" &&
      "count" in warning &&
      typeof warning.count === "number"
    ) {
      setNotice(
        `Онлайн-голосування відкрито. ${warning.count} квартир не мають заповненої площі та не зможуть голосувати онлайн.`,
      );
    } else {
      setNotice(
        command === "openVoting"
          ? "Онлайн-голосування відкрито."
          : "Онлайн-голосування закрито.",
      );
    }
  }

  const canOpen =
    lifecycleStatus === "published" && status === "scheduled";

  const canClose =
    lifecycleStatus === "published" && status === "active";

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--r-lg)] border border-[var(--cms-border-strong)] bg-[var(--cms-surface-muted)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[var(--cms-text)]">
              Керування онлайн-голосуванням
            </div>
            <p className="mt-1 text-xs leading-5 text-[var(--cms-text-muted)]">
              Голоси мешканців підтверджуються через провайдера Дії та
              рахуються за площею частки співвласника.
            </p>
          </div>

          {canChangeWorkflowStatus && canOpen ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => void runCommand("openVoting")}
              className={adminButtonClasses({ variant: "primary" })}
            >
              {isPending ? "Відкриваємо..." : "Відкрити голосування"}
            </button>
          ) : null}

          {canChangeWorkflowStatus && canClose ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => void runCommand("closeVoting")}
              className={adminButtonClasses({ variant: "secondary" })}
            >
              {isPending ? "Закриваємо..." : "Закрити голосування"}
            </button>
          ) : null}
        </div>

        {notice ? (
          <div className="mt-3 rounded-[var(--r-md)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] px-3 py-2 text-sm text-[var(--cms-text-muted)]">
            {notice}
          </div>
        ) : null}
      </div>

      {aggregation ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[var(--r-lg)] border border-[var(--cms-border)] p-4">
              <div className="text-xs text-[var(--cms-text-muted)]">
                Площа будинку
              </div>
              <div className="mt-1 text-lg font-semibold text-[var(--cms-text)]">
                {formatArea(aggregation.totalHouseAreaM2)} м²
              </div>
            </div>

            <div className="rounded-[var(--r-lg)] border border-[var(--cms-border)] p-4">
              <div className="text-xs text-[var(--cms-text-muted)]">
                Підтверджено голосів
              </div>
              <div className="mt-1 text-lg font-semibold text-[var(--cms-text)]">
                {formatArea(aggregation.confirmedAreaM2)} м²
              </div>
            </div>

            <div className="rounded-[var(--r-lg)] border border-[var(--cms-border)] p-4">
              <div className="text-xs text-[var(--cms-text-muted)]">
                Участь
              </div>
              <div className="mt-1 text-lg font-semibold text-[var(--cms-text)]">
                {formatPercent(aggregation.participationPercent)}%
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-semibold text-[var(--cms-text)]">
              Результати за питаннями
            </div>

            {aggregation.questions.map((question, index) => (
              <div
                key={question.questionId}
                className="rounded-[var(--r-lg)] border border-[var(--cms-border)] p-4"
              >
                <div className="text-sm font-medium text-[var(--cms-text)]">
                  Питання {index + 1}
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-[var(--r-md)] bg-[var(--cms-surface-muted)] p-3 text-sm text-[var(--cms-text-muted)]">
                    За: {formatArea(question.forAreaM2)} м² ·{" "}
                    {formatPercent(question.forPercent)}%
                  </div>

                  <div className="rounded-[var(--r-md)] bg-[var(--cms-surface-muted)] p-3 text-sm text-[var(--cms-text-muted)]">
                    Проти: {formatArea(question.againstAreaM2)} м² ·{" "}
                    {formatPercent(question.againstPercent)}%
                  </div>

                  <div className="rounded-[var(--r-md)] bg-[var(--cms-surface-muted)] p-3 text-sm text-[var(--cms-text-muted)]">
                    Утримались: {formatArea(question.abstainedAreaM2)} м² ·{" "}
                    {formatPercent(question.abstainedPercent)}%
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <div className="text-sm font-semibold text-[var(--cms-text)]">
              Участь квартир
            </div>

            <div className="mt-3 overflow-hidden rounded-[var(--r-lg)] border border-[var(--cms-border)]">
              {aggregation.apartments.map((apartment) => (
                <div
                  key={apartment.apartmentId}
                  className="flex flex-col gap-1 border-b border-[var(--cms-border)] px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="text-sm font-medium text-[var(--cms-text)]">
                    Квартира
                  </div>

                  <div className="text-xs text-[var(--cms-text-muted)]">
                    {formatArea(apartment.confirmedAreaM2)} /{" "}
                    {formatArea(apartment.apartmentAreaM2)} м² ·{" "}
                    {apartmentStatusLabel(apartment.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] p-4 text-sm text-[var(--cms-text-muted)]">
          Онлайн-результати поки відсутні.
        </div>
      )}

      <div>
        <div className="text-sm font-semibold text-[var(--cms-text)]">
          Бюлетені
        </div>
        <p className="mt-1 text-xs text-[var(--cms-text-muted)]">
          Показуються лише квартира, площа голосу, час і статус. Дані
          особи та технічні ідентифікатори провайдера не відображаються.
        </p>

        {ballots.length > 0 ? (
          <div className="mt-3 overflow-hidden rounded-[var(--r-lg)] border border-[var(--cms-border)]">
            {ballots.map((ballot) => (
              <div
                key={ballot.id}
                className="grid gap-1 border-b border-[var(--cms-border)] px-4 py-3 last:border-b-0 sm:grid-cols-[1fr_auto_auto]"
              >
                <div>
                  <div className="text-sm font-medium text-[var(--cms-text)]">
                    {ballot.apartmentLabel}
                  </div>
                  <div className="mt-1 text-xs text-[var(--cms-text-muted)]">
                    {formatArea(ballot.ownedAreaM2)} м²
                  </div>
                </div>

                <div className="text-xs text-[var(--cms-text-muted)]">
                  {ballotStatusLabel(ballot.status)}
                </div>

                <div className="text-xs text-[var(--cms-text-muted)]">
                  {formatDateTime(ballot.verifiedAt ?? ballot.createdAt)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] p-4 text-sm text-[var(--cms-text-muted)]">
            Бюлетенів ще немає.
          </div>
        )}
      </div>
    </div>
  );
}
