-- P11 T7: expose automatic transition details to the protected runtime route.
-- Backward compatible: existing summary keys are preserved unchanged.

create or replace function public.run_house_plan_automation(
  p_now timestamptz default now(),
  p_batch_size integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_task public.house_plan_tasks;
  v_due_at timestamptz;
  v_from_status text;
  v_to_status text;
  v_processed_tasks integer := 0;
  v_transition_count integer := 0;
  v_archived_count integer := 0;
  v_transition_details jsonb := '[]'::jsonb;
begin
  if p_batch_size < 1 or p_batch_size > 500 then
    raise exception 'INVALID_BATCH_SIZE';
  end if;

  for v_task in
    select task.*
    from public.house_plan_tasks task
    where task.lifecycle_status = 'published'
      and task.automation_enabled = true
      and task.automation_interval_days is not null
      and task.automation_paused_at is null
      and task.automation_next_due_at is not null
      and task.automation_next_due_at <= p_now
      and task.task_status <> 'archived'
    order by task.automation_next_due_at, task.id
    for update skip locked
    limit p_batch_size
  loop
    v_processed_tasks := v_processed_tasks + 1;
    v_due_at := v_task.automation_next_due_at;

    while v_due_at is not null
      and v_due_at <= p_now
      and v_task.task_status <> 'archived'
    loop
      v_from_status := v_task.task_status;

      v_to_status :=
        case v_from_status
          when 'planned' then 'in_progress'
          when 'in_progress' then 'completed'
          when 'completed' then 'archived'
          else null
        end;

      if v_to_status is null then
        exit;
      end if;

      insert into public.house_plan_status_transitions (
        task_id,
        house_id,
        from_status,
        to_status,
        due_at,
        executed_at,
        kind,
        actor_admin_id,
        configured_interval_days
      )
      values (
        v_task.id,
        v_task.house_id,
        v_from_status,
        v_to_status,
        v_due_at,
        p_now,
        'automatic',
        null,
        v_task.automation_interval_days
      )
      on conflict (
        task_id,
        from_status,
        to_status,
        due_at
      )
      where kind = 'automatic'
      do nothing;

      update public.house_plan_tasks
      set
        task_status = v_to_status,
        automation_anchor_at = v_due_at,
        automation_next_due_at =
          case
            when v_to_status = 'archived' then null
            else v_due_at + make_interval(
              days => automation_interval_days
            )
          end,
        updated_at = p_now,
        lock_version = lock_version + 1
      where id = v_task.id
      returning * into v_task;

      v_transition_count := v_transition_count + 1;

      v_transition_details :=
        v_transition_details ||
        jsonb_build_array(
          jsonb_build_object(
            'taskId', v_task.id,
            'houseId', v_task.house_id,
            'fromStatus', v_from_status,
            'toStatus', v_to_status,
            'dueAt', v_due_at,
            'executedAt', p_now
          )
        );

      if v_to_status = 'archived' then
        v_archived_count := v_archived_count + 1;
        v_due_at := null;
      else
        v_due_at := v_task.automation_next_due_at;
      end if;
    end loop;
  end loop;

  return jsonb_build_object(
    'processedTasks', v_processed_tasks,
    'transitions', v_transition_count,
    'archivedTasks', v_archived_count,
    'executedAt', p_now,
    'transitionDetails', v_transition_details
  );
end;
$$;

comment on function public.run_house_plan_automation(timestamptz, integer) is
  'Processes due published plan tasks with SKIP LOCKED catch-up semantics and returns transition details for runtime side effects. Service-role only.';

revoke all on function public.run_house_plan_automation(timestamptz, integer)
  from public, anon, authenticated;

grant execute on function public.run_house_plan_automation(timestamptz, integer)
  to service_role;
