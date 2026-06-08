-- Backfill required legacy house_pages for active houses.
-- Architecture 2.0 no longer stores main content in house_pages,
-- but some admin/public compatibility paths still expect home/information pages.

insert into public.house_pages (
  house_id,
  slug,
  title,
  status
)
select
  h.id,
  required.slug,
  required.title,
  'published'::public.content_status
from public.houses h
cross join (
  values
    ('home', 'Главная дома'),
    ('information', 'Информация')
) as required(slug, title)
where h.is_active = true
  and h.archived_at is null
  and not exists (
    select 1
    from public.house_pages hp
    where hp.house_id = h.id
      and hp.slug = required.slug
  )
on conflict (house_id, slug) do nothing;
