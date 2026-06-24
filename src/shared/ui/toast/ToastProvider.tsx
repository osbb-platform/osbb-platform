"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type ToastTone = "success" | "error" | "info";

type Toast = {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
};

type ToastInput = {
  tone?: ToastTone;
  title: string;
  description?: string;
};

type ToastContextValue = {
  toast: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS: Record<ToastTone, number> = {
  success: 4000,
  info: 4000,
  error: 6000,
};

const toastToneClass: Record<ToastTone, string> = {
  success:
    "border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] text-[var(--cms-success-text)]",
  error:
    "border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] text-[var(--cms-danger-text)]",
  info:
    "border-[var(--cms-info-border)] bg-[var(--cms-info-bg)] text-[var(--cms-info-text)]",
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

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const tone = input.tone ?? "info";
      const id = Date.now() + Math.random();

      setItems((prev) => [
        ...prev,
        {
          id,
          tone,
          title: input.title,
          description: input.description,
        },
      ]);

      window.setTimeout(() => {
        removeToast(id);
      }, TOAST_DURATION_MS[tone]);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      <div className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex w-[calc(100%-2rem)] max-w-sm flex-col items-end gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto flex w-full items-start gap-3 rounded-[var(--r-lg)] border p-4 text-sm shadow-[var(--cms-shadow-md)] motion-safe:animate-[osbb-toast-in_.25s_ease] ${toastToneClass[item.tone]}`}
            role={item.tone === "error" ? "alert" : "status"}
            aria-live={item.tone === "error" ? "assertive" : "polite"}
          >
            <span
              className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[var(--r-md)] border ${toastIconClass[item.tone]}`}
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
            </div>

            <button
              type="button"
              aria-label="Закрити"
              onClick={() => removeToast(item.id)}
              className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[var(--r-sm)] text-[var(--cms-text-soft)] transition-colors hover:bg-[var(--cms-pill-bg)] hover:text-[var(--cms-text)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--cms-ring)_35%,transparent)]"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
          </div>
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
    };
  }

  return context;
}
