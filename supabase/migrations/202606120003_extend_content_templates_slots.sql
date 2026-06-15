alter table if exists public.content_templates
  add column if not exists section_kind text null;

alter table if exists public.content_templates
  add column if not exists slot_index integer null;

alter table if exists public.content_templates
  add column if not exists name text null;

alter table if exists public.content_templates
  add column if not exists created_by uuid null references public.profiles(id) on delete set null;

update public.content_templates
set
  section_kind = coalesce(
    section_kind,
    case
      when section_key = 'information_posts' then 'information_post'
      else section_key
    end
  ),
  slot_index = coalesce(slot_index, greatest(coalesce(sort_order, 0) / 10, 1)),
  name = coalesce(nullif(trim(name), ''), title)
where section_kind is null
   or slot_index is null
   or name is null
   or trim(name) = '';

alter table if exists public.content_templates
  alter column section_kind set not null;

alter table if exists public.content_templates
  alter column slot_index set not null;

alter table if exists public.content_templates
  alter column name set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'content_templates_section_kind_check'
  ) then
    alter table public.content_templates
      add constraint content_templates_section_kind_check
      check (section_kind in ('faq', 'specialists', 'information_post'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'content_templates_slot_index_check'
  ) then
    alter table public.content_templates
      add constraint content_templates_slot_index_check
      check (slot_index > 0);
  end if;
end $$;

create unique index if not exists content_templates_section_kind_slot_unique
  on public.content_templates (section_kind, slot_index);

drop policy if exists "content_templates_manage_authenticated_admins" on public.content_templates;

create policy "content_templates_manage_authenticated_admins"
on public.content_templates
for all
to authenticated
using (
  public.get_my_admin_role() is not null
  and public.get_my_admin_role() != 'inactive'
)
with check (
  public.get_my_admin_role() is not null
  and public.get_my_admin_role() != 'inactive'
);
