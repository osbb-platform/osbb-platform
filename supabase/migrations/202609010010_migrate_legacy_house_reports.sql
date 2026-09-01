-- D2: backfill legacy reports from house_sections into content-engine v2 tables.
-- Safe/idempotent: old house_sections are not deleted.

with legacy_items as (
  select
    hs.id as section_id,
    hp.house_id,
    hs.title as section_title,
    hs.status::text as section_status,
    hs.created_at as section_created_at,
    hs.updated_at as section_updated_at,
    source.item,
    source.ordinality
  from public.house_sections hs
  join public.house_pages hp on hp.id = hs.house_page_id
  cross join lateral jsonb_array_elements(
    case
      when hs.content ? 'reports' and jsonb_typeof(hs.content->'reports') = 'array'
        then hs.content->'reports'
      when hs.content ? 'items' and jsonb_typeof(hs.content->'items') = 'array'
        then hs.content->'items'
      when hs.content ? 'documents' and jsonb_typeof(hs.content->'documents') = 'array'
        then hs.content->'documents'
      else jsonb_build_array(hs.content)
    end
  ) with ordinality as source(item, ordinality)
  where hs.kind::text = 'reports'
),
normalized_categories as (
  select
    house_id,
    coalesce(
      nullif(item->>'categoryTitle', ''),
      nullif(item->>'category', ''),
      nullif(item->>'reportCategory', ''),
      nullif(item->>'type', '')
    ) as title,
    min(ordinality)::int - 1 as sort_order,
    min(coalesce(section_created_at, now())) as created_at,
    max(coalesce(section_updated_at, section_created_at, now())) as updated_at
  from legacy_items
  group by
    house_id,
    coalesce(
      nullif(item->>'categoryTitle', ''),
      nullif(item->>'category', ''),
      nullif(item->>'reportCategory', ''),
      nullif(item->>'type', '')
    )
)
insert into public.house_report_categories (
  house_id,
  title,
  sort_order,
  created_at,
  updated_at
)
select
  house_id,
  title,
  sort_order,
  created_at,
  updated_at
from normalized_categories nc
where coalesce(trim(title), '') <> ''
  and not exists (
    select 1
    from public.house_report_categories existing
    where existing.house_id = nc.house_id
      and lower(existing.title) = lower(nc.title)
  );

