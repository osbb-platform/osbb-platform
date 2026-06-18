create or replace function public.get_house_bell_feed(
  target_house_id uuid,
  window_days int default 7
)
returns table (
  section text,
  latest_at timestamptz,
  item_count int
)
language sql
security definer
set search_path = public
as $$
  with raw_feed as (
    select
      'announcements'::text as section,
      greatest(coalesce(published_at, updated_at), updated_at) as item_at
    from public.house_announcements
    where house_id = target_house_id
      and lifecycle_status = 'published'

    union all

    select
      'information'::text as section,
      greatest(coalesce(published_at, updated_at), updated_at, created_at) as item_at
    from public.house_information_posts
    where house_id = target_house_id
      and lifecycle_status = 'published'

    union all

    select
      'information'::text as section,
      greatest(coalesce(published_at, updated_at), updated_at, created_at) as item_at
    from public.house_faq
    where house_id = target_house_id
      and lifecycle_status = 'published'

    union all

    select
      'reports'::text as section,
      greatest(
        coalesce(published_at, updated_at),
        updated_at,
        coalesce(report_date::timestamptz, updated_at)
      ) as item_at
    from public.house_reports
    where house_id = target_house_id
      and lifecycle_status = 'published'

    union all

    select
      'documents'::text as section,
      updated_at as item_at
    from public.house_documents
    where house_id = target_house_id
      and lifecycle_status = 'published'
      and attachment_status = 'uploaded'

    union all

    select
      'board'::text as section,
      updated_at as item_at
    from public.house_board_members
    where house_id = target_house_id

    union all

    select
      'requisites'::text as section,
      updated_at as item_at
    from public.house_requisites
    where house_id = target_house_id

    union all

    select
      'specialists'::text as section,
      greatest(coalesce(published_at, updated_at), updated_at, created_at) as item_at
    from public.house_specialists
    where house_id = target_house_id
      and lifecycle_status = 'published'

    union all

    select
      'plan'::text as section,
      greatest(
        coalesce(updated_at, created_at),
        coalesce(archived_at, created_at),
        created_at
      ) as item_at
    from public.house_plan_tasks
    where house_id = target_house_id
      and lifecycle_status in ('published', 'archived')

    union all

    select
      'debtors'::text as section,
      updated_at as item_at
    from public.house_debtors_items
    where house_id = target_house_id
      and lifecycle_status = 'published'

    union all

    select
      'debtors'::text as section,
      updated_at as item_at
    from public.house_debtors_settings
    where house_id = target_house_id

    union all

    select
      'meetings'::text as section,
      greatest(
        coalesce(updated_at, meeting_date, published_at),
        coalesce(meeting_date, updated_at, published_at),
        coalesce(published_at, updated_at, meeting_date)
      ) as item_at
    from public.house_meetings
    where house_id = target_house_id
      and lifecycle_status = 'published'
  )
  select
    raw_feed.section,
    max(raw_feed.item_at) as latest_at,
    count(*)::int as item_count
  from raw_feed
  where raw_feed.item_at is not null
    and raw_feed.item_at >= now() - make_interval(days => greatest(window_days, 1))
  group by raw_feed.section
  order by latest_at desc;
$$;

revoke all on function public.get_house_bell_feed(uuid, int) from public;
grant execute on function public.get_house_bell_feed(uuid, int) to anon;
grant execute on function public.get_house_bell_feed(uuid, int) to authenticated;
