create index if not exists platform_change_history_metadata_gin_idx
  on public.platform_change_history
  using gin (metadata);

create index if not exists platform_change_history_source_type_idx
  on public.platform_change_history ((metadata->>'sourceType'));

create index if not exists platform_change_history_main_section_idx
  on public.platform_change_history ((metadata->>'mainSectionLabel'));

create index if not exists platform_change_history_sub_section_idx
  on public.platform_change_history ((metadata->>'subSectionLabel'));

create index if not exists platform_change_history_house_name_idx
  on public.platform_change_history ((metadata->>'houseName'));

create or replace function public.cleanup_platform_change_history()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.platform_change_history
  where metadata->>'sourceType' = 'cms'
    and created_at < timezone('utc', now()) - interval '60 days';

  delete from public.platform_change_history
  where metadata->>'sourceType' = 'house_portal'
    and created_at < timezone('utc', now()) - interval '90 days';
end;
$$;

comment on function public.cleanup_platform_change_history()
is 'Удаляет старые записи истории: cms старше 60 дней, house_portal старше 90 дней.';
EOFcat <<'EOF' > supabase/migrations/20260405_upgrade_platform_change_history.sql
create index if not exists platform_change_history_metadata_gin_idx
  on public.platform_change_history
  using gin (metadata);

create index if not exists platform_change_history_source_type_idx
  on public.platform_change_history ((metadata->>'sourceType'));

create index if not exists platform_change_history_main_section_idx
  on public.platform_change_history ((metadata->>'mainSectionLabel'));

create index if not exists platform_change_history_sub_section_idx
  on public.platform_change_history ((metadata->>'subSectionLabel'));

create index if not exists platform_change_history_house_name_idx
  on public.platform_change_history ((metadata->>'houseName'));

create or replace function public.cleanup_platform_change_history()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.platform_change_history
  where metadata->>'sourceType' = 'cms'
    and created_at < timezone('utc', now()) - interval '60 days';

  delete from public.platform_change_history
  where metadata->>'sourceType' = 'house_portal'
    and created_at < timezone('utc', now()) - interval '90 days';
end;
$$;

comment on function public.cleanup_platform_change_history()
is 'Удаляет старые записи истории: cms старше 60 дней, house_portal старше 90 дней.';
