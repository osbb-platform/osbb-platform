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

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const toast = useCallback((input: ToastInput) => {
    const id = Date.now() + Math.random();

    setItems((prev) => [
      ...prev,
      {
        id,
        tone: input.tone ?? "info",
        title: input.title,
        description: input.description,
      },
    ]);

    window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      <div className="fixed bottom-4 right-4 z-[9999] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`rounded-2xl px-4 py-3 text-sm shadow-xl ${
              item.tone === "error"
                ? "bg-red-600 text-white"
                : item.tone === "success"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800 text-white"
            }`}
            role="status"
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