with legacy_items as (
  select
    hs.id as section_id,
    hp.house_id,
    hs.title as section_title,
    hs.status::text as section_status,
    hs.created_at as section_created_at,
    hs.updated_at as section_updated_at,
    source.item,
    source.ordinality
  from public.house_sections hs
  join public.house_pages hp on hp.id = hs.house_page_id
  cross join lateral jsonb_array_elements(
    case
      when hs.content ? 'reports' and jsonb_typeof(hs.content->'reports') = 'array'
        then hs.content->'reports'
      when hs.content ? 'items' and jsonb_typeof(hs.content->'items') = 'array'
        then hs.content->'items'
      when hs.content ? 'documents' and jsonb_typeof(hs.content->'documents') = 'array'
        then hs.content->'documents'
      else jsonb_build_array(hs.content)
    end
  ) with ordinality as source(item, ordinality)
  where hs.kind::text = 'reports'
),
normalized_reports as (
  select
    case
      when item->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (item->>'id')::uuid
      else (
        substr(md5(section_id::text || ':report:' || ordinality::text), 1, 8) || '-' ||
        substr(md5(section_id::text || ':report:' || ordinality::text), 9, 4) || '-' ||
        substr(md5(section_id::text || ':report:' || ordinality::text), 13, 4) || '-' ||
        substr(md5(section_id::text || ':report:' || ordinality::text), 17, 4) || '-' ||
        substr(md5(section_id::text || ':report:' || ordinality::text), 21, 12)
      )::uuid
    end as id,
    house_id,
    coalesce(
      nullif(item->>'title', ''),
      nullif(item->>'name', ''),
      section_title,
      'Звіт без назви'
    ) as title,
    coalesce(
      item->>'description',
      item->>'body',
      item->>'summary',
      ''
    ) as description,
    coalesce(
      nullif(item->>'categoryTitle', ''),
      nullif(item->>'category', ''),
      nullif(item->>'reportCategory', ''),
      nullif(item->>'type', '')
    ) as category_title,
    coalesce(
      nullif(item->>'reportDate', ''),
      nullif(item->>'report_date', ''),
      nullif(item->>'date', ''),
      nullif(item->>'createdAt', '')
    ) as report_date_text,
    nullif(item->>'periodType', '') as period_type_text,
    nullif(item->>'month', '') as month_text,
    nullif(item->>'year', '') as year_text,
    case
      when lower(coalesce(item->>'isPinned', '')) in ('true', '1', 'yes') then true
      else false
    end as is_pinned,
    case
      when lower(coalesce(item->>'isNew', '')) in ('true', '1', 'yes') then true
      else false
    end as is_new,
    nullif(item->>'newUntil', '') as new_until_text,
    coalesce(
      nullif(item->>'lifecycleStatus', ''),
      nullif(item->>'lifecycle_status', ''),
      nullif(item->>'visibility_status', ''),
      nullif(item->>'status', ''),
      section_status
    ) as status_text,
    ordinality::int - 1 as sort_order,
    coalesce(
      case
        when nullif(item->>'createdAt', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
          then (item->>'createdAt')::timestamptz
        else null
      end,
      section_created_at,
      now()
    ) as created_at,
    coalesce(
      case
        when nullif(item->>'updatedAt', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
          then (item->>'updatedAt')::timestamptz
        else null
      end,
      section_updated_at,
      section_created_at,
      now()
    ) as updated_at
  from legacy_items
)
insert into public.house_reports (
  id,
  house_id,
  title,
  description,
  category_id,
  category_title,
  report_date,
  period_type,
  month,
  year,
  is_pinned,
  is_new,
  new_until,
  lifecycle_status,
  lock_version,
  sort_order,
  created_at,
  updated_at,
  published_at,
  archived_at
)
select
  nr.id,
  nr.house_id,
  nr.title,
  nr.description,
  category.id,
  coalesce(nr.category_title, ''),
  case
    when nr.report_date_text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      then nr.report_date_text::date
    when nr.report_date_text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
      then nr.report_date_text::timestamptz::date
    else null
  end,
  case
    when nr.period_type_text in ('current', 'past') then nr.period_type_text
    when nr.year_text ~ '^[0-9]{4}$' and nr.year_text::int < extract(year from now())::int then 'past'
    else 'current'
  end,
  case
    when nr.month_text ~ '^[0-9]{1,2}$'
      then lpad(nr.month_text, 2, '0')
    when nr.report_date_text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
      then to_char(nr.report_date_text::date, 'MM')
    else null
  end,
  case
    when nr.year_text ~ '^[0-9]{4}$'
      then nr.year_text::int
    when nr.report_date_text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
      then extract(year from nr.report_date_text::date)::int
    else null
  end,
  nr.is_pinned,
  nr.is_new,
  case
    when nr.new_until_text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
      then nr.new_until_text::timestamptz
    else null
  end,
  case
    when nr.status_text in ('published', 'active', 'public') then 'published'
    when nr.status_text in ('archived', 'private') then 'archived'
    when nr.status_text in ('in_review', 'review', 'draft') then 'draft'
    else 'draft'
  end,
  1,
  nr.sort_order,
  nr.created_at,
  nr.updated_at,
  case
    when nr.status_text in ('published', 'active', 'public') then nr.updated_at
    else null
  end,
  case
    when nr.status_text in ('archived', 'private') then nr.updated_at
    else null
  end
from normalized_reports nr
left join public.house_report_categories category
  on category.house_id = nr.house_id
 and lower(category.title) = lower(coalesce(nr.category_title, ''))
on conflict (id) do nothing;

with legacy_items as (
  select
    hs.id as section_id,
    hp.house_id,
    source.item,
    source.ordinality
  from public.house_sections hs
  join public.house_pages hp on hp.id = hs.house_page_id
  cross join lateral jsonb_array_elements(
    case
      when hs.content ? 'reports' and jsonb_typeof(hs.content->'reports') = 'array'
        then hs.content->'reports'
      when hs.content ? 'items' and jsonb_typeof(hs.content->'items') = 'array'
        then hs.content->'items'
      when hs.content ? 'documents' and jsonb_typeof(hs.content->'documents') = 'array'
        then hs.content->'documents'
      else jsonb_build_array(hs.content)
    end
  ) with ordinality as source(item, ordinality)
  where hs.kind::text = 'reports'
),
normalized_files as (
  select
    case
      when item->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then (item->>'id')::uuid
      else (
        substr(md5(section_id::text || ':report:' || ordinality::text), 1, 8) || '-' ||
        substr(md5(section_id::text || ':report:' || ordinality::text), 9, 4) || '-' ||
        substr(md5(section_id::text || ':report:' || ordinality::text), 13, 4) || '-' ||
        substr(md5(section_id::text || ':report:' || ordinality::text), 17, 4) || '-' ||
        substr(md5(section_id::text || ':report:' || ordinality::text), 21, 12)
      )::uuid
    end as report_id,
    coalesce(
      nullif(item->'pdf'->>'bucket', ''),
      nullif(item->>'storageBucket', ''),
      nullif(item->>'bucket', ''),
      'house-reports'
    ) as storage_bucket,
    coalesce(
      nullif(item->'pdf'->>'path', ''),
      nullif(item->'pdf'->>'storagePath', ''),
      nullif(item->'pdf'->>'filePath', ''),
      nullif(item->>'storagePath', ''),
      nullif(item->>'filePath', ''),
      nullif(item->>'pdfPath', ''),
      nullif(item->>'path', ''),
      substring(coalesce(item->'pdf'->>'url', item->>'pdfUrl', item->>'url', '') from '/house-reports/(.*)$')
    ) as storage_path,
    coalesce(
      nullif(item->'pdf'->>'originalName', ''),
      nullif(item->'pdf'->>'fileName', ''),
      nullif(item->>'originalName', ''),
      nullif(item->>'fileName', ''),
      nullif(item->>'name', '')
    ) as original_file_name,
    coalesce(
      nullif(item->'pdf'->>'mimeType', ''),
      nullif(item->>'mimeType', ''),
      'application/pdf'
    ) as mime_type,
    case
      when coalesce(item->'pdf'->>'size', item->>'sizeBytes', item->>'fileSizeBytes') ~ '^[0-9]+$'
        then coalesce(item->'pdf'->>'size', item->>'sizeBytes', item->>'fileSizeBytes')::bigint
      else null
    end as size_bytes,
    coalesce(
      case
        when nullif(item->'pdf'->>'uploadedAt', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
          then (item->'pdf'->>'uploadedAt')::timestamptz
        else null
      end,
      now()
    ) as uploaded_at
  from legacy_items
)
insert into public.house_content_files (
  entity_type,
  entity_id,
  field_key,
  storage_bucket,
  storage_path,
  original_file_name,
  mime_type,
  size_bytes,
  uploaded_at
)
select
  'house_report',
  nf.report_id,
  'pdf',
  nf.storage_bucket,
  nf.storage_path,
  nf.original_file_name,
  nf.mime_type,
  nf.size_bytes,
  nf.uploaded_at
from normalized_files nf
where coalesce(trim(nf.storage_path), '') <> ''
  and exists (
    select 1
    from public.house_reports report
    where report.id = nf.report_id
  )
  and not exists (
    select 1
    from public.house_content_files existing
    where existing.entity_type = 'house_report'
      and existing.entity_id = nf.report_id
      and existing.field_key = 'pdf'
  )
on conflict do nothing;
