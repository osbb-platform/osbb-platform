do $$
begin
  if to_regclass('public.profiles') is not null then
    alter table public.profiles
      add column if not exists theme text default 'dark';

    alter table public.profiles
      drop constraint if exists profiles_theme_check;

    alter table public.profiles
      add constraint profiles_theme_check
      check (theme in ('dark', 'light'));
  end if;
end $$;
