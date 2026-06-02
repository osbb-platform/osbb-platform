import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { trackVisitorEvent } from "@/src/modules/analytics/ingest/trackVisitorEvent";
import {
  VISITOR_EVENT_TYPES,
  type VisitorEventType,
} from "@/src/modules/analytics/ingest/visitorEventTypes";
import { HOUSE_VISITOR_COOKIE_NAME } from "@/src/modules/analytics/utils/visitorId";

type AnalyticsTrackPayload = {
  houseId?: unknown;
  eventType?: unknown;
  sectionKey?: unknown;
  entityId?: unknown;
  metadata?: unknown;
};

const VISITOR_EVENT_TYPE_SET = new Set<string>(VISITOR_EVENT_TYPES);

function isVisitorEventType(value: unknown): value is VisitorEventType {
  return typeof value === "string" && VISITOR_EVENT_TYPE_SET.has(value);
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function safeMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

async function parsePayload(request: Request): Promise<AnalyticsTrackPayload | null> {
  try {
    return (await request.json()) as AnalyticsTrackPayload;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const payload = await parsePayload(request);

    if (!payload) {
      return new NextResponse(null, { status: 204 });
    }

    const cookieStore = await cookies();
    const sessionId = cookieStore.get(HOUSE_VISITOR_COOKIE_NAME)?.value ?? "";
    const houseId = optionalString(payload.houseId);
    const eventType = payload.eventType;

    if (!sessionId || !houseId || !isVisitorEventType(eventType)) {
      return new NextResponse(null, { status: 204 });
    }

    await trackVisitorEvent({
      houseId,
      sessionId,
      eventType,
      sectionKey: optionalString(payload.sectionKey),
      entityId: optionalString(payload.entityId),
      metadata: safeMetadata(payload.metadata),
    });
  } catch (error) {
    console.error("[analytics] Track route failed", error);
  }

  return new NextResponse(null, { status: 204 });
}
