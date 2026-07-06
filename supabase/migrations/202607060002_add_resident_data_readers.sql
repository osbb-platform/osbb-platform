begin;

create or replace function public.is_house_session_valid_for_house(
  target_house_id uuid,
  target_session_token text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    coalesce(target_session_token, '') <> ''
    and exists (
      select 1
      from public.house_sessions session
      join public.house_access access
        on access.house_id = session.house_id
      join public.houses house
        on house.id = session.house_id
      where session.house_id = target_house_id
        and session.session_token = target_session_token
        and session.expires_at > timezone('utc', now())
        and session.session_version = access.session_version
        and house.is_active = true
        and house.archived_at is null
    );
$$;

revoke all
  on function public.is_house_session_valid_for_house(uuid, text)
  from public;

create or replace function public.get_resident_house_debtors(
  target_house_id uuid,
  target_session_token text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  settings_payload jsonb;
  items_payload jsonb;
begin
  if not public.is_house_session_valid_for_house(
    target_house_id,
    target_session_token
  ) then
    return null;
  end if;

  select to_jsonb(settings_row)
  into settings_payload
  from public.house_debtors_settings settings_row
  where settings_row.house_id = target_house_id
  limit 1;

  select coalesce(
    jsonb_agg(
      to_jsonb(item_row)
      order by
        item_row.apartment_label,
        item_row.updated_at desc
    ),
    '[]'::jsonb
  )
  into items_payload
  from (
    select
      item.id,
      item.house_id,
      item.apartment_id,
      item.apartment_label,
      item.account_number,
      ''::text as owner_name,
      item.area,
      item.amount,
      item.days,
      item.lifecycle_status,
      item.created_at,
      item.updated_at
    from public.house_debtors_items item
    where item.house_id = target_house_id
      and item.lifecycle_status = 'published'
  ) item_row;

  return jsonb_build_object(
    'settings',
    settings_payload,
    'items',
    coalesce(items_payload, '[]'::jsonb)
  );
end;
$$;

revoke all
  on function public.get_resident_house_debtors(uuid, text)
  from public;

grant execute
  on function public.get_resident_house_debtors(uuid, text)
  to anon, authenticated;

create or replace function public.get_resident_house_meetings(
  target_house_id uuid,
  target_session_token text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  meetings_payload jsonb;
  questions_payload jsonb;
  manual_votes_payload jsonb;
begin
  if not public.is_house_session_valid_for_house(
    target_house_id,
    target_session_token
  ) then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      to_jsonb(meeting_row)
      order by
        meeting_row.meeting_date desc nulls last,
        meeting_row.updated_at desc
    ),
    '[]'::jsonb
  )
  into meetings_payload
  from public.house_meetings meeting_row
  where meeting_row.house_id = target_house_id
    and meeting_row.lifecycle_status = 'published';

  select coalesce(
    jsonb_agg(
      to_jsonb(question_row)
      order by
        question_row.meeting_id,
        question_row.sort_order
    ),
    '[]'::jsonb
  )
  into questions_payload
  from public.house_meeting_questions question_row
  join public.house_meetings meeting
    on meeting.id = question_row.meeting_id
  where meeting.house_id = target_house_id
    and meeting.lifecycle_status = 'published';

  select coalesce(
    jsonb_agg(
      to_jsonb(vote_row)
      order by
        vote_row.meeting_id,
        vote_row.recorded_at
    ),
    '[]'::jsonb
  )
  into manual_votes_payload
  from (
    select
      vote.id,
      vote.meeting_id,
      vote.apartment_id,
      regexp_replace(
        vote.apartment_label,
        '\s+—.*$',
        ''
      ) as apartment_label,
      vote.question_id,
      vote.choice,
      vote.recorded_at
    from public.house_meeting_manual_votes vote
    join public.house_meetings meeting
      on meeting.id = vote.meeting_id
    where meeting.house_id = target_house_id
      and meeting.lifecycle_status = 'published'
  ) vote_row;

  return jsonb_build_object(
    'meetings',
    coalesce(meetings_payload, '[]'::jsonb),
    'questions',
    coalesce(questions_payload, '[]'::jsonb),
    'manual_votes',
    coalesce(manual_votes_payload, '[]'::jsonb)
  );
end;
$$;

revoke all
  on function public.get_resident_house_meetings(uuid, text)
  from public;

grant execute
  on function public.get_resident_house_meetings(uuid, text)
  to anon, authenticated;

create or replace function public.get_resident_house_apartment_options(
  target_house_id uuid,
  target_session_token text
)
returns table (
  id uuid,
  apartment_label text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_house_session_valid_for_house(
    target_house_id,
    target_session_token
  ) then
    return;
  end if;

  return query
  select
    apartment.id,
    apartment.apartment_label
  from public.house_apartments apartment
  where apartment.house_id = target_house_id
    and apartment.archived_at is null
  order by apartment.apartment_label;
end;
$$;

revoke all
  on function public.get_resident_house_apartment_options(uuid, text)
  from public;

grant execute
  on function public.get_resident_house_apartment_options(uuid, text)
  to anon, authenticated;

create or replace function public.get_resident_house_bell_feed(
  target_house_id uuid,
  target_session_token text,
  window_days integer default 7
)
returns table (
  section text,
  latest_at timestamptz,
  item_count integer
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_house_session_valid_for_house(
    target_house_id,
    target_session_token
  ) then
    return;
  end if;

  return query
  with raw_feed as (
    select
      'announcements'::text as section,
      greatest(
        coalesce(published_at, updated_at),
        updated_at
      ) as item_at
    from public.house_announcements
    where house_id = target_house_id
      and lifecycle_status = 'published'

    union all

    select
      'information'::text,
      greatest(
        coalesce(published_at, updated_at),
        updated_at,
        created_at
      )
    from public.house_information_posts
    where house_id = target_house_id
      and lifecycle_status = 'published'

    union all

    select
      'information'::text,
      greatest(
        coalesce(published_at, updated_at),
        updated_at,
        created_at
      )
    from public.house_faq
    where house_id = target_house_id
      and lifecycle_status = 'published'

    union all

    select
      'reports'::text,
      greatest(
        coalesce(published_at, updated_at),
        updated_at,
        coalesce(report_date::timestamptz, updated_at)
      )
    from public.house_reports
    where house_id = target_house_id
      and lifecycle_status = 'published'

    union all

    select
      'documents'::text,
      updated_at
    from public.house_documents
    where house_id = target_house_id
      and lifecycle_status = 'published'
      and attachment_status = 'uploaded'

    union all

    select
      'board'::text,
      updated_at
    from public.house_board_members
    where house_id = target_house_id

    union all

    select
      'requisites'::text,
      updated_at
    from public.house_requisites
    where house_id = target_house_id

    union all

    select
      'specialists'::text,
      greatest(
        coalesce(published_at, updated_at),
        updated_at,
        created_at
      )
    from public.house_specialists
    where house_id = target_house_id
      and lifecycle_status = 'published'

    union all

    select
      'plan'::text,
      greatest(
        coalesce(updated_at, created_at),
        coalesce(archived_at, created_at),
        created_at
      )
    from public.house_plan_tasks
    where house_id = target_house_id
      and lifecycle_status in ('published', 'archived')

    union all

    select
      'debtors'::text,
      updated_at
    from public.house_debtors_items
    where house_id = target_house_id
      and lifecycle_status = 'published'

    union all

    select
      'debtors'::text,
      updated_at
    from public.house_debtors_settings
    where house_id = target_house_id

    union all

    select
      'meetings'::text,
      greatest(
        coalesce(updated_at, meeting_date, published_at),
        coalesce(meeting_date, updated_at, published_at),
        coalesce(published_at, updated_at, meeting_date)
      )
    from public.house_meetings
    where house_id = target_house_id
      and lifecycle_status = 'published'
  )
  select
    raw_feed.section,
    max(raw_feed.item_at) as latest_at,
    count(*)::integer as item_count
  from raw_feed
  where raw_feed.item_at is not null
    and raw_feed.item_at >=
      now() - make_interval(
        days => greatest(window_days, 1)
      )
  group by raw_feed.section
  order by latest_at desc;
end;
$$;

revoke all
  on function public.get_resident_house_bell_feed(
    uuid,
    text,
    integer
  )
  from public;

grant execute
  on function public.get_resident_house_bell_feed(
    uuid,
    text,
    integer
  )
  to anon, authenticated;

commit;
