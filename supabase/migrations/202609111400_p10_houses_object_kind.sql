begin;

-- Track 4: support two kinds of managed object. Existing houses are all
-- apartment buildings; the column is additive, NOT NULL with a safe
-- default, and backward-compatible with every existing read (nothing reads
-- this column yet, so no existing query changes behavior).
alter table public.houses
  add column if not exists object_kind text not null default 'apartment_building';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'houses_object_kind_check'
      and conrelid = 'public.houses'::regclass
  ) then
    alter table public.houses
      add constraint houses_object_kind_check
      check (object_kind = any (array['apartment_building'::text, 'garden_association'::text]));
  end if;
end;
$$;

commit;
