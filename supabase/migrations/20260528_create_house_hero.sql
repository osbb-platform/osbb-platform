create table public.house_hero (
  id uuid primary key default gen_random_uuid(),

  house_id uuid not null unique references public.houses(id) on delete cascade,

  headline text not null default '',
  subheadline text not null default '',
  cta_label text not null default 'Відкрити оголошення',
  cover_image_url text null,

  lock_version int not null default 1,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index house_hero_house_id_idx
  on public.house_hero (house_id);

alter table public.house_hero enable row level security;

create policy "Admins manage house_hero"
  on public.house_hero
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

create policy "Public read house_hero"
  on public.house_hero
  for select
  to anon, authenticated
  using (true);
