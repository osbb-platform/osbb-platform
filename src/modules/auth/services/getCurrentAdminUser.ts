import { createSupabaseServerClient } from "@/src/integrations/supabase/server/server";
import type {
  CurrentAdminUser,
  MembershipStatus,
} from "@/src/shared/types/entities/admin.types";
import { ROLES } from "@/src/shared/constants/roles/roles.constants";
import { getResolvedAccess } from "@/src/shared/permissions/rbac.guards";

type AdminMembershipRow = {
  id: string;
  role: string | null;
  status: string | null;
  job_title: string | null;
  is_active: boolean | null;
  house_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function normalizeMembershipStatus(
  value: string | null | undefined,
): MembershipStatus | null {
  if (value === "invited") return "invited";
  if (value === "active") return "active";
  if (value === "inactive") return "inactive";
  if (value === "archived") return "archived";
  return null;
}

function normalizeRole(value: string | null | undefined) {
  if (value === "super_admin") return ROLES.SUPERADMIN;
  if (value === "employee") return ROLES.MANAGER;
  if (value === ROLES.SUPERADMIN) return ROLES.SUPERADMIN;
  if (value === ROLES.ADMIN) return ROLES.ADMIN;
  if (value === ROLES.MANAGER) return ROLES.MANAGER;
  return null;
}

function getRolePriority(role: string | null | undefined) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === ROLES.SUPERADMIN) return 3;
  if (normalizedRole === ROLES.ADMIN) return 2;
  if (normalizedRole === ROLES.MANAGER) return 1;
  return 0;
}

function getStatusPriority(status: string | null | undefined) {
  const normalizedStatus = normalizeMembershipStatus(status);

  if (normalizedStatus === "active") return 3;
  if (normalizedStatus === "invited") return 2;
  if (normalizedStatus === "inactive") return 1;
  return 0;
}

function pickBestMembership(rows: AdminMembershipRow[]) {
  if (!rows.length) {
    return null;
  }

  const sorted = [...rows].sort((a, b) => {
    const statusDiff = getStatusPriority(b.status) - getStatusPriority(a.status);
    if (statusDiff !== 0) return statusDiff;

    const roleDiff = getRolePriority(b.role) - getRolePriority(a.role);
    if (roleDiff !== 0) return roleDiff;

    const updatedA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const updatedB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    if (updatedB !== updatedA) return updatedB - updatedA;

    const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return createdB - createdA;
  });

  return sorted[0] ?? null;
}

export async function getCurrentAdminUser(): Promise<CurrentAdminUser | null> {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user: authUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("❌ getCurrentAdminUser auth.getUser error:", userError.message);
      return null;
    }

    if (!authUser) {
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", authUser.id)
      .maybeSingle();

    if (profileError) {
      console.error("❌ getCurrentAdminUser profile error:", profileError.message);
      return null;
    }

    const { data: memberships, error: membershipError } = await supabase
      .from("admin_memberships")
      .select("id, role, status, job_title, is_active, house_id, created_at, updated_at")
      .eq("user_id", authUser.id)
      .is("house_id", null)
      .eq("is_active", true);

    if (membershipError) {
      console.error("❌ getCurrentAdminUser membership error:", membershipError.message);
      return null;
    }

    const bestMembership = pickBestMembership(
      (memberships ?? []) as AdminMembershipRow[],
    );

    const role = normalizeRole(bestMembership?.role ?? null);
    const status = normalizeMembershipStatus(bestMembership?.status ?? null);
    const access = getResolvedAccess(role);

    return {
      id: authUser.id,
      email: profile?.email ?? authUser.email ?? null,
      fullName: profile?.full_name ?? null,
      role,
      status,
      jobTitle: bestMembership?.job_title ?? null,
      canManageEmployees:
        access.employees.createManager ||
        access.employees.createAdmin ||
        access.employees.delete ||
        access.employees.resendInvite,
    };
  } catch (error) {
    console.error("🔥 getCurrentAdminUser crash:", error);
    return null;
  }
}
