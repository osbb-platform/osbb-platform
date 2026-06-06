insert into public.house_home_widgets (
  house_id,
  status_widgets,
  created_at,
  updated_at
)
select distinct on (hp.house_id)
  hp.house_id,
  case
    when jsonb_typeof(hs.content->'statusWidgets') = 'array'
      then hs.content->'statusWidgets'
    else '[]'::jsonb
  end as status_widgets,
  coalesce(hs.created_at, now()) as created_at,
  coalesce(hs.updated_at, now()) as updated_at
from public.house_sections hs
join public.house_pages hp on hp.id = hs.house_page_id
where hs.kind = 'custom'
  and hs.title = 'Home widgets'
order by hp.house_id, hs.updated_at desc nulls last, hs.created_at desc nulls last
on conflict (house_id) do update
set
  status_widgets = excluded.status_widgets,
  updated_at = now();
