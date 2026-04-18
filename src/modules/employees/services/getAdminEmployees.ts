import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import { ROLES } from "@/src/shared/constants/roles/roles.constants";

export type AdminEmployeeRecord = {
  membershipId: string;
  userId: string | null;
  fullName: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
  jobTitle: string | null;
  isActive: boolean;
  invitedAt: string | null;
  activatedAt: string | null;
  archivedAt: string | null;
  lastInviteSentAt: string | null;
  createdAt: string | null;
};

export async function getAdminEmployees(): Promise<AdminEmployeeRecord[]> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("admin_memberships")
      .select("*")
      .is("house_id", null)
      .neq("role", ROLES.SUPERADMIN)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ getAdminEmployees error:", error.message);
      return [];
    }

    return (data ?? []).map((m) => ({
      membershipId: m.id,
      userId: m.user_id ?? null,
      fullName: m.full_name_snapshot ?? null,
      email: m.invite_email ?? null,
      role: m.role ?? null,
      status: m.status ?? null,
      jobTitle: m.job_title ?? null,
      isActive: Boolean(m.is_active),
      invitedAt: m.invited_at ?? null,
      activatedAt: m.activated_at ?? null,
      archivedAt: m.archived_at ?? null,
      lastInviteSentAt: m.last_invite_sent_at ?? null,
      createdAt: m.created_at ?? null,
    }));
  } catch (e) {
    console.error("🔥 getAdminEmployees crash:", e);
    return [];
  }
}
