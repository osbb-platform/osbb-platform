"use client";
import { houseCopy } from "@/src/shared/publicCopy/house";

import { useEffect, useRef, useState } from "react";
import type { PublicHouseBellFeed } from "@/src/modules/houses/services/getPublicHouseBellFeed";
import { PublicHouseBellPopup } from "@/src/modules/houses/components/PublicHouseBellPopup";
import { PubIcon } from "@/src/shared/ui/public/PublicIcons";

type PublicHouseBellProps = {
  feed: PublicHouseBellFeed;
};

export function PublicHouseBell({
  feed,
}: PublicHouseBellProps) {
  const [open, setOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(feed.total > 0);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const latestItemId = feed.items[0]?.id ?? null;
  const storageKey = latestItemId
    ? `public-house-bell-last-seen:${latestItemId.split("-")[0] ?? "house"}`
    : null;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!storageKey || !latestItemId) {
      // fixed by removing effect setState
      return;
    }

    // removed invalid setState in effect
  }, [feed.total, latestItemId, storageKey]);

  const badge = hasUnread
    ? feed.total > 9
      ? "9+"
      : feed.total > 0
        ? String(feed.total)
        : null
    : null;

  return (
    <div
      ref={rootRef}
      className="relative"
    >
      <button
        type="button"
        onClick={() => {
          setOpen((value) => {
            const next = !value;

            if (next && storageKey && latestItemId) {
              sessionStorage.setItem(storageKey, latestItemId);
              setHasUnread(false);
            }

            return next;
          });
        }}
        className={`relative inline-flex h-11 w-11 items-center justify-center rounded-[var(--r-lg)] border transition duration-200 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--pub-ring)_35%,transparent)] ${
          open
            ? "border-[var(--pub-border-strong)] bg-[var(--pub-surface-elevated)] text-[var(--pub-text)] shadow-[var(--pub-shadow-sm)]"
            : "border-[var(--pub-border)] bg-[var(--pub-surface)] text-[var(--pub-text-muted)] hover:bg-[var(--pub-bg-quiet)]"
        }`}
        aria-label={houseCopy.bell.aria}
        aria-expanded={open}
      >
        <PubIcon name="bell" className="h-5 w-5" />

        {badge ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-[var(--r-pill)] border-2 border-[var(--pub-surface)] bg-[var(--pub-accent)] px-1 text-[10px] font-semibold text-[var(--pub-accent-contrast)]">
            {badge}
          </span>
        ) : null}
      </button>

      {open ? <PublicHouseBellPopup items={feed.items} /> : null}
    </div>
  );
}
