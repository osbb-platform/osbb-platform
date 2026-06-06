insert into public.house_hero (
  house_id,
  headline,
  subheadline,
  cta_label,
  cover_image_url,
  lock_version,
  created_at,
  updated_at
)
select
  hp.house_id,
  coalesce(hs.content->>'headline', '') as headline,
  coalesce(hs.content->>'subheadline', '') as subheadline,
  coalesce(nullif(trim(hs.content->>'ctaLabel'), ''), 'Відкрити оголошення') as cta_label,
  nullif(trim(coalesce(hs.content->>'coverImageUrl', '')), '') as cover_image_url,
  1 as lock_version,
  coalesce(hs.created_at, now()) as created_at,
  coalesce(hs.updated_at, hs.created_at, now()) as updated_at
from public.house_sections hs
join public.house_pages hp on hp.id = hs.house_page_id
where hs.kind::text = 'hero'
on conflict (house_id) do update
  set
    headline = excluded.headline,
    subheadline = excluded.subheadline,
    cta_label = excluded.cta_label,
    cover_image_url = excluded.cover_image_url,
    updated_at = excluded.updated_at;
