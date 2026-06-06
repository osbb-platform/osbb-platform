import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { trackVisitorEvent } from "@/src/modules/analytics/ingest/trackVisitorEvent";
import {
  VISITOR_EVENT_TYPES,
  type VisitorEventType,
} from "@/src/modules/analytics/ingest/visitorEventTypes";
import {
  HOUSE_VISITOR_COOKIE_MAX_AGE_SECONDS,
  HOUSE_VISITOR_COOKIE_NAME,
} from "@/src/modules/analytics/utils/visitorId";

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

async function parsePayload(
  request: NextRequest,
): Promise<AnalyticsTrackPayload | null> {
  try {
    return (await request.json()) as AnalyticsTrackPayload;
  } catch {
    return null;
  }
}

function analyticsNoContent(sessionId?: string, shouldSetCookie = false) {
  const response = new NextResponse(null, { status: 204 });

  if (sessionId && shouldSetCookie) {
    response.cookies.set(HOUSE_VISITOR_COOKIE_NAME, sessionId, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: HOUSE_VISITOR_COOKIE_MAX_AGE_SECONDS,
    });
  }

  return response;
}

export async function POST(request: NextRequest) {
  const cookieSessionId = request.cookies.get(HOUSE_VISITOR_COOKIE_NAME)?.value;
  const sessionId = cookieSessionId || randomUUID();

  try {
    const payload = await parsePayload(request);

    if (!payload) {
      return analyticsNoContent(sessionId, !cookieSessionId);
    }

    const houseId = optionalString(payload.houseId);
    const eventType = payload.eventType;

    if (!houseId || !isVisitorEventType(eventType)) {
      return analyticsNoContent(sessionId, !cookieSessionId);
    }

    await trackVisitorEvent({
      houseId,
      sessionId,
      eventType,
      sectionKey: optionalString(payload.sectionKey),
      entityId: optionalString(payload.entityId),
      metadata: safeMetadata(payload.metadata),
    });

    return analyticsNoContent(sessionId, !cookieSessionId);
  } catch (error) {
    console.error("[analytics] Track route failed", error);
    return analyticsNoContent(sessionId, !cookieSessionId);
  }
}
