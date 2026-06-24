"use client";

import { useEffect, useState } from "react";

import { Spinner } from "@/src/shared/ui/admin/Spinner";

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
        "border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] text-[var(--cms-success-text)]",
    };
  }

  if (tone === "error") {
    return {
      badge:
        "border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] text-[var(--cms-danger-text)]",
    };
  }

  return {
    badge:
      "border-[var(--cms-border)] bg-[var(--cms-surface-elevated)] text-[var(--cms-text)]",
  };
}

function renderToneIcon(tone: PlatformSectionLoaderTone) {
  if (tone === "loading") {
    return <Spinner size="sm" className="text-[var(--cms-accent-primary)]" />;
  }

  if (tone === "success") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-[15px] w-[15px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[15px] w-[15px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
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
      className={`absolute inset-0 z-20 flex items-start justify-center rounded-[var(--r-xl)] bg-[var(--cms-overlay)] p-4 backdrop-blur-[2px] ${className}`}
      aria-live="polite"
      aria-busy={active}
    >
      <div
        className={`mt-2 inline-flex max-w-xl items-center gap-3 rounded-[var(--r-lg)] border px-4 py-3 text-sm font-medium shadow-[var(--cms-shadow-md)] ${toneClasses.badge}`}
      >
        <span className="shrink-0" aria-hidden={tone === "loading" ? undefined : true}>
          {renderToneIcon(tone)}
        </span>

        <div className="min-w-0">
          <div>{label}</div>
          {message ? (
            <div className="mt-1 text-xs font-normal text-[var(--cms-text-muted)]">
              {message}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
