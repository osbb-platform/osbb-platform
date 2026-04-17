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
      setHasUnread(feed.total > 0);
      return;
    }

    const lastSeen = sessionStorage.getItem(storageKey);
    setHasUnread(feed.total > 0 && lastSeen !== latestItemId);
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
        className={`relative inline-flex h-12 w-12 items-center justify-center rounded-full border text-slate-800 transition ${
          open
            ? "border-slate-300 bg-slate-100 shadow-sm"
            : "border-slate-200 bg-white hover:bg-slate-50"
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