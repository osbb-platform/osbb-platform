// src/shared/ui/admin/adminStyles.ts
// Єдине джерело презентаційних класів адмінки. Лише токени --cms-* / --r-*.

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

/* ── Focus ring ── */
export const adminFocusRingClass =
  "focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--cms-ring)_35%,transparent)]";

/* ── Типографіка ── */
export const adminDisplayClass =
  "font-[family-name:var(--font-serif)] text-[28px] md:text-[32px] font-semibold tracking-[-0.01em] text-[var(--cms-text)]";

export const adminTitleClass = "text-[20px] font-semibold text-[var(--cms-text)]";

export const adminSectionTitleClass = "text-[16px] md:text-[18px] font-semibold text-[var(--cms-text)]";

export const adminBodyClass = "text-[14px] leading-[1.6] text-[var(--cms-text-muted)]";

export const adminMetaClass =
  "text-[12px] font-medium uppercase tracking-[0.04em] text-[var(--cms-text-soft)]";

/* Existing legacy names — keep alive */
export const adminMetaTextClass = adminMetaClass;

export const adminLabelClass = "text-[14px] font-semibold text-[var(--cms-text)]";

export const adminTextLabelClass = adminLabelClass;

export const adminSurfaceClass = cx(
  "rounded-[var(--r-xl)] border border-[var(--cms-border)] bg-[var(--cms-surface)] shadow-[var(--cms-shadow-sm)]",
);

export const adminInsetSurfaceClass = cx(
  "rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-muted)]",
);

export const adminMutedSurfaceClass = cx(
  "rounded-[var(--r-lg)] border border-[var(--cms-border)] bg-[var(--cms-surface-elevated)]",
);

export const adminCardPaddingClass = "p-6";

export const adminInsetPaddingClass = "p-4";

export const adminInputClass = cx(
  "h-11 w-full rounded-[var(--r-lg)] border border-[var(--cms-border-strong)] bg-[var(--cms-surface-elevated)] px-3.5 text-sm text-[var(--cms-text)] shadow-none transition-colors placeholder:text-[var(--cms-text-soft)]",
  "focus:border-[var(--cms-accent-primary)] focus:outline-none focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--cms-ring)_28%,transparent)]",
  "disabled:cursor-not-allowed disabled:opacity-60",
);

export const adminTextareaClass = cx(
  "min-h-[112px] w-full rounded-[var(--r-lg)] border border-[var(--cms-border-strong)] bg-[var(--cms-surface-elevated)] px-3.5 py-3 text-sm leading-[1.6] text-[var(--cms-text)] shadow-none transition-colors placeholder:text-[var(--cms-text-soft)]",
  "focus:border-[var(--cms-accent-primary)] focus:outline-none focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--cms-ring)_28%,transparent)]",
  "disabled:cursor-not-allowed disabled:opacity-60",
);

export const adminSelectClass = cx(
  "h-11 w-full rounded-[var(--r-lg)] border border-[var(--cms-border-strong)] bg-[var(--cms-surface-elevated)] px-3.5 text-sm text-[var(--cms-text)] shadow-none transition-colors",
  "focus:border-[var(--cms-accent-primary)] focus:outline-none focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--cms-ring)_28%,transparent)]",
  "disabled:cursor-not-allowed disabled:opacity-60",
);

export const adminButtonDisabledClass = "disabled:opacity-60 disabled:pointer-events-none";

export const adminPrimaryButtonClass = cx(
  "inline-flex items-center justify-center gap-2 h-11 px-5 text-sm font-semibold",
  "rounded-[var(--r-lg)] border border-transparent",
  "bg-[var(--cms-primary)] text-[var(--cms-primary-contrast)]",
  "transition-colors hover:bg-[var(--cms-accent-strong)] active:translate-y-px",
  adminButtonDisabledClass,
  adminFocusRingClass
);

export const adminSecondaryButtonClass = cx(
  "inline-flex items-center justify-center gap-2 h-11 px-5 text-sm font-semibold",
  "rounded-[var(--r-lg)] border border-[var(--cms-border-strong)]",
  "bg-transparent text-[var(--cms-text)]",
  "transition-colors hover:bg-[var(--cms-pill-bg)] active:translate-y-px",
  adminButtonDisabledClass,
  adminFocusRingClass
);

export const adminGhostButtonClass = cx(
  "inline-flex items-center justify-center gap-2 h-11 px-4 text-sm font-semibold",
  "rounded-[var(--r-lg)] border border-transparent",
  "bg-transparent text-[var(--cms-text-muted)]",
  "transition-colors hover:bg-[var(--cms-pill-bg)] hover:text-[var(--cms-text)]",
  adminButtonDisabledClass,
  adminFocusRingClass
);

export const adminDangerButtonClass = cx(
  "inline-flex items-center justify-center gap-2 h-11 px-5 text-sm font-semibold",
  "rounded-[var(--r-lg)] border border-[var(--cms-danger-border)]",
  "bg-[var(--cms-danger-bg)] text-[var(--cms-danger-text)]",
  "transition-[filter,transform] hover:brightness-[1.06] active:translate-y-px",
  adminButtonDisabledClass,
  adminFocusRingClass
);

export const adminWarningButtonClass = cx(
  "inline-flex items-center justify-center gap-2 h-11 px-5 text-sm font-semibold",
  "rounded-[var(--r-lg)] border border-[var(--cms-warning-border)]",
  "bg-[var(--cms-warning-bg)] text-[var(--cms-warning-text)]",
  "transition-[filter,transform] hover:brightness-[1.06] active:translate-y-px",
  adminButtonDisabledClass,
  adminFocusRingClass
);

