begin;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.districts'::regclass
      and conname = 'districts_name_key'
      and contype = 'u'
  ) then
    alter table public.districts
      drop constraint districts_name_key;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.districts'::regclass
      and conname = 'districts_slug_key'
      and contype = 'u'
  ) then
    alter table public.districts
      drop constraint districts_slug_key;
  end if;
end
$$;

create unique index if not exists districts_city_name_uidx
  on public.districts(city_id, name);

create unique index if not exists districts_city_slug_uidx
  on public.districts(city_id, slug);

commit;
