import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import type { VisitorEventType } from "@/src/modules/analytics/ingest/visitorEventTypes";

type TrackVisitorEventInput = {
  houseId: string;
  sessionId: string;
  eventType: VisitorEventType;
  sectionKey?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
};

const SAFE_METADATA_KEYS = new Set([
  "source",
  "sectionKey",
  "houseSlug",
  "pathname",
  "documentType",
]);

function sanitizeMetadata(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(metadata).filter(([key, value]) => {
      if (!SAFE_METADATA_KEYS.has(key)) {
        return false;
      }

      return (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null
      );
    }),
  );
}

function normalizeVisitorEvent(input: TrackVisitorEventInput) {
  if (!input.houseId || !input.sessionId || !input.eventType) {
    return null;
  }

  return {
    house_id: input.houseId,
    session_id: input.sessionId,
    event_type: input.eventType,
    section_key: input.sectionKey ?? null,
    entity_id: input.entityId ?? null,
    metadata: sanitizeMetadata(input.metadata),
  };
}

export async function trackVisitorEvents(inputs: TrackVisitorEventInput[]) {
  try {
    const rows = inputs
      .map(normalizeVisitorEvent)
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .slice(0, 20);

    if (rows.length === 0) {
      return;
    }

    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.from("house_visitor_events").insert(rows);

    if (error) {
      console.error("[analytics] Failed to track visitor events", error.message);
    }
  } catch (error) {
    console.error("[analytics] Visitor events tracking failed", error);
  }
}

export async function trackVisitorEvent(input: TrackVisitorEventInput) {
  await trackVisitorEvents([input]);
}
