import type { SupabaseClient } from "@supabase/supabase-js";

export async function writeHistory(
  supabase: SupabaseClient,
  params: {
    actor: {
      id: string;
      fullName: string | null;
      email: string | null;
      role: string | null;
    };
    houseId: string;
    entry: {
      entityType: string;
      entityId: string;
      action: string;
      description: string;
      beforeSnapshot?: unknown;
      afterSnapshot?: unknown;
      metadata?: Record<string, unknown>;
    };
  },
) {
  try {
    const { error } = await supabase.from("house_content_history").insert({
      actor_admin_id: params.actor.id,
      actor_name: params.actor.fullName ?? params.actor.email ?? "Адміністратор",
      actor_email: params.actor.email,
      actor_role: params.actor.role,
      house_id: params.houseId,
      entity_type: params.entry.entityType,
      entity_id: params.entry.entityId,
      action: params.entry.action,
      description: params.entry.description,
      before_snapshot: params.entry.beforeSnapshot ?? null,
      after_snapshot: params.entry.afterSnapshot ?? null,
      metadata: params.entry.metadata ?? {},
    });

    if (error) {
      console.error("writeHistory failed (non-blocking):", error);
    }
  } catch (error) {
    console.error("writeHistory failed (non-blocking):", error);
  }
}
