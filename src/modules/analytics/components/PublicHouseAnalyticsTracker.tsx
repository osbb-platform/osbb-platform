"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import type { VisitorEventType } from "@/src/modules/analytics/ingest/visitorEventTypes";

type PublicHouseAnalyticsTrackerProps = {
  houseId: string;
  houseSlug: string;
};

type AnalyticsBatchEvent = {
  eventType: VisitorEventType;
  sectionKey?: string | null;
  metadata: {
    source: "public_house";
    houseSlug: string;
    sectionKey: string | null;
    pathname: string;
  };
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

function getSectionKey(pathname: string) {
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

function sendAnalyticsEvents(input: {
  houseId: string;
  events: AnalyticsBatchEvent[];
}) {
  try {
    if (input.events.length === 0) {
      return;
    }

    const payload = JSON.stringify({
      houseId: input.houseId,
      events: input.events,
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
    console.error("[analytics] Failed to send visitor events", error);
  }
}

export function PublicHouseAnalyticsTracker({
  houseId,
  houseSlug,
}: PublicHouseAnalyticsTrackerProps) {
  const pathname = usePathname();
  const visitedRef = useRef(false);

  const sectionKey = useMemo(
    () => getSectionKey(pathname),
    [pathname],
  );

  useEffect(() => {
    const events: AnalyticsBatchEvent[] = [];

    if (!visitedRef.current) {
      visitedRef.current = true;

      events.push({
        eventType: "site_visit",
        sectionKey,
        metadata: {
          source: "public_house",
          houseSlug,
          sectionKey,
          pathname,
        },
      });
    }

    if (sectionKey) {
      events.push({
        eventType: "section_view",
        sectionKey,
        metadata: {
          source: "public_house",
          houseSlug,
          sectionKey,
          pathname,
        },
      });
    }

    sendAnalyticsEvents({
      houseId,
      events,
    });
  }, [houseId, houseSlug, pathname, sectionKey]);

  return null;
}
