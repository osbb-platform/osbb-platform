begin;

grant select, insert, update on table public.house_apartments to authenticated;
grant select, update on table public.house_access to authenticated;

drop policy if exists house_apartments_select_authenticated on public.house_apartments;
drop policy if exists house_apartments_insert_authenticated on public.house_apartments;
drop policy if exists house_apartments_update_authenticated on public.house_apartments;

create policy house_apartments_select_scoped
on public.house_apartments
for select to authenticated
using (public.admin_has_house_access(house_id));

create policy house_apartments_insert_scoped
on public.house_apartments
for insert to authenticated
with check (public.admin_has_house_access(house_id));

create policy house_apartments_update_scoped
on public.house_apartments
for update to authenticated
using (public.admin_has_house_access(house_id))
with check (public.admin_has_house_access(house_id));

drop policy if exists "Authenticated admins can read house access" on public.house_access;
drop policy if exists "Authenticated admins can update house access" on public.house_access;

create policy house_access_select_scoped
on public.house_access
for select to authenticated
using (public.admin_has_house_access(house_id));

create policy house_access_update_scoped
on public.house_access
for update to authenticated
using (public.admin_has_house_access(house_id))
with check (public.admin_has_house_access(house_id));

create or replace function public.upsert_house_access(
  target_house_id uuid,
  raw_password text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if auth.role() <> 'service_role'
     and not public.admin_has_house_access(target_house_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  insert into public.house_access (
    house_id,
    password_hash,
    session_version,
    updated_by
  )
  values (
    target_house_id,
    extensions.crypt(raw_password, extensions.gen_salt('bf')),
    1,
    case when auth.role() = 'authenticated' then auth.uid() else null end
  )
  on conflict (house_id)
  do update set
    password_hash = excluded.password_hash,
    session_version = public.house_access.session_version + 1,
    updated_by = case
      when auth.role() = 'authenticated' then auth.uid()
      else public.house_access.updated_by
    end,
    updated_at = timezone('utc', now());
end;
$function$;

revoke all on function public.upsert_house_access(uuid, text)
from public, anon, authenticated;

grant execute on function public.upsert_house_access(uuid, text)
to authenticated, service_role;

commit;
