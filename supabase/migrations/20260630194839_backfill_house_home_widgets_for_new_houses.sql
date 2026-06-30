-- Hotfix: every house must have one home widgets snapshot row.
-- Safe backfill: inserts only missing rows and repairs malformed JSON,
-- does not overwrite valid manager settings.

insert into public.house_home_widgets (
  house_id,
  status_widgets,
  lock_version,
  created_at,
  updated_at
)
select
  h.id,
  '[]'::jsonb,
  1,
  now(),
  now()
from public.houses h
where not exists (
  select 1
  from public.house_home_widgets w
  where w.house_id = h.id
)
on conflict (house_id) do nothing;

update public.house_home_widgets
set
  status_widgets = '[]'::jsonb,
  updated_at = now()
where status_widgets is null
   or jsonb_typeof(status_widgets) <> 'array';
