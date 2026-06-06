insert into public.house_announcements (
  id,
  house_id,
  title,
  body,
  level,
  lifecycle_status,
  lock_version,
  sort_order,
  created_at,
  updated_at,
  published_at,
  archived_at,
  created_by
)
select
  hs.id,
  hp.house_id,
  coalesce(nullif(trim(hs.title), ''), nullif(trim(hs.content->>'title'), ''), 'Без назви') as title,
  coalesce(hs.content->>'body', '') as body,
  case
    when hs.content->>'level' in ('info', 'warning', 'danger')
      then hs.content->>'level'
    else 'info'
  end as level,
  case
    when hs.status::text = 'published' then 'published'
    when hs.status::text = 'archived' then 'archived'
    else 'draft'
  end as lifecycle_status,
  1 as lock_version,
  hs.sort_order,
  hs.created_at,
  hs.updated_at,
  case
    when hs.status::text = 'published' then coalesce(hs.updated_at, hs.created_at)
    else null
  end as published_at,
  case
    when hs.status::text = 'archived' then coalesce(hs.updated_at, hs.created_at)
    else null
  end as archived_at,
  hs.created_by
from public.house_sections hs
join public.house_pages hp on hp.id = hs.house_page_id
where hs.kind::text = 'announcements'
on conflict (id) do nothing;
