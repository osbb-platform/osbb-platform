begin;

create or replace function public.ensure_house_plan_draft_approval_task(
  p_house_id uuid,
  p_plan_task_id uuid,
  p_title text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task_id uuid;
  v_actor_id uuid := auth.uid();
  v_title text;
begin
  if session_user = 'postgres' or auth.role() = 'service_role' then
    null;
  elsif auth.role() = 'authenticated'
    and public.admin_has_house_access(p_house_id) then
    null;
  else
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.house_plan_tasks plan_task
    where plan_task.id = p_plan_task_id
      and plan_task.house_id = p_house_id
      and plan_task.lifecycle_status = 'draft'
  ) then
    raise exception 'PLAN_DRAFT_NOT_FOUND' using errcode = 'P0002';
  end if;

  select task.id
  into v_task_id
  from public.platform_task_links link
  join public.platform_tasks task
    on task.id = link.task_id
  where link.link_type = 'draft'
    and link.entity_type = 'house_plan_task'
    and link.entity_id = p_plan_task_id::text
    and task.deleted_at is null
  order by task.created_at asc
  limit 1;

  if v_task_id is not null then
    return v_task_id;
  end if;

  v_title := coalesce(nullif(btrim(p_title), ''), 'Чернетка плану робіт');

  insert into public.platform_tasks (
    title,
    description,
    created_by,
    assigned_to,
    task_type,
    status,
    priority,
    is_manual,
    metadata
  )
  values (
    'Підтвердити чернетку: ' || v_title,
    'Чернетка очікує підтвердження адміністратора.',
    v_actor_id,
    null,
    'draft_approval',
    'todo',
    'high',
    false,
    jsonb_build_object(
      'sourceType', 'house_plan_task',
      'sourceId', p_plan_task_id
    )
  )
  returning id into v_task_id;

  insert into public.platform_task_houses (task_id, house_id)
  values (v_task_id, p_house_id);

  insert into public.platform_task_links (
    task_id,
    link_type,
    entity_type,
    entity_id
  )
  values (
    v_task_id,
    'draft',
    'house_plan_task',
    p_plan_task_id::text
  );

  insert into public.platform_task_events (
    task_id,
    actor_id,
    event_type,
    action_label,
    after_value
  )
  values (
    v_task_id,
    v_actor_id,
    'create',
    'Автоматичне створення задачі',
    'draft_approval'
  );

  return v_task_id;
end;
$$;

comment on function public.ensure_house_plan_draft_approval_task(uuid, uuid, text)
is 'Atomically creates the draft-approval platform task for a house plan draft. Validates house access and is idempotent for an existing active draft link.';

revoke all
on function public.ensure_house_plan_draft_approval_task(uuid, uuid, text)
from public, anon;

grant execute
on function public.ensure_house_plan_draft_approval_task(uuid, uuid, text)
to authenticated, service_role;

commit;
