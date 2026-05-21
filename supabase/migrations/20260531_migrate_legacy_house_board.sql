insert into public.house_board_intro (
  house_id,
  intro,
  lock_version,
  created_at,
  updated_at
)
select
  hp.house_id,
  coalesce(hs.content->>'intro', hs.content->>'message', '') as intro,
  1 as lock_version,
  coalesce(hs.created_at, now()) as created_at,
  coalesce(hs.updated_at, hs.created_at, now()) as updated_at
from public.house_sections hs
join public.house_pages hp on hp.id = hs.house_page_id
where hs.kind::text = 'contacts'
on conflict (house_id) do update
  set
    intro = excluded.intro,
    updated_at = excluded.updated_at;

insert into public.house_board_members (
  house_id,
  role_status,
  name,
  role,
  phone,
  email,
  office_hours,
  description,
  sort_order,
  lock_version,
  created_at,
  updated_at
)
select
  hp.house_id,
  case (role_data->>'status')
    when 'chairman' then 'chairman'
    when 'vice_chairman' then 'vice_chairman'
    when 'revision_commission' then 'revision_commission'
    else 'member'
  end as role_status,
  coalesce(role_data->>'name', '') as name,
  coalesce(role_data->>'role', '') as role,
  coalesce(role_data->>'phone', '') as phone,
  coalesce(role_data->>'email', '') as email,
  coalesce(role_data->>'officeHours', role_data->>'office_hours', '') as office_hours,
  coalesce(role_data->>'description', '') as description,
  coalesce((role_data->>'sortOrder')::int, ord::int - 1) as sort_order,
  1 as lock_version,
  coalesce(hs.created_at, now()) as created_at,
  coalesce(hs.updated_at, hs.created_at, now()) as updated_at
from public.house_sections hs
join public.house_pages hp on hp.id = hs.house_page_id
cross join lateral jsonb_array_elements(hs.content->'roles') with ordinality as t(role_data, ord)
where hs.kind::text = 'contacts'
  and hs.content ? 'roles'
  and jsonb_typeof(hs.content->'roles') = 'array'
  and coalesce(trim(role_data->>'name'), '') <> ''
on conflict do nothing;

insert into public.house_board_members (
  house_id,
  role_status,
  name,
  role,
  phone,
  email,
  office_hours,
  description,
  sort_order,
  lock_version,
  created_at,
  updated_at
)
select
  hp.house_id,
  'chairman' as role_status,
  coalesce(hs.content->'chairman'->>'name', '') as name,
  coalesce(hs.content->'chairman'->>'role', 'Голова правління') as role,
  coalesce(hs.content->'chairman'->>'phone', '') as phone,
  coalesce(hs.content->'chairman'->>'email', '') as email,
  coalesce(hs.content->'chairman'->>'officeHours', hs.content->'chairman'->>'office_hours', '') as office_hours,
  coalesce(hs.content->'chairman'->>'description', '') as description,
  0 as sort_order,
  1 as lock_version,
  coalesce(hs.created_at, now()) as created_at,
  coalesce(hs.updated_at, hs.created_at, now()) as updated_at
from public.house_sections hs
join public.house_pages hp on hp.id = hs.house_page_id
where hs.kind::text = 'contacts'
  and hs.content ? 'chairman'
  and jsonb_typeof(hs.content->'chairman') = 'object'
  and coalesce(trim(hs.content->'chairman'->>'name'), '') <> ''
on conflict do nothing;
