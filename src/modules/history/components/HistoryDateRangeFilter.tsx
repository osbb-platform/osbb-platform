"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  valueFrom?: string;
  valueTo?: string;
  disabled?: boolean;
  onChange: (nextFrom: string, nextTo: string) => void;
};

type DayCell = {
  key: string;
  date: Date;
  inCurrentMonth: boolean;
  disabled: boolean;
};

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function endOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth() + 1, 0);
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function addMonths(value: Date, amount: number) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function isBetween(value: Date, from: Date, to: Date) {
  const current = startOfDay(value).getTime();
  const start = startOfDay(from).getTime();
  const end = startOfDay(to).getTime();

  return current >= start && current <= end;
}

function formatInputValue(value: Date | null) {
  if (!value) return "";
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseInputValue(value?: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatLabel(from: Date | null, to: Date | null) {
  if (!from && !to) return "Выбрать период";

  const formatter = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  if (from && to) {
    return `${formatter.format(from)} — ${formatter.format(to)}`;
  }

  return from ? formatter.format(from) : formatter.format(to!);
}

function buildMonthDays(monthDate: Date, maxDate: Date): DayCell[] {
  const firstDay = startOfMonth(monthDate);
  const lastDay = endOfMonth(monthDate);

  const startWeekday = (firstDay.getDay() + 6) % 7;
  const days: DayCell[] = [];

  for (let index = startWeekday; index > 0; index -= 1) {
    const date = new Date(firstDay);
    date.setDate(firstDay.getDate() - index);
    days.push({
      key: `${date.toISOString()}-prev`,
      date,
      inCurrentMonth: false,
      disabled: startOfDay(date).getTime() > startOfDay(maxDate).getTime(),
    });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
    days.push({
      key: `${date.toISOString()}-current`,
      date,
      inCurrentMonth: true,
      disabled: startOfDay(date).getTime() > startOfDay(maxDate).getTime(),
    });
  }

  while (days.length % 7 !== 0) {
    const last = days[days.length - 1]?.date ?? lastDay;
    const date = new Date(last);
    date.setDate(last.getDate() + 1);
    days.push({
      key: `${date.toISOString()}-next`,
      date,
      inCurrentMonth: false,
      disabled: startOfDay(date).getTime() > startOfDay(maxDate).getTime(),
    });
  }

  return days;
}

export function HistoryDateRangeFilter({
  valueFrom = "",
  valueTo = "",
  disabled = false,
  onChange,
}: Props) {
  const [draftFrom, setDraftFrom] = useState<Date | null>(null);
  const [draftTo, setDraftTo] = useState<Date | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => {
    return parseInputValue(valueFrom) ?? new Date();
  });

  const wrapperRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => startOfDay(new Date()), []);
  const appliedFrom = useMemo(() => parseInputValue(valueFrom), [valueFrom]);
  const appliedTo = useMemo(() => parseInputValue(valueTo), [valueTo]);
  const from = draftFrom ?? appliedFrom;
  const to = draftTo ?? appliedTo;

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (!wrapperRef.current) return;
      if (wrapperRef.current.contains(event.target as Node)) return;
      setIsOpen(false);
    }

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const monthLabel = useMemo(() => {
    return visibleMonth.toLocaleDateString("ru-RU", {
      month: "long",
      year: "numeric",
    });
  }, [visibleMonth]);

  const days = useMemo(
    () => buildMonthDays(visibleMonth, today),
    [visibleMonth, today],
  );

  function handleDayClick(day: Date) {
    const cleanDay = startOfDay(day);

    if (cleanDay.getTime() > today.getTime()) {
      return;
    }

    if (!from || (from && to)) {
      setDraftFrom(cleanDay);
      setDraftTo(null);
      return;
    }

    if (cleanDay.getTime() < from.getTime()) {
      setDraftFrom(cleanDay);
      setDraftTo(from);
      setIsOpen(false);
      onChange(formatInputValue(cleanDay), formatInputValue(from));
      return;
    }

    setDraftTo(cleanDay);
    setIsOpen(false);
    onChange(formatInputValue(from), formatInputValue(cleanDay));
  }

  function handleClear() {
    setDraftFrom(null);
    setDraftTo(null);
    setIsOpen(false);
    onChange("", "");
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!isOpen) {
            setDraftFrom(null);
            setDraftTo(null);
            setVisibleMonth(appliedFrom ?? new Date());
          }
          setIsOpen((prev) => !prev);
        }}
        className={`flex min-h-[56px] w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
          disabled
            ? "cursor-not-allowed border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] text-[var(--cms-text-muted)]"
            : "border-[var(--cms-border-primary)] bg-[var(--cms-bg-secondary)] text-[var(--cms-text-primary)] hover:border-[var(--cms-border-secondary)]"
        }`}
      >
        <span className="pr-3">{formatLabel(from, to)}</span>
        <span className="shrink-0 text-[var(--cms-text-secondary)]">📅</span>
      </button>

      {isOpen && !disabled ? (
        <div className="absolute left-0 top-[calc(100%+12px)] z-50 w-[320px] rounded-3xl border border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] p-4 shadow-2xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setVisibleMonth((prev) => addMonths(prev, -1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--cms-border-primary)] text-[var(--cms-text-primary)] transition hover:bg-[var(--cms-bg-secondary)]"
            >
              ‹
            </button>

            <div className="text-sm font-medium capitalize text-[var(--cms-text-primary)]">
              {monthLabel}
            </div>

            <button
              type="button"
              onClick={() => {
                const next = addMonths(visibleMonth, 1);
                if (
                  next.getFullYear() > today.getFullYear() ||
                  (next.getFullYear() === today.getFullYear() &&
                    next.getMonth() > today.getMonth())
                ) {
                  return;
                }

                setVisibleMonth(next);
              }}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                visibleMonth.getFullYear() === today.getFullYear() &&
                visibleMonth.getMonth() === today.getMonth()
                  ? "cursor-not-allowed border-[var(--cms-border-primary)] text-[var(--cms-text-muted)]"
                  : "border-[var(--cms-border-primary)] text-[var(--cms-text-primary)] hover:bg-[var(--cms-bg-secondary)]"
              }`}
            >
              ›
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-2 text-center text-[11px] uppercase tracking-wide text-[var(--cms-text-muted)]">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((item) => (
              <div key={item}>{item}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((day) => {
              const isStart = from ? isSameDay(day.date, from) : false;
              const isEnd = to ? isSameDay(day.date, to) : false;
              const isInRange =
                from && to ? isBetween(day.date, from, to) : false;

              return (
                <button
                  key={day.key}
                  type="button"
                  disabled={day.disabled}
                  onClick={() => handleDayClick(day.date)}
                  className={`inline-flex h-10 items-center justify-center rounded-xl text-sm transition ${
                    day.disabled
                      ? "cursor-not-allowed text-[var(--cms-text-muted)]"
                      : isStart || isEnd
                        ? "bg-white font-semibold text-slate-950"
                        : isInRange
                          ? "bg-[var(--cms-bg-tertiary)] text-[var(--cms-text-primary)]"
                          : day.inCurrentMonth
                            ? "text-[var(--cms-text-primary)] hover:bg-[var(--cms-bg-secondary)]"
                            : "text-[var(--cms-text-muted)] hover:bg-[var(--cms-bg-secondary)]"
                  }`}
                >
                  {day.date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center justify-center rounded-2xl border border-[var(--cms-border-primary)] px-4 py-2 text-sm font-medium text-[var(--cms-text-primary)] transition hover:bg-[var(--cms-bg-secondary)]"
            >
              Очистить
            </button>

            <div className="text-xs text-[var(--cms-text-muted)]">
              Выберите начало и конец периода
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
