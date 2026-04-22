"use client";
import { houseCopy } from "@/src/shared/publicCopy/house";

import { useEffect, useRef, useState } from "react";
import type { PublicHouseBellFeed } from "@/src/modules/houses/services/getPublicHouseBellFeed";
import { PublicHouseBellPopup } from "@/src/modules/houses/components/PublicHouseBellPopup";

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

    const lastSeen = sessionStorage.getItem(storageKey);
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
        className={`relative inline-flex h-12 w-12 items-center justify-center rounded-full border text-slate-800 transition duration-200 ${
          open
            ? "border-[#D5CCC3] bg-white shadow-[0_6px_20px_rgba(28,24,19,0.08)]"
            : hasUnread
              ? "border-[#E6D8D8] bg-[#FDF3F3] text-[#7A3E3E] shadow-[0_4px_16px_rgba(120,40,40,0.08)] hover:bg-[#FBEAEA]"
              : "border-[#DDD6CE] bg-[#F3EFEA] hover:bg-white hover:-translate-y-[1px] hover:shadow-[0_6px_20px_rgba(28,24,19,0.06)]"
        }`}
        aria-label={houseCopy.bell.aria}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
          <path d="M9.5 17a2.5 2.5 0 0 0 5 0" />
        </svg>

        {badge ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-[22px] min-w-[22px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-semibold text-white shadow-sm">
            {badge}
          </span>
        ) : null}
      </button>

      {open ? <PublicHouseBellPopup items={feed.items} /> : null}
    </div>
  );
}