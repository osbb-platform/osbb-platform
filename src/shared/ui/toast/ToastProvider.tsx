"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastTone = "success" | "error" | "info";

export type ToastAction = {
  label: string;
  onClick: () => void;
};

type Toast = {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
  action?: ToastAction;
};

export type ToastInput = {
  tone?: ToastTone;
  title: string;
  description?: string;
  action?: ToastAction;
};

type ToastContextValue = {
  toast: (toast: ToastInput) => void;
  dismissToast: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_VISIBLE_TOASTS = 3;

const TOAST_DURATION_MS: Record<ToastTone, number | null> = {
  success: 3500,
  info: 5000,
  error: null,
};

const toastToneClass: Record<ToastTone, string> = {
  success: "border-[var(--cms-success-border)] bg-[var(--cms-success-bg)]",
  error: "border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)]",
  info: "border-[var(--cms-info-border)] bg-[var(--cms-info-bg)]",
};

const toastIconClass: Record<ToastTone, string> = {
  success:
    "border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] text-[var(--cms-success-text)]",
  error:
    "border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] text-[var(--cms-danger-text)]",
  info:
    "border-[var(--cms-info-border)] bg-[var(--cms-info-bg)] text-[var(--cms-info-text)]",
};

function ToastIcon({ tone }: { tone: ToastTone }) {
  if (tone === "success") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }

  if (tone === "error") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
        <line x1="6" y1="6" x2="18" y2="18" />
        <line x1="18" y1="6" x2="6" y2="18" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6" />
      <path d="M12 7h.01" />
    </svg>
  );
}

function ToastItem({
  item,
  onDismiss,
}: {
  item: Toast;
  onDismiss: (id: number) => void;
}) {
  const duration = TOAST_DURATION_MS[item.tone];
  const remainingMsRef = useRef(duration);
  const startedAtRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    if (remainingMsRef.current === null || remainingMsRef.current <= 0) return;

    clearTimer();
    startedAtRef.current = Date.now();
    timeoutRef.current = window.setTimeout(() => {
      onDismiss(item.id);
    }, remainingMsRef.current);
  }, [clearTimer, item.id, onDismiss]);

  useEffect(() => {
    startTimer();
    return clearTimer;
  }, [clearTimer, startTimer]);

  function pauseTimer() {
    if (remainingMsRef.current === null || startedAtRef.current === null) return;

    remainingMsRef.current = Math.max(
      0,
      remainingMsRef.current - (Date.now() - startedAtRef.current),
    );
    startedAtRef.current = null;
    clearTimer();
  }

  function resumeTimer() {
    if (remainingMsRef.current === null || remainingMsRef.current <= 0) return;
    startTimer();
  }

  return (
    <div
      className={[
        "pointer-events-auto flex w-full items-start gap-3 rounded-[var(--r-lg)] border p-4 text-sm shadow-[var(--cms-shadow-md)] motion-safe:animate-[osbb-toast-in_.25s_ease]",
        toastToneClass[item.tone],
      ].join(" ")}
      role={item.tone === "error" ? "alert" : "status"}
      aria-live={item.tone === "error" ? "assertive" : "polite"}
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
    >
      <span
        className={[
          "flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[var(--r-md)] border",
          toastIconClass[item.tone],
        ].join(" ")}
        aria-hidden="true"
      >
        <ToastIcon tone={item.tone} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="font-semibold text-[var(--cms-text)]">{item.title}</div>

        {item.description ? (
          <div className="mt-1 text-xs leading-[1.5] text-[var(--cms-text-muted)]">
            {item.description}
          </div>
        ) : null}

        {item.action ? (
          <button
            type="button"
            onClick={() => {
              item.action?.onClick();
              onDismiss(item.id);
            }}
            className="mt-3 inline-flex min-h-9 items-center justify-center rounded-[var(--r-md)] border border-[var(--cms-border-strong)] bg-[var(--cms-surface)] px-3 py-2 text-xs font-semibold text-[var(--cms-text)] transition hover:bg-[var(--cms-surface-muted)]"
          >
            {item.action.label}
          </button>
        ) : null}
      </div>

      <button
        type="button"
        aria-label="Закрити"
        onClick={() => onDismiss(item.id)}
        className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[var(--r-sm)] text-[var(--cms-text-soft)] transition-colors hover:bg-[var(--cms-pill-bg)] hover:text-[var(--cms-text)]"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: number) => {
    setItems((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((input: ToastInput) => {
    const tone = input.tone ?? "info";
    const id = Date.now() + Math.random();

    setItems((previous) => [
      ...previous.slice(-(MAX_VISIBLE_TOASTS - 1)),
      {
        id,
        tone,
        title: input.title,
        description: input.description,
        action: input.action,
      },
    ]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismissToast }}>
      {children}

      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex w-[calc(100%-2rem)] max-w-sm flex-col items-end gap-3"
        aria-label="Сповіщення"
      >
        {items.map((item) => (
          <ToastItem key={item.id} item={item} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    return {
      toast: () => {},
      dismissToast: () => {},
    };
  }

  return context;
}
