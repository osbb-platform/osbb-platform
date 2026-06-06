create table public.house_board_intro (
  id uuid primary key default gen_random_uuid(),

  house_id uuid not null unique references public.houses(id) on delete cascade,

  intro text not null default '',

  lock_version int not null default 1,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index house_board_intro_house_id_idx
  on public.house_board_intro (house_id);

create table public.house_board_members (
  id uuid primary key default gen_random_uuid(),

  house_id uuid not null references public.houses(id) on delete cascade,

  role_status text not null
    check (role_status in ('chairman', 'vice_chairman', 'member', 'revision_commission')),

  name text not null,
  role text not null default '',
  phone text not null default '',
  email text not null default '',
  office_hours text not null default '',
  description text not null default '',
  sort_order int not null default 0,

  lock_version int not null default 1,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index house_board_members_house_id_idx
  on public.house_board_members (house_id);

create index house_board_members_house_role_sort_idx
  on public.house_board_members (house_id, role_status, sort_order);

create unique index house_board_members_chairman_unique
  on public.house_board_members (house_id)
  where role_status = 'chairman';

create unique index house_board_members_vice_chairman_unique
  on public.house_board_members (house_id)
  where role_status = 'vice_chairman';

alter table public.house_board_intro enable row level security;
alter table public.house_board_members enable row level security;

create policy "Admins manage house_board_intro"
  on public.house_board_intro
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

create policy "Public read house_board_intro"
  on public.house_board_intro
  for select
  to anon, authenticated
  using (true);

create policy "Admins manage house_board_members"
  on public.house_board_members
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

create policy "Public read house_board_members"
  on public.house_board_members
  for select
  to anon, authenticated
  using (true);
