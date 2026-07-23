-- P05 T2 phase 1:
-- Add the contractor directory reference without changing or backfilling
-- the existing house_plan_tasks.contractor text field.
--
-- Backfill is deliberately separated and requires an owner-approved preview.

alter table public.house_plan_tasks
  add column if not exists contractor_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'house_plan_tasks_contractor_id_fkey'
      and conrelid = 'public.house_plan_tasks'::regclass
  ) then
    alter table public.house_plan_tasks
      add constraint house_plan_tasks_contractor_id_fkey
      foreign key (contractor_id)
      references public.contractors(id)
      on update restrict
      on delete restrict
      not valid;
  end if;
end
$$;

create index if not exists house_plan_tasks_contractor_id_idx
  on public.house_plan_tasks (contractor_id)
  where contractor_id is not null;

comment on column public.house_plan_tasks.contractor_id is
  'P05 contractor directory reference. Nullable during approved backfill and compatibility rollout.';

-- Validate only existing non-null values. At this phase all legacy rows remain null.
alter table public.house_plan_tasks
  validate constraint house_plan_tasks_contractor_id_fkey;

-- No UPDATE/backfill is allowed in this migration.
-- The legacy contractor text remains untouched until the preview is approved.

-- Verification SQL:
-- select count(*) filter (where contractor_id is null) as without_reference,
--        count(*) filter (where contractor_id is not null) as with_reference
-- from public.house_plan_tasks;
--
-- select conname, convalidated
-- from pg_constraint
-- where conrelid = 'public.house_plan_tasks'::regclass
--   and conname = 'house_plan_tasks_contractor_id_fkey';
