-- Hotfix: new houses must always have dashboard widget rows.
-- Safe backfill: inserts only missing rows, does not overwrite manager settings.

insert into public.house_home_widgets (house_id, kind, is_enabled, sort_order)
select h.id, v.kind, v.is_enabled, v.sort_order
from public.houses h
cross join (
  values
    ('announcements', true, 10),
    ('information', true, 20),
    ('plan', true, 30),
    ('meetings', true, 40),
    ('debtors', true, 50),
    ('reports', true, 60),
    ('requisites', true, 70),
    ('specialists', true, 80)
) as v(kind, is_enabled, sort_order)
where not exists (
  select 1
  from public.house_home_widgets w
  where w.house_id = h.id
    and w.kind = v.kind
);
