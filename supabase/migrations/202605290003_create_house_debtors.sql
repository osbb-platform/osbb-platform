create table if not exists public.house_debtors_settings (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null unique references public.houses(id) on delete cascade,

  payment_url text not null default '',
  payment_title text not null default 'Оплата заборгованості',
  payment_note text not null default '',
  payment_button_label text not null default 'Сплатити',

  calculator_enabled boolean not null default false,
  calculator_court_fee text not null default '302.80',
  calculator_legal_aid text not null default '1000',
  calculator_inflation_rate text not null default '20',
  calculator_enforcement_rate text not null default '10',
  calculator_title text not null default 'Калькулятор судових витрат',
  calculator_note text not null default '',
  calculator_disclaimer text not null default '',

  lock_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.house_debtors_items (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses(id) on delete cascade,
  apartment_id uuid null references public.house_apartments(id) on delete set null,
  apartment_label text not null,
  account_number text not null default '',
  owner_name text not null default '',
  area numeric null,
  amount text not null,
  days text not null default '',
  lifecycle_status text not null default 'draft'
    check (lifecycle_status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists house_debtors_items_house_status_idx
  on public.house_debtors_items (house_id, lifecycle_status);

create index if not exists house_debtors_items_house_apartment_idx
  on public.house_debtors_items (house_id, apartment_id);

create index if not exists house_debtors_items_house_label_idx
  on public.house_debtors_items (house_id, apartment_label);

alter table public.house_debtors_settings enable row level security;
alter table public.house_debtors_items enable row level security;

drop policy if exists "Authenticated admins can manage house debtors settings" on public.house_debtors_settings;
create policy "Authenticated admins can manage house debtors settings"
  on public.house_debtors_settings
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Public can read house debtors settings" on public.house_debtors_settings;
create policy "Public can read house debtors settings"
  on public.house_debtors_settings
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Authenticated admins can manage house debtors items" on public.house_debtors_items;
create policy "Authenticated admins can manage house debtors items"
  on public.house_debtors_items
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Public can read published house debtors items" on public.house_debtors_items;
create policy "Public can read published house debtors items"
  on public.house_debtors_items
  for select
  to anon, authenticated
  using (lifecycle_status = 'published');

insert into public.house_debtors_settings (
  house_id,
  payment_url,
  payment_title,
  payment_note,
  payment_button_label,
  calculator_enabled,
  calculator_court_fee,
  calculator_legal_aid,
  calculator_inflation_rate,
  calculator_enforcement_rate,
  calculator_title,
  calculator_note,
  calculator_disclaimer,
  created_at,
  updated_at
)
select
  hp.house_id,
  coalesce(hs.content #>> '{payment,url}', ''),
  coalesce(nullif(btrim(hs.content #>> '{payment,title}'), ''), 'Оплата заборгованості'),
  coalesce(hs.content #>> '{payment,note}', ''),
  coalesce(nullif(btrim(hs.content #>> '{payment,buttonLabel}'), ''), 'Сплатити'),
  coalesce((hs.content #>> '{calculator,enabled}')::boolean, false),
  coalesce(nullif(btrim(hs.content #>> '{calculator,courtFee}'), ''), '302.80'),
  coalesce(nullif(btrim(hs.content #>> '{calculator,legalAid}'), ''), '1000'),
  coalesce(nullif(btrim(hs.content #>> '{calculator,inflationRate}'), ''), '20'),
  coalesce(nullif(btrim(hs.content #>> '{calculator,enforcementRate}'), ''), '10'),
  coalesce(nullif(btrim(hs.content #>> '{calculator,title}'), ''), 'Калькулятор судових витрат'),
  coalesce(hs.content #>> '{calculator,note}', ''),
  coalesce(hs.content #>> '{calculator,disclaimer}', ''),
  hs.created_at,
  hs.updated_at
from public.house_sections hs
join public.house_pages hp on hp.id = hs.house_page_id
where hs.kind = 'debtors'
on conflict (house_id) do update
set
  payment_url = excluded.payment_url,
  payment_title = excluded.payment_title,
  payment_note = excluded.payment_note,
  payment_button_label = excluded.payment_button_label,
  calculator_enabled = excluded.calculator_enabled,
  calculator_court_fee = excluded.calculator_court_fee,
  calculator_legal_aid = excluded.calculator_legal_aid,
  calculator_inflation_rate = excluded.calculator_inflation_rate,
  calculator_enforcement_rate = excluded.calculator_enforcement_rate,
  calculator_title = excluded.calculator_title,
  calculator_note = excluded.calculator_note,
  calculator_disclaimer = excluded.calculator_disclaimer,
  updated_at = excluded.updated_at;

insert into public.house_debtors_items (
  house_id,
  apartment_id,
  apartment_label,
  account_number,
  owner_name,
  area,
  amount,
  days,
  lifecycle_status,
  created_at,
  updated_at
)
select
  hp.house_id,
  case
    when item_data.item->>'apartmentId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then (item_data.item->>'apartmentId')::uuid
    else null
  end,
  coalesce(nullif(btrim(item_data.item->>'apartmentLabel'), ''), '—'),
  coalesce(item_data.item->>'accountNumber', ''),
  coalesce(item_data.item->>'ownerName', ''),
  case
    when jsonb_typeof(item_data.item->'area') = 'number'
      then (item_data.item->>'area')::numeric
    else null
  end,
  coalesce(nullif(btrim(item_data.item->>'amount'), ''), '0'),
  coalesce(item_data.item->>'days', ''),
  item_data.lifecycle_status,
  hs.created_at,
  hs.updated_at
from public.house_sections hs
join public.house_pages hp on hp.id = hs.house_page_id
cross join lateral (
  select item, 'published'::text as lifecycle_status
  from jsonb_array_elements(
    case
      when jsonb_typeof(hs.content->'activeItems') = 'array'
        then hs.content->'activeItems'
      else '[]'::jsonb
    end
  ) as active_items(item)

  union all

  select item, 'draft'::text as lifecycle_status
  from jsonb_array_elements(
    case
      when jsonb_typeof(hs.content->'draftItems') = 'array'
        then hs.content->'draftItems'
      else '[]'::jsonb
    end
  ) as draft_items(item)
) as item_data
where hs.kind = 'debtors'
  and coalesce(nullif(btrim(item_data.item->>'amount'), ''), '0') <> '0';

create or replace function public.publish_house_debtors_draft(p_house_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.house_debtors_items
  set
    lifecycle_status = 'archived',
    updated_at = now()
  where house_id = p_house_id
    and lifecycle_status = 'published';

  update public.house_debtors_items
  set
    lifecycle_status = 'published',
    updated_at = now()
  where house_id = p_house_id
    and lifecycle_status = 'draft';
end;
$$;

grant execute on function public.publish_house_debtors_draft(uuid) to authenticated;
