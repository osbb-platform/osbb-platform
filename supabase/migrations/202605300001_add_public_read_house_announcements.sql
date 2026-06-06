do $$
begin
  if to_regclass('public.house_announcements') is not null
     and not exists (
       select 1
       from pg_policies
       where schemaname = 'public'
         and tablename = 'house_announcements'
         and policyname = 'Public read published house_announcements'
     ) then
    create policy "Public read published house_announcements"
      on public.house_announcements
      for select
      using (lifecycle_status = 'published');
  end if;
end $$;
