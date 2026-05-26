create or replace function public.replace_house_faq_items(
  p_house_id uuid,
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
  where house_id = p_house_id
  for update;

  if not found then
    raise exception 'FAQ_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_faq.lock_version <> p_lock_version then
    raise exception 'STALE_CONTENT' using errcode = '40001';
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

grant execute on function public.replace_house_faq_items(uuid, integer, jsonb) to authenticated;
