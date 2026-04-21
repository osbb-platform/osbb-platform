alter table public.profiles
add column if not exists theme text default 'dark';

alter table public.profiles
add constraint profiles_theme_check
check (theme in ('dark', 'light'));
