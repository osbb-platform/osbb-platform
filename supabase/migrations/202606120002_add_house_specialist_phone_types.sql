alter table if exists public.house_specialists
  add column if not exists phone_types jsonb not null default '[]'::jsonb;

update public.house_specialists
set phone_types = coalesce(phone_types, '[]'::jsonb)
where phone_types is null;
