import { randomUUID } from "node:crypto";
import {
  NextRequest,
  NextResponse,
} from "next/server";

import { trackVisitorEvents } from "@/src/modules/analytics/ingest/trackVisitorEvent";
import {
  VISITOR_EVENT_TYPES,
  type VisitorEventType,
} from "@/src/modules/analytics/ingest/visitorEventTypes";
import {
  HOUSE_VISITOR_COOKIE_MAX_AGE_SECONDS,
  HOUSE_VISITOR_COOKIE_NAME,
} from "@/src/modules/analytics/utils/visitorId";
import { getClientIpAddress } from "@/src/shared/security/clientIp";
import { RATE_LIMIT_POLICIES } from "@/src/shared/security/rateLimitPolicies";
import { consumeRateLimit } from "@/src/shared/security/serverRateLimit";

type AnalyticsTrackEventPayload = {
  eventType?: unknown;
  sectionKey?: unknown;
  entityId?: unknown;
  metadata?: unknown;
};

type AnalyticsTrackPayload =
  AnalyticsTrackEventPayload & {
    houseId?: unknown;
    events?: unknown;
  };

const VISITOR_EVENT_TYPE_SET =
  new Set<string>(VISITOR_EVENT_TYPES);

const MAX_BATCH_EVENTS = 20;

function isVisitorEventType(
  value: unknown,
): value is VisitorEventType {
  return (
    typeof value === "string"
    && VISITOR_EVENT_TYPE_SET.has(value)
  );
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function safeMetadata(value: unknown) {
  if (
    !value
    || typeof value !== "object"
    || Array.isArray(value)
  ) {
    return {};
  }

  return value as Record<string, unknown>;
}

async function parsePayload(
  request: NextRequest,
): Promise<AnalyticsTrackPayload | null> {
  try {
    return (
      await request.json()
    ) as AnalyticsTrackPayload;
  } catch {
    return null;
  }
}

function setVisitorCookie(
  response: NextResponse,
  sessionId: string,
  shouldSetCookie: boolean,
) {
  if (!shouldSetCookie) {
    return;
  }

  response.cookies.set(
    HOUSE_VISITOR_COOKIE_NAME,
    sessionId,
    {
      httpOnly: false,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV === "production",
      path: "/",
      maxAge:
        HOUSE_VISITOR_COOKIE_MAX_AGE_SECONDS,
    },
  );
}

function analyticsNoContent(
  sessionId: string,
  shouldSetCookie = false,
) {
  const response = new NextResponse(null, {
    status: 204,
  });

  setVisitorCookie(
    response,
    sessionId,
    shouldSetCookie,
  );

  return response;
}

function analyticsRateLimited(
  sessionId: string,
  shouldSetCookie: boolean,
  retryAfterSeconds: number,
) {
  const response = new NextResponse(null, {
    status: 429,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Retry-After": String(
        Math.max(1, retryAfterSeconds),
      ),
    },
  });

  setVisitorCookie(
    response,
    sessionId,
    shouldSetCookie,
  );

  return response;
}

function getPayloadEvents(
  payload: AnalyticsTrackPayload,
) {
  if (Array.isArray(payload.events)) {
    return payload.events
      .filter(
        (
          event,
        ): event is AnalyticsTrackEventPayload =>
          !!event
          && typeof event === "object"
          && !Array.isArray(event),
      )
      .slice(0, MAX_BATCH_EVENTS);
  }

  return [payload];
}

export async function POST(
  request: NextRequest,
) {
  const cookieSessionId =
    request.cookies.get(
      HOUSE_VISITOR_COOKIE_NAME,
    )?.value;

  const sessionId =
    cookieSessionId || randomUUID();

  try {
    const rateLimit = await consumeRateLimit(
      RATE_LIMIT_POLICIES.analyticsIngest,
      getClientIpAddress(request.headers),
    );

    if (!rateLimit.allowed) {
      return analyticsRateLimited(
        sessionId,
        !cookieSessionId,
        rateLimit.retryAfterSeconds,
      );
    }

    const payload = await parsePayload(request);

    if (!payload) {
      return analyticsNoContent(
        sessionId,
        !cookieSessionId,
      );
    }

    const houseId =
      optionalString(payload.houseId);

    if (!houseId) {
      return analyticsNoContent(
        sessionId,
        !cookieSessionId,
      );
    }

    const events = getPayloadEvents(payload)
      .map((event) => ({
        houseId,
        sessionId,
        eventType: event.eventType,
        sectionKey: optionalString(
          event.sectionKey,
        ),
        entityId: optionalString(
          event.entityId,
        ),
        metadata: safeMetadata(
          event.metadata,
        ),
      }))
      .filter(
        (
          event,
        ): event is typeof event & {
          eventType: VisitorEventType;
        } => isVisitorEventType(
          event.eventType,
        ),
      );

    if (events.length === 0) {
      return analyticsNoContent(
        sessionId,
        !cookieSessionId,
      );
    }

    await trackVisitorEvents(events);

    return analyticsNoContent(
      sessionId,
      !cookieSessionId,
    );
  } catch (error) {
    console.error(
      "[analytics] Track route failed",
      error,
    );

    return analyticsNoContent(
      sessionId,
      !cookieSessionId,
    );
  }
}
