-- S1.T9 — protect SECURITY DEFINER functions from search_path hijacking.
--
-- This additive migration changes only per-function configuration.
-- Function bodies, signatures, owners, grants and behavior remain unchanged.
--
-- All non-pg_catalog objects referenced by these functions are already
-- schema-qualified through public.*, auth.* or extensions.*.

alter function public.cleanup_platform_change_history()
  set search_path = '';

alter function public.cleanup_platform_tasks()
  set search_path = '';

alter function public.create_house_session(
  text,
  text,
  text,
  integer
)
  set search_path = '';

alter function public.get_my_admin_role()
  set search_path = '';

alter function public.handle_new_user()
  set search_path = '';

alter function public.is_authenticated_admin()
  set search_path = '';

alter function public.is_house_session_valid(
  text,
  text
)
  set search_path = '';

alter function public.upsert_house_access(
  uuid,
  text
)
  set search_path = '';

alter function public.verify_house_access(
  text,
  text
)
  set search_path = '';
