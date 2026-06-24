"use client";

import * as React from "react";

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  size?: "sm" | "md" | "lg";
  closeOnOverlay?: boolean;
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
};

const SIZE: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "w-[440px]",
  md: "w-[560px]",
  lg: "w-[720px]",
};

export function Modal({ open, onClose, size = "md", closeOnOverlay = true, children, className, ...aria }: ModalProps) {
  React.useEffect(() => {
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--cms-overlay)] p-6 motion-safe:animate-[osbb-fade_.15s_ease]"
      onMouseDown={(e) => {
        if (closeOnOverlay && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        {...aria}
        className={cx(
          "max-w-full bg-[var(--cms-surface)] border border-[var(--cms-border)]",
          "rounded-[var(--r-2xl)] shadow-[var(--cms-shadow-lg)] p-7",
          "motion-safe:animate-[osbb-pop_.2s_ease]",
          SIZE[size],
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
