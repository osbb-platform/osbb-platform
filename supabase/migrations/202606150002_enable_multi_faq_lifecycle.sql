-- FAQ lifecycle v2:
-- - allow multiple FAQ records per house
-- - keep only one published FAQ per house
-- - save/replace items by FAQ id
-- - publish draft FAQ by replacing the current published FAQ

alter table if exists public.house_faq
  drop constraint if exists house_faq_house_id_key;

drop index if exists public.house_faq_house_id_key;

create index if not exists house_faq_house_id_created_at_idx
  on public.house_faq (house_id, created_at desc);

create index if not exists house_faq_house_id_updated_at_idx
  on public.house_faq (house_id, updated_at desc);

create unique index if not exists house_faq_one_published_per_house_idx
  on public.house_faq (house_id)
  where lifecycle_status = 'published';

create or replace function public.replace_house_faq_items_by_id(
  p_house_id uuid,
  p_faq_id uuid,
  p_lock_version integer,
  p_items jsonb
)
returns public.house_faq
language plpgsql
security definer
set search_path = public
as $$
declare
  v_faq public.house_faq;
  v_item jsonb;
  v_sort_order integer := 0;
  v_now timestamptz := now();
begin
  select *
  into v_faq
  from public.house_faq
  where id = p_faq_id
    and house_id = p_house_id
  for update;

  if not found then
    raise exception 'FAQ_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_faq.lock_version <> p_lock_version then
    raise exception 'STALE_CONTENT' using errcode = '40001';
  end if;

  if v_faq.lifecycle_status = 'archived' then
    raise exception 'FAQ_ARCHIVED' using errcode = 'P0001';
  end if;

  delete from public.house_faq_items
  where faq_id = v_faq.id;

  for v_item in
    select value
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    insert into public.house_faq_items (
      faq_id,
      question,
      answer,
      sort_order
    )
    values (
      v_faq.id,
      coalesce(v_item ->> 'question', ''),
      coalesce(v_item ->> 'answer', ''),
      v_sort_order
    );

    v_sort_order := v_sort_order + 1;
  end loop;

  update public.house_faq
  set
    lock_version = lock_version + 1,
    updated_at = v_now
  where id = v_faq.id
  returning * into v_faq;

  return v_faq;
end;
$$;

grant execute on function public.replace_house_faq_items_by_id(uuid, uuid, integer, jsonb) to authenticated;

create or replace function public.publish_house_faq(
  p_house_id uuid,
  p_faq_id uuid,
  p_lock_version integer
)
returns public.house_faq
language plpgsql
security definer
set search_path = public
as $$
declare
  v_faq public.house_faq;
  v_now timestamptz := now();
begin
  select *
  into v_faq
  from public.house_faq
  where id = p_faq_id
    and house_id = p_house_id
  for update;

  if not found then
    raise exception 'FAQ_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_faq.lock_version <> p_lock_version then
    raise exception 'STALE_CONTENT' using errcode = '40001';
  end if;

  if v_faq.lifecycle_status = 'archived' then
    raise exception 'FAQ_ARCHIVED' using errcode = 'P0001';
  end if;

  if v_faq.lifecycle_status <> 'published' then
    update public.house_faq
    set
      lifecycle_status = 'archived',
      archived_at = v_now,
      lock_version = lock_version + 1,
      updated_at = v_now
    where house_id = p_house_id
      and id <> p_faq_id
      and lifecycle_status = 'published';
  end if;

  update public.house_faq
  set
    lifecycle_status = 'published',
    published_at = coalesce(published_at, v_now),
    archived_at = null,
    lock_version = lock_version + 1,
    updated_at = v_now
  where id = p_faq_id
    and house_id = p_house_id
  returning * into v_faq;

  return v_faq;
end;
$$;

grant execute on function public.publish_house_faq(uuid, uuid, integer) to authenticated;
