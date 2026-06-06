insert into public.house_faq (
  house_id,
  lifecycle_status,
  lock_version,
  created_at,
  updated_at,
  published_at,
  archived_at
)
select distinct on (hp.house_id)
  hp.house_id,
  case
    when hs.status = 'published' then 'published'
    when hs.status = 'archived' then 'archived'
    else 'draft'
  end as lifecycle_status,
  1 as lock_version,
  hs.created_at,
  hs.updated_at,
  case when hs.status = 'published' then hs.updated_at else null end as published_at,
  case when hs.status = 'archived' then hs.updated_at else null end as archived_at
from public.house_sections hs
join public.house_pages hp on hp.id = hs.house_page_id
where hs.kind = 'faq'
order by
  hp.house_id,
  case when hs.status = 'published' then 0 else 1 end,
  hs.updated_at desc
on conflict (house_id) do nothing;

insert into public.house_faq_items (
  faq_id,
  question,
  answer,
  sort_order
)
select
  faq.id,
  coalesce(item ->> 'question', ''),
  coalesce(item ->> 'answer', ''),
  row_number() over (partition by hp.house_id order by ord) - 1
from public.house_sections hs
join public.house_pages hp on hp.id = hs.house_page_id
join public.house_faq faq on faq.house_id = hp.house_id
cross join lateral jsonb_array_elements(
  case
    when jsonb_typeof(hs.content -> 'items') = 'array' then hs.content -> 'items'
    else '[]'::jsonb
  end
) with ordinality as t(item, ord)
where hs.kind = 'faq'
  and not exists (
    select 1
    from public.house_faq_items existing
    where existing.faq_id = faq.id
  );
