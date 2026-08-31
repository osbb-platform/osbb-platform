begin;

alter table public.house_plan_tasks
  add column if not exists completed_at timestamptz null;

comment on column public.house_plan_tasks.completed_at is
  'Timestamp of the latest transition into task_status=completed. Cleared when leaving completed.';

with completed_transition as (
  select
    transition.task_id,
    max(transition.executed_at) as completed_at
  from public.house_plan_status_transitions as transition
  where transition.to_status = 'completed'
  group by transition.task_id
)
update public.house_plan_tasks as task
set completed_at = coalesce(completed_transition.completed_at, task.updated_at)
from completed_transition
where task.id = completed_transition.task_id
  and task.task_status = 'completed';

update public.house_plan_tasks as task
set completed_at = task.updated_at
where task.task_status = 'completed'
  and task.completed_at is null;

update public.house_plan_tasks as task
set completed_at = null
where task.task_status <> 'completed'
  and task.completed_at is not null;

create or replace function public.sync_house_plan_completed_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.task_status = 'completed' then
    if tg_op = 'INSERT'
      or old.task_status is distinct from 'completed'
    then
      new.completed_at := clock_timestamp();
    elsif new.completed_at is null then
      new.completed_at := coalesce(old.completed_at, clock_timestamp());
    end if;
  else
    new.completed_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists house_plan_tasks_sync_completed_at
  on public.house_plan_tasks;

create trigger house_plan_tasks_sync_completed_at
before insert or update of task_status
on public.house_plan_tasks
for each row
execute function public.sync_house_plan_completed_at();

commit;
