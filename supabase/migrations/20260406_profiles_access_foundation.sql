-- STEP 1: Profiles / Employees foundation
-- Safe migration for OSBB Platform CMS

-- 1) Normalize existing roles
update public.admin_memberships
set role = 'manager'
where role = 'employee';

update public.admin_memberships
set role = 'superadmin'
where role = 'super_admin';

-- 2) Add lifecycle + employee metadata
alter table public.admin_memberships
add column if not exists status text not null default 'invited',
add column if not exists job_title text,
add column if not exists invited_by uuid references public.profiles(id) on delete set null,
add column if not exists invited_at timestamptz,
add column if not exists activated_at timestamptz,
add column if not exists archived_at timestamptz,
add column if not exists last_invite_sent_at timestamptz;

-- 3) Normalize existing rows
update public.admin_memberships
set status = 'active'
where status is null;

-- 4) Role constraint refresh
alter table public.admin_memberships
drop constraint if exists admin_memberships_role_check;

alter table public.admin_memberships
add constraint admin_memberships_role_check
check (role in ('superadmin', 'admin', 'manager'));

-- 5) Status constraint
alter table public.admin_memberships
drop constraint if exists admin_memberships_status_check;

alter table public.admin_memberships
add constraint admin_memberships_status_check
check (status in ('invited', 'active', 'inactive', 'archived'));

-- 6) Replace RPC role resolver
create or replace function public.get_my_admin_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select am.role
  from public.admin_memberships am
  where am.admin_id = auth.uid()
    and am.status = 'active'
  order by
    case am.role
      when 'superadmin' then 1
      when 'admin' then 2
      when 'manager' then 3
      else 100
    end
  limit 1;
$$;

grant execute on function public.get_my_admin_role() to authenticated;
