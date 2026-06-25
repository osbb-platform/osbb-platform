// ════════════════════════════════════════════════════════════════════════
// src/shared/ui/public/index.ts — публічний барель дизайн-системи кабінету.
// Один import-вузол для всіх примітивів і теми.
// ════════════════════════════════════════════════════════════════════════

// ── Блок 0 · Тема / акцент ──
export {
  PublicThemeProvider,
  usePublicTheme,
  houseThemeStorageKey,
} from "./PublicThemeProvider";
export type { HouseTheme } from "./PublicThemeProvider";
export { PublicThemeScript } from "./PublicThemeScript";
export { PublicThemeSwitch } from "./PublicThemeSwitch";

// ── Спільні стилі / токен-класи ──
export {
  cx,
  PUB_FOCUS_RING,
  pubSurface,
  pubSurfaceElevated,
  pubQuiet,
  pubShadow,
  pubText,
  pubEyebrow,
  pubDisplay,
  pubToneClass,
  pubAccentStripColor,
} from "./pubStyles";
export type { PubTone } from "./pubStyles";

// ── Блок 9 · Примітиви ──
export { PubButton } from "./PubButton";
export type { PubButtonProps, PubButtonVariant, PubButtonSize } from "./PubButton";
export { PubBadge } from "./PubBadge";
export type { PubBadgeProps } from "./PubBadge";
export { PubCard } from "./PubCard";
export type { PubCardProps } from "./PubCard";
export { PubInput } from "./PubInput";
export type { PubInputProps } from "./PubInput";
export { PubTextarea } from "./PubTextarea";
export type { PubTextareaProps } from "./PubTextarea";
export { PubSelect } from "./PubSelect";
export type { PubSelectProps } from "./PubSelect";
export { PubFormField } from "./PubFormField";
export type { PubFormFieldProps } from "./PubFormField";
export { PubModal } from "./PubModal";
export type { PubModalProps } from "./PubModal";
export { PubSkeleton } from "./PubSkeleton";
export type { PubSkeletonProps } from "./PubSkeleton";
export { PubEmptyState } from "./PubEmptyState";
export type { PubEmptyStateProps } from "./PubEmptyState";

// ── Іконки ──
export { PubIcon } from "./PublicIcons";
export type { PubIconName, PubIconProps } from "./PublicIcons";
export * from "./PubSectionHeader";
export * from "./PubFilterTabs";
