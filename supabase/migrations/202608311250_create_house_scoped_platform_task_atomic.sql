begin;

create or replace function public.create_house_scoped_platform_task(
  p_house_id uuid,
  p_task_type text,
  p_title text,
  p_description text default null,
  p_priority text default null,
  p_assigned_to uuid default null,
  p_deadline_at timestamptz default null,
  p_link_type text default null,
  p_entity_type text default null,
  p_entity_id text default null,
  p_created_by uuid default null,
  p_is_manual boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task_id uuid;
  v_entity_uuid uuid;
  v_created_by uuid;
  v_jwt_role text := nullif(current_setting('request.jwt.claim.role', true), '');
  v_is_privileged boolean := false;
begin
  if p_house_id is null then
    raise exception 'HOUSE_REQUIRED' using errcode = '22023';
  end if;

  if nullif(btrim(p_title), '') is null then
    raise exception 'TITLE_REQUIRED' using errcode = '22023';
  end if;

  v_is_privileged :=
    v_jwt_role = 'service_role'
    or (v_jwt_role is null and session_user = 'postgres');

  if not v_is_privileged then
    if v_jwt_role is distinct from 'authenticated'
       or auth.uid() is null
       or not public.admin_has_house_access(p_house_id) then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;

    if p_created_by is not null and p_created_by <> auth.uid() then
      raise exception 'CREATED_BY_MISMATCH' using errcode = '42501';
    end if;

    v_created_by := coalesce(p_created_by, auth.uid());
  else
    v_created_by := p_created_by;
  end if;

  if p_task_type not in (
    'manual',
    'draft_approval',
    'resident_request',
    'specialist_request',
    'system'
  ) then
    raise exception 'UNSUPPORTED_TASK_TYPE' using errcode = '22023';
  end if;

  if p_priority is not null
     and p_priority not in ('low','medium','high','critical') then
    raise exception 'UNSUPPORTED_PRIORITY' using errcode = '22023';
  end if;

  if p_task_type = 'manual' then
    if p_link_type is not null
       or p_entity_type is not null
       or p_entity_id is not null
       or not p_is_manual then
      raise exception 'INVALID_MANUAL_TASK_CONTRACT' using errcode = '22023';
    end if;

  elsif p_task_type = 'draft_approval' then
    if p_link_type <> 'draft'
       or p_entity_type not in ('house_section','house_document')
       or p_entity_id is null
       or p_is_manual then
      raise exception 'INVALID_DRAFT_TASK_CONTRACT' using errcode = '22023';
    end if;

    begin
      v_entity_uuid := p_entity_id::uuid;
    exception when invalid_text_representation then
      raise exception 'INVALID_ENTITY_ID' using errcode = '22023';
    end;

    if p_entity_type = 'house_section' then
      if not exists (
        select 1
        from public.house_sections hs
        join public.house_pages hp on hp.id = hs.house_page_id
        where hs.id = v_entity_uuid
          and hp.house_id = p_house_id
          and hs.status::text = 'draft'
      ) then
        raise exception 'ENTITY_NOT_DRAFT_OR_WRONG_HOUSE' using errcode = '42501';
      end if;
    else
      if not exists (
        select 1
        from public.house_documents d
        where d.id = v_entity_uuid
          and d.house_id = p_house_id
          and d.lifecycle_status = 'draft'
      ) then
        raise exception 'ENTITY_NOT_DRAFT_OR_WRONG_HOUSE' using errcode = '42501';
      end if;
    end if;

  elsif p_task_type = 'resident_request' then
    if p_link_type <> 'resident_request'
       or p_entity_type <> 'footer_house_message'
       or p_entity_id is null
       or p_is_manual then
      raise exception 'INVALID_RESIDENT_TASK_CONTRACT' using errcode = '22023';
    end if;

    begin
      v_entity_uuid := p_entity_id::uuid;
    exception when invalid_text_representation then
      raise exception 'INVALID_ENTITY_ID' using errcode = '22023';
    end;

    if not exists (
      select 1
      from public.specialist_contact_requests r
      where r.id = v_entity_uuid
        and r.house_id = p_house_id
    ) then
      raise exception 'ENTITY_WRONG_HOUSE' using errcode = '42501';
    end if;

  elsif p_task_type = 'specialist_request' then
    if p_link_type <> 'specialist_request'
       or p_entity_type <> 'specialist_contact_request'
       or p_entity_id is null
       or p_is_manual then
      raise exception 'INVALID_SPECIALIST_TASK_CONTRACT' using errcode = '22023';
    end if;

    begin
      v_entity_uuid := p_entity_id::uuid;
    exception when invalid_text_representation then
      raise exception 'INVALID_ENTITY_ID' using errcode = '22023';
    end;

    if not exists (
      select 1
      from public.specialist_contact_requests r
      where r.id = v_entity_uuid
        and r.house_id = p_house_id
    ) then
      raise exception 'ENTITY_WRONG_HOUSE' using errcode = '42501';
    end if;

  elsif p_task_type = 'system' then
    if p_link_type <> 'system_event'
       or p_entity_type <> 'house_announcement'
       or p_entity_id is null
       or p_is_manual then
      raise exception 'INVALID_SYSTEM_TASK_CONTRACT' using errcode = '22023';
    end if;

    begin
      v_entity_uuid := p_entity_id::uuid;
    exception when invalid_text_representation then
      raise exception 'INVALID_ENTITY_ID' using errcode = '22023';
    end;

    if not exists (
      select 1
      from public.house_announcements a
      where a.id = v_entity_uuid
        and a.house_id = p_house_id
    ) then
      raise exception 'ENTITY_WRONG_HOUSE' using errcode = '42501';
    end if;
  end if;

  if p_link_type is not null then
    perform pg_advisory_xact_lock(
      hashtextextended(
        p_link_type || ':' || p_entity_type || ':' || p_entity_id,
        0
      )
    );

    select l.task_id
    into v_task_id
    from public.platform_task_links l
    join public.platform_tasks t on t.id = l.task_id
    where l.link_type = p_link_type
      and l.entity_type = p_entity_type
      and l.entity_id = p_entity_id
      and t.deleted_at is null
    order by l.created_at asc
    limit 1;

    if v_task_id is not null then
      return v_task_id;
    end if;
  end if;

  insert into public.platform_tasks (
    title,
    description,
    created_by,
    assigned_to,
    task_type,
    status,
    priority,
    deadline_at,
    is_manual,
    metadata
  )
  values (
    btrim(p_title),
    nullif(btrim(coalesce(p_description, '')), ''),
    v_created_by,
    p_assigned_to,
    p_task_type,
    'todo',
    p_priority,
    p_deadline_at,
    p_is_manual,
    jsonb_strip_nulls(
      jsonb_build_object(
        'sourceType', p_entity_type,
        'sourceId', p_entity_id
      )
    )
  )
  returning id into v_task_id;

  insert into public.platform_task_houses(task_id, house_id)
  values (v_task_id, p_house_id);

  if p_link_type is not null then
    insert into public.platform_task_links(
      task_id,
      link_type,
      entity_type,
      entity_id
    )
    values (
      v_task_id,
      p_link_type,
      p_entity_type,
      p_entity_id
    );
  end if;

  insert into public.platform_task_events(
    task_id,
    actor_id,
    event_type,
    action_label,
    after_value
  )
  values (
    v_task_id,
    v_created_by,
    'create',
    case
      when p_is_manual then 'Створення задачі'
      else 'Автоматичне створення задачі'
    end,
    p_task_type
  );

  return v_task_id;
end;
$$;

comment on function public.create_house_scoped_platform_task(
  uuid,text,text,text,text,uuid,timestamptz,text,text,text,uuid,boolean
)
is 'S1-T6 atomic house-scoped platform task creation. Narrow task/entity combinations; authenticated callers require house access; service_role is for validated server-side resident/chairman flows.';

revoke all on function public.create_house_scoped_platform_task(
  uuid,text,text,text,text,uuid,timestamptz,text,text,text,uuid,boolean
) from public;

revoke all on function public.create_house_scoped_platform_task(
  uuid,text,text,text,text,uuid,timestamptz,text,text,text,uuid,boolean
) from anon;

grant execute on function public.create_house_scoped_platform_task(
  uuid,text,text,text,text,uuid,timestamptz,text,text,text,uuid,boolean
) to authenticated;

grant execute on function public.create_house_scoped_platform_task(
  uuid,text,text,text,text,uuid,timestamptz,text,text,text,uuid,boolean
) to service_role;

commit;
