create table public.house_announcements (
  id uuid primary key default gen_random_uuid(),

  house_id uuid not null references public.houses(id) on delete cascade,

  -- content
  title text not null,
  body text not null,
  level text not null default 'info'
    check (level in ('info', 'warning', 'danger')),

  -- lifecycle
  lifecycle_status text not null default 'draft'
    check (lifecycle_status in ('draft', 'published', 'archived')),
  lock_version int not null default 1,

  -- sorting
  sort_order int not null default 0,

  -- timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz null,
  archived_at timestamptz null,

  -- actor
  created_by uuid null references public.profiles(id) on delete set null
);

create index house_announcements_house_status_idx
  on public.house_announcements (house_id, lifecycle_status);

create index house_announcements_house_published_at_idx
  on public.house_announcements (house_id, published_at desc)
  where lifecycle_status = 'published';

alter table public.house_announcements enable row level security;

create policy "Admins manage house_announcements"
  on public.house_announcements
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
