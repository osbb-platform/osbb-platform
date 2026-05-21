alter table public.house_content_history
  rename column created_at to occurred_at;

alter table public.house_content_history
  add column if not exists diff jsonb null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'house_content_history_actor_admin_id_fkey'
  ) then
    alter table public.house_content_history
      add constraint house_content_history_actor_admin_id_fkey
      foreign key (actor_admin_id)
      references public.profiles(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'house_content_history_house_id_fkey'
  ) then
    alter table public.house_content_history
      add constraint house_content_history_house_id_fkey
      foreign key (house_id)
      references public.houses(id)
      on delete cascade;
  end if;
end $$;

drop index if exists public.house_content_history_house_idx;
drop index if exists public.house_content_history_entity_idx;
drop index if exists public.house_content_history_actor_idx;

create index if not exists house_content_history_house_time_idx
  on public.house_content_history (house_id, occurred_at desc);

create index if not exists house_content_history_entity_idx
  on public.house_content_history (entity_type, entity_id, occurred_at desc);

create index if not exists house_content_history_actor_idx
  on public.house_content_history (actor_admin_id, occurred_at desc);

drop policy if exists "Admins manage house_content_history"
  on public.house_content_history;

drop policy if exists "Authenticated read house_content_history"
  on public.house_content_history;

create policy "Admins read history"
  on public.house_content_history
  for select
  to authenticated
  using (
    public.get_my_admin_role() is not null
    and public.get_my_admin_role() != 'inactive'
  );

create policy "Admins insert history"
  on public.house_content_history
  for insert
  to authenticated
  with check (
    public.get_my_admin_role() is not null
    and public.get_my_admin_role() != 'inactive'
  );
