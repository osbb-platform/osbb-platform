create or replace function public.pause_house_plan_automation(p_house_id uuid,p_task_id uuid,p_lock_version integer)
returns public.house_plan_tasks language plpgsql security definer set search_path = public, pg_temp as $$
declare v_now timestamptz:=now(); v_task public.house_plan_tasks;
begin
  if not public.is_authenticated_admin() then raise exception 'FORBIDDEN'; end if;
  update public.house_plan_tasks set automation_paused_at=v_now,automation_anchor_at=null,automation_next_due_at=null,updated_at=v_now,lock_version=lock_version+1
  where id=p_task_id and house_id=p_house_id and lock_version=p_lock_version and lifecycle_status='published' and automation_enabled=true and automation_interval_days is not null and automation_paused_at is null returning * into v_task;
  if v_task.id is null then raise exception 'STALE_OR_INVALID_STATE'; end if;
  return v_task;
end; $$;

create or replace function public.resume_house_plan_automation(p_house_id uuid,p_task_id uuid,p_lock_version integer)
returns public.house_plan_tasks language plpgsql security definer set search_path = public, pg_temp as $$
declare v_now timestamptz:=now(); v_task public.house_plan_tasks;
begin
  if not public.is_authenticated_admin() then raise exception 'FORBIDDEN'; end if;
  update public.house_plan_tasks set automation_paused_at=null,automation_anchor_at=v_now,automation_next_due_at=v_now+make_interval(days=>automation_interval_days),updated_at=v_now,lock_version=lock_version+1
  where id=p_task_id and house_id=p_house_id and lock_version=p_lock_version and lifecycle_status='published' and automation_enabled=true and automation_interval_days is not null and automation_paused_at is not null returning * into v_task;
  if v_task.id is null then raise exception 'STALE_OR_INVALID_STATE'; end if;
  return v_task;
end; $$;

create or replace function public.transition_house_plan_status_manual(p_house_id uuid,p_task_id uuid,p_lock_version integer,p_to_status text)
returns public.house_plan_tasks language plpgsql security definer set search_path = public, pg_temp as $$
declare v_now timestamptz:=now(); v_before public.house_plan_tasks; v_after public.house_plan_tasks;
begin
  if not public.is_authenticated_admin() then raise exception 'FORBIDDEN'; end if;
  if p_to_status not in ('planned','in_progress','completed') then raise exception 'INVALID_STATUS'; end if;
  select * into v_before from public.house_plan_tasks where id=p_task_id and house_id=p_house_id and lock_version=p_lock_version and lifecycle_status='published' for update;
  if v_before.id is null then raise exception 'STALE_OR_INVALID_STATE'; end if;
  if v_before.task_status=p_to_status then raise exception 'NO_STATUS_CHANGE'; end if;
  update public.house_plan_tasks set task_status=p_to_status,automation_paused_at=case when automation_enabled then null else automation_paused_at end,automation_anchor_at=case when automation_enabled and automation_interval_days is not null then v_now else null end,automation_next_due_at=case when automation_enabled and automation_interval_days is not null then v_now+make_interval(days=>automation_interval_days) else null end,updated_at=v_now,lock_version=lock_version+1 where id=v_before.id returning * into v_after;
  insert into public.house_plan_status_transitions(task_id,house_id,from_status,to_status,due_at,executed_at,kind,actor_admin_id,configured_interval_days)
  values(v_after.id,v_after.house_id,v_before.task_status,v_after.task_status,null,v_now,'manual',auth.uid(),v_after.automation_interval_days);
  return v_after;
end; $$;

revoke all on function public.pause_house_plan_automation(uuid,uuid,integer) from public,anon;
revoke all on function public.resume_house_plan_automation(uuid,uuid,integer) from public,anon;
revoke all on function public.transition_house_plan_status_manual(uuid,uuid,integer,text) from public,anon;
grant execute on function public.pause_house_plan_automation(uuid,uuid,integer) to authenticated;
grant execute on function public.resume_house_plan_automation(uuid,uuid,integer) to authenticated;
grant execute on function public.transition_house_plan_status_manual(uuid,uuid,integer,text) to authenticated;
