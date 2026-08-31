begin;

create or replace function public.ensure_draft_approval_task(
  p_house_id uuid,
  p_entity_type text,
  p_entity_id text,
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
  v_entity_uuid uuid;
  v_title text;
  v_entity_exists boolean := false;
begin
  if session_user = 'postgres' or auth.role() = 'service_role' then
    null;
  elsif auth.role() = 'authenticated'
    and public.admin_has_house_access(p_house_id) then
    null;
  else
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_entity_type not in (
    'house_announcement',
    'house_document',
    'house_information_post',
    'house_meeting',
    'house_plan_task',
    'house_poll',
    'house_report',
    'house_specialist'
  ) then
    raise exception 'UNSUPPORTED_DRAFT_ENTITY_TYPE'
      using errcode = '22023';
  end if;

  begin
    v_entity_uuid := p_entity_id::uuid;
  exception
    when invalid_text_representation then
      raise exception 'INVALID_DRAFT_ENTITY_ID'
        using errcode = '22023';
  end;

  case p_entity_type
    when 'house_announcement' then
      select exists (
        select 1 from public.house_announcements e
        where e.id = v_entity_uuid
          and e.house_id = p_house_id
          and e.lifecycle_status = 'draft'
      ) into v_entity_exists;

    when 'house_document' then
      select exists (
        select 1 from public.house_documents e
        where e.id = v_entity_uuid
          and e.house_id = p_house_id
          and e.lifecycle_status = 'draft'
      ) into v_entity_exists;

    when 'house_information_post' then
      select exists (
        select 1 from public.house_information_posts e
        where e.id = v_entity_uuid
          and e.house_id = p_house_id
          and e.lifecycle_status = 'draft'
      ) into v_entity_exists;

    when 'house_meeting' then
      select exists (
        select 1 from public.house_meetings e
        where e.id = v_entity_uuid
          and e.house_id = p_house_id
          and e.lifecycle_status = 'draft'
      ) into v_entity_exists;

    when 'house_plan_task' then
      select exists (
        select 1 from public.house_plan_tasks e
        where e.id = v_entity_uuid
          and e.house_id = p_house_id
          and e.lifecycle_status = 'draft'
      ) into v_entity_exists;

    when 'house_poll' then
      select exists (
        select 1 from public.house_polls e
        where e.id = v_entity_uuid
          and e.house_id = p_house_id
          and e.lifecycle_status = 'draft'
      ) into v_entity_exists;

    when 'house_report' then
      select exists (
        select 1 from public.house_reports e
        where e.id = v_entity_uuid
          and e.house_id = p_house_id
          and e.lifecycle_status = 'draft'
      ) into v_entity_exists;

    when 'house_specialist' then
      select exists (
        select 1 from public.house_specialists e
        where e.id = v_entity_uuid
          and e.house_id = p_house_id
          and e.lifecycle_status = 'draft'
      ) into v_entity_exists;
  end case;

  if not v_entity_exists then
    raise exception 'DRAFT_ENTITY_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      'draft|' || p_entity_type || '|' || p_entity_id,
      0
    )
  );

  select task.id
  into v_task_id
  from public.platform_task_links link
  join public.platform_tasks task
    on task.id = link.task_id
  where link.link_type = 'draft'
    and link.entity_type = p_entity_type
    and link.entity_id = p_entity_id
    and task.deleted_at is null
  order by task.created_at asc
  limit 1;

  if v_task_id is not null then
    return v_task_id;
  end if;

  v_title := coalesce(nullif(btrim(p_title), ''), 'Чернетка');

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
      'sourceType', p_entity_type,
      'sourceId', p_entity_id
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
    p_entity_type,
    p_entity_id
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

comment on function public.ensure_draft_approval_task(uuid, text, text, text)
is 'S1-T3 generic atomic draft-approval task ensure. Validates caller house access, explicit entity whitelist, entity ownership/draft state, and atomically creates task + house + draft link + create event.';

revoke all
on function public.ensure_draft_approval_task(uuid, text, text, text)
from public, anon;

grant execute
on function public.ensure_draft_approval_task(uuid, text, text, text)
to authenticated, service_role;

commit;