export const adminSuccessButtonClass = cx(
  "inline-flex items-center justify-center gap-2 h-11 px-5 text-sm font-semibold",
  "rounded-[var(--r-lg)] border border-[var(--cms-success-border)]",
  "bg-[var(--cms-success-bg)] text-[var(--cms-success-text)]",
  "transition-[filter,transform] hover:brightness-[1.06] active:translate-y-px",
  adminButtonDisabledClass,
  adminFocusRingClass
);

export const adminIconButtonClass = cx(
  "inline-flex items-center justify-center h-10 w-10 rounded-[var(--r-md)]",
  "border border-transparent bg-transparent text-[var(--cms-text-muted)]",
  "transition-colors hover:bg-[var(--cms-pill-bg)] hover:text-[var(--cms-text)]",
  adminFocusRingClass
);

/* ── Badge / tabs / empty / overlay ── */
export const adminBadgeBaseClass =
  "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-[var(--r-pill)] border";

export const adminEmptyStateClass = cx(
  "flex flex-col items-center text-center gap-2 px-7 py-9",
  adminSurfaceClass
);

export const adminTabBaseClass = cx(
  "inline-flex h-8 items-center gap-1.5 rounded-[var(--r-md)] px-3 text-xs font-semibold transition-colors",
  "border",
  adminFocusRingClass
);

export const adminTabActiveClass =
  "border-[var(--cms-tab-active-border)] bg-[var(--cms-tab-active-bg)] text-[var(--cms-tab-active-text)]";

export const adminTabInactiveClass =
  "border-transparent bg-transparent text-[var(--cms-text-muted)] hover:text-[var(--cms-text)]";

export const adminTabCountBaseClass = "inline-flex min-w-5 items-center justify-center rounded-[var(--r-pill)] px-1.5 py-px text-[11px] font-semibold";

export const adminTabCountActiveClass =
  "bg-[var(--cms-tab-active-count-bg)] text-[var(--cms-tab-active-text)]";

export const adminTabCountInactiveClass =
  "bg-[var(--cms-pill-bg)] text-[var(--cms-text-soft)]";

export const adminOverlayClass = "fixed inset-0 bg-[var(--cms-overlay)]";

export const adminModalClass = cx(
  "bg-[var(--cms-surface)] border border-[var(--cms-border)]",
  "rounded-[var(--r-2xl)] shadow-[var(--cms-shadow-lg)]"
);

export const adminModalSurfaceClass = adminModalClass;

/* ── Builders for new Button/IconButton primitives ── */
export type AdminButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "subtle"
  | "danger"
  | "success"
  | "warning";

export type AdminButtonSize = "sm" | "md" | "lg";

const BTN_BASE = cx(
  "relative inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap select-none",
  "rounded-[var(--r-lg)] transition-[background-color,border-color,filter,transform] duration-150",
  "active:translate-y-px disabled:opacity-60 disabled:pointer-events-none",
  adminFocusRingClass
);

const BTN_SIZE: Record<AdminButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

const BTN_VARIANT: Record<AdminButtonVariant, string> = {
  primary:
    "border border-transparent bg-[var(--cms-primary)] text-[var(--cms-primary-contrast)] hover:bg-[var(--cms-accent-strong)]",
  secondary:
    "border border-[var(--cms-border-strong)] bg-transparent text-[var(--cms-text)] hover:bg-[var(--cms-pill-bg)]",
  ghost:
    "border border-transparent bg-transparent text-[var(--cms-text-muted)] hover:bg-[var(--cms-pill-bg)] hover:text-[var(--cms-text)]",
  subtle:
    "border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] text-[var(--cms-text)] hover:border-[var(--cms-border-strong)]",
  danger:
    "border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] text-[var(--cms-danger-text)] hover:brightness-[1.06]",
  success:
    "border border-[var(--cms-success-border)] bg-[var(--cms-success-bg)] text-[var(--cms-success-text)] hover:brightness-[1.06]",
  warning:
    "border border-[var(--cms-warning-border)] bg-[var(--cms-warning-bg)] text-[var(--cms-warning-text)] hover:brightness-[1.06]",
};

export function adminButtonClasses(opts: {
  variant?: AdminButtonVariant;
  size?: AdminButtonSize;
  fullWidth?: boolean;
} = {}): string {
  return cx(
    BTN_BASE,
    BTN_SIZE[opts.size ?? "md"],
    BTN_VARIANT[opts.variant ?? "primary"],
    opts.fullWidth && "w-full"
  );
}

export type AdminIconButtonVariant = "ghost" | "subtle" | "danger";
export type AdminIconButtonSize = "sm" | "md";

const ICON_BTN_VARIANT: Record<AdminIconButtonVariant, string> = {
  ghost:
    "border border-transparent bg-transparent text-[var(--cms-text-muted)] hover:bg-[var(--cms-pill-bg)] hover:text-[var(--cms-text)]",
  subtle:
    "border border-[var(--cms-border)] bg-[var(--cms-surface-muted)] text-[var(--cms-text)] hover:border-[var(--cms-border-strong)]",
  danger:
    "border border-[var(--cms-danger-border)] bg-[var(--cms-danger-bg)] text-[var(--cms-danger-text)] hover:brightness-[1.06]",
};

export function adminIconButtonClasses(opts: {
  variant?: AdminIconButtonVariant;
  size?: AdminIconButtonSize;
} = {}): string {
  return cx(
    "inline-flex items-center justify-center rounded-[var(--r-md)] transition-[background-color,border-color,filter]",
    opts.size === "sm" ? "h-9 w-9" : "h-10 w-10",
    ICON_BTN_VARIANT[opts.variant ?? "ghost"],
    adminFocusRingClass
  );
}
