insert into public.house_information_posts
  (
    id,
    house_id,
    headline,
    body,
    category,
    is_pinned,
    lifecycle_status,
    lock_version,
    created_at,
    updated_at,
    published_at,
    archived_at
  )
select
  hs.id,
  hp.house_id,
  coalesce(nullif(hs.content->>'headline', ''), hs.title, 'Без заголовка'),
  coalesce(hs.content->>'body', ''),
  case
    when (hs.content->>'category') in (
      'Про будинок',
      'Правила проживання',
      'Корисна інформація',
      'Контакти служб',
      'Інструкції для мешканців'
    )
    then hs.content->>'category'
    else 'Про будинок'
  end,
  coalesce((hs.content->>'isPinned')::boolean, false),
  case
    when hs.status = 'published' then 'published'
    when hs.status = 'archived' then 'archived'
    else 'draft'
  end,
  1,
  hs.created_at,
  hs.updated_at,
  case
    when hs.status = 'published' and hs.content->>'publishedAt' is not null
      then (hs.content->>'publishedAt')::timestamptz
    when hs.status = 'published'
      then hs.updated_at
    else null
  end,
  case
    when hs.status = 'archived' then hs.updated_at
    else null
  end
from public.house_sections hs
join public.house_pages hp on hp.id = hs.house_page_id
where hs.kind = 'rich_text'
on conflict (id) do nothing;

insert into public.house_content_files
  (
    entity_type,
    entity_id,
    field_key,
    storage_bucket,
    storage_path,
    original_file_name
  )
select
  'house_information_post',
  hs.id,
  'coverImage',
  'house-information-images',
  substring((hs.content->>'coverImageUrl') from '/house-information-images/(.*)$'),
  null
from public.house_sections hs
where hs.kind = 'rich_text'
  and hs.content->>'coverImageUrl' is not null
  and hs.content->>'coverImageUrl' ~ '/house-information-images/'
  and substring((hs.content->>'coverImageUrl') from '/house-information-images/(.*)$') is not null
  and not exists (
    select 1
    from public.house_content_files hcf
    where hcf.entity_type = 'house_information_post'
      and hcf.entity_id = hs.id
      and hcf.field_key = 'coverImage'
  );
