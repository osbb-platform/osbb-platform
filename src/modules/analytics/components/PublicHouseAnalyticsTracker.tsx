"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import type { VisitorEventType } from "@/src/modules/analytics/ingest/visitorEventTypes";

type PublicHouseAnalyticsTrackerProps = {
  houseId: string;
  houseSlug: string;
};

const SECTION_KEYS = new Set([
  "announcements",
  "information",
  "board",
  "specialists",
  "reports",
  "plan",
  "meetings",
  "debtors",
  "requisites",
  "founding-documents",
]);

function getSectionKey(pathname: string, houseSlug: string) {
  const prefix = "";
  const relativePath = pathname.startsWith(prefix)
    ? pathname.slice(prefix.length)
    : pathname;
  const firstSegment = relativePath.split("/").filter(Boolean)[0];

  if (!firstSegment) {
    return "home";
  }

  return SECTION_KEYS.has(firstSegment) ? firstSegment : null;
}

function sendAnalyticsEvent(input: {
  houseId: string;
  houseSlug: string;
  eventType: VisitorEventType;
  sectionKey?: string | null;
  pathname?: string;
}) {
  try {
    const payload = JSON.stringify({
      houseId: input.houseId,
      eventType: input.eventType,
      sectionKey: input.sectionKey ?? null,
      metadata: {
        source: "public_house",
        houseSlug: input.houseSlug,
        sectionKey: input.sectionKey ?? null,
        pathname: input.pathname ?? null,
      },
    });

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/analytics/track", blob);
      return;
    }

    void fetch("/api/analytics/track", {
      method: "POST",
      body: payload,
      headers: {
        "Content-Type": "application/json",
      },
      keepalive: true,
    });
  } catch (error) {
    console.error("[analytics] Failed to send visitor event", error);
  }
}

export function PublicHouseAnalyticsTracker({
  houseId,
  houseSlug,
}: PublicHouseAnalyticsTrackerProps) {
  const pathname = usePathname();
  const visitedRef = useRef(false);

  const sectionKey = useMemo(
    () => getSectionKey(pathname, houseSlug),
    [houseSlug, pathname],
  );

  useEffect(() => {
    if (visitedRef.current) {
      return;
    }

    visitedRef.current = true;

    sendAnalyticsEvent({
      houseId,
      houseSlug,
      eventType: "site_visit",
      sectionKey,
      pathname,
    });
  }, [houseId, houseSlug, pathname, sectionKey]);

  useEffect(() => {
    if (!sectionKey) {
      return;
    }

    sendAnalyticsEvent({
      houseId,
      houseSlug,
      eventType: "section_view",
      sectionKey,
      pathname,
    });
  }, [houseId, houseSlug, pathname, sectionKey]);

  return null;
}
