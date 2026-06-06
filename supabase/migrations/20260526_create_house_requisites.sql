create table public.house_requisites (
  id uuid primary key default gen_random_uuid(),

  house_id uuid not null unique references public.houses(id) on delete cascade,

  recipient text not null default '',
  iban text not null default '',
  edrpou text not null default '',
  bank text not null default '',
  purpose_template text not null default '',
  payment_url text not null default '',
  payment_button_label text not null default 'Перейти до оплати',

  lock_version int not null default 1,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index house_requisites_house_id_idx
  on public.house_requisites (house_id);

alter table public.house_requisites enable row level security;

create policy "Admins manage house_requisites"
  on public.house_requisites
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


create policy "Public read house_requisites"
  on public.house_requisites
  for select
  to anon, authenticated
  using (true);
