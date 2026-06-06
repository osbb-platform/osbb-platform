create table public.house_information_posts (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses(id) on delete cascade,
  headline text not null,
  body text not null,
  category text not null
    check (
      category in (
        'Про будинок',
        'Правила проживання',
        'Корисна інформація',
        'Контакти служб',
        'Інструкції для мешканців'
      )
    ),
  is_pinned boolean not null default false,
  lifecycle_status text not null default 'draft'
    check (lifecycle_status in ('draft', 'published', 'archived')),
  lock_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz null,
  archived_at timestamptz null,
  created_by uuid null references public.profiles(id) on delete set null
);

create index house_information_posts_house_status_idx
  on public.house_information_posts (house_id, lifecycle_status);

create index house_information_posts_house_pinned_updated_idx
  on public.house_information_posts (house_id, is_pinned desc, updated_at desc);

alter table public.house_information_posts enable row level security;

create policy "Admins manage house_information_posts"
  on public.house_information_posts
  for all
  using (
    (public.get_my_admin_role() is not null)
    and (public.get_my_admin_role() <> 'inactive'::text)
  )
  with check (
    (public.get_my_admin_role() is not null)
    and (public.get_my_admin_role() <> 'inactive'::text)
  );

create policy "Public read published house_information_posts"
  on public.house_information_posts
  for select
  using (lifecycle_status = 'published');
