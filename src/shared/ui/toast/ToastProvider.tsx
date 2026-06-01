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
    "border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] text-[var(--cms-text)]",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const toast = useCallback((input: ToastInput) => {
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
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, TOAST_DURATION_MS[tone]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      <div className="fixed bottom-4 right-4 z-[9999] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`rounded-2xl border px-4 py-3 text-sm shadow-xl ${toastToneClass[item.tone]}`}
            role={item.tone === "error" ? "alert" : "status"}
            aria-live={item.tone === "error" ? "assertive" : "polite"}
          >
            <div className="font-semibold">{item.title}</div>
            {item.description ? (
              <div className="mt-1 text-xs opacity-90">{item.description}</div>
            ) : null}
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
      toast: (_toast: ToastInput) => {},
    };
  }

  return context;
}
