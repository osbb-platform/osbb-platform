"use client";

import { useEffect, useState } from "react";

type PlatformSectionLoaderTone = "loading" | "success" | "error";

type PlatformSectionLoaderProps = {
  active: boolean;
  label: string;
  delayMs?: number;
  tone?: PlatformSectionLoaderTone;
  message?: string | null;
  className?: string;
};

function getToneClasses(tone: PlatformSectionLoaderTone) {
  if (tone === "success") {
    return {
      badge:
        "border-emerald-700/60 bg-emerald-950/80 text-emerald-200",
      dot: "bg-emerald-400",
    };
  }

  if (tone === "error") {
    return {
      badge: "border-red-800/60 bg-red-950/80 text-red-200",
      dot: "bg-red-400",
    };
  }

  return {
    badge: "border-[var(--cms-border-primary)] bg-[var(--cms-bg-primary)] text-[var(--cms-text-primary)]",
    dot: "bg-[var(--cms-text-primary)]",
  };
}

export function PlatformSectionLoader({
  active,
  label,
  delayMs = 280,
  tone = "loading",
  message = null,
  className = "",
}: PlatformSectionLoaderProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let timeout: number | null = null;

    if (active) {
      timeout = window.setTimeout(() => {
        setIsVisible(true);
      }, delayMs);
    } else {
      timeout = window.setTimeout(() => {
        setIsVisible(false);
      }, 0);
    }

    return () => {
      if (timeout !== null) {
        window.clearTimeout(timeout);
      }
    };
  }, [active, delayMs]);

  if (!isVisible) {
    return null;
  }

  const toneClasses = getToneClasses(tone);

  return (
    <div
      className={`absolute inset-0 z-20 flex items-start justify-center rounded-3xl bg-[rgba(15,23,42,0.42)] p-4 backdrop-blur-[2px] ${className}`}
      aria-live="polite"
      aria-busy={active}
    >
      <div
        className={`mt-2 inline-flex max-w-xl items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-[0_18px_48px_rgba(2,6,23,0.35)] ${toneClasses.badge}`}
      >
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${toneClasses.dot} ${tone === "loading" ? "animate-pulse" : ""}`}
          aria-hidden="true"
        />

        <div className="min-w-0">
          <div>{label}</div>
          {message ? (
            <div className="mt-1 text-xs font-normal text-[var(--cms-text-secondary)]">
              {message}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
