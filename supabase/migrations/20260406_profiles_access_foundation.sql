do $$
begin
  if to_regclass('public.admin_memberships') is not null
     and to_regclass('public.profiles') is not null then
    update public.admin_memberships
    set role = 'manager'
    where role::text = 'employee';

    update public.admin_memberships
    set role = 'superadmin'
    where role::text = 'super_admin';

    alter table public.admin_memberships
      add column if not exists status text not null default 'invited',
      add column if not exists job_title text,
      add column if not exists invited_by uuid references public.profiles(id) on delete set null,
      add column if not exists invited_at timestamptz,
      add column if not exists activated_at timestamptz,
      add column if not exists archived_at timestamptz,
      add column if not exists last_invite_sent_at timestamptz;

    update public.admin_memberships
    set status = 'active'
    where status is null;

    alter table public.admin_memberships
      drop constraint if exists admin_memberships_role_check;

    alter table public.admin_memberships
      add constraint admin_memberships_role_check
      check (role::text in ('superadmin', 'admin', 'manager'));

    alter table public.admin_memberships
      drop constraint if exists admin_memberships_status_check;

    alter table public.admin_memberships
      add constraint admin_memberships_status_check
      check (status in ('invited', 'active', 'inactive', 'archived'));

    create or replace function public.get_my_admin_role()
    returns text
    language sql
    stable
    security definer
    set search_path = public
    as $fn$
      select am.role::text
      from public.admin_memberships am
      where am.user_id = auth.uid()
        and am.status = 'active'
      order by
        case am.role::text
          when 'superadmin' then 1
          when 'admin' then 2
          when 'manager' then 3
          else 100
        end
      limit 1;
    $fn$;

    grant execute on function public.get_my_admin_role() to authenticated;
  end if;
end $$;
