insert into storage.buckets (id, name, public)
values
  ('house-plan-media', 'house-plan-media', false),
  ('house-plan-documents', 'house-plan-documents', false)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users can view house plan storage'
  ) then
    execute $policy$
      create policy "Authenticated users can view house plan storage"
      on storage.objects
      for select
      to authenticated
      using (bucket_id in ('house-plan-media', 'house-plan-documents'))
    $policy$;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users can upload house plan storage'
  ) then
    execute $policy$
      create policy "Authenticated users can upload house plan storage"
      on storage.objects
      for insert
      to authenticated
      with check (bucket_id in ('house-plan-media', 'house-plan-documents'))
    $policy$;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users can update house plan storage'
  ) then
    execute $policy$
      create policy "Authenticated users can update house plan storage"
      on storage.objects
      for update
      to authenticated
      using (bucket_id in ('house-plan-media', 'house-plan-documents'))
      with check (bucket_id in ('house-plan-media', 'house-plan-documents'))
    $policy$;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users can delete house plan storage'
  ) then
    execute $policy$
      create policy "Authenticated users can delete house plan storage"
      on storage.objects
      for delete
      to authenticated
      using (bucket_id in ('house-plan-media', 'house-plan-documents'))
    $policy$;
  end if;
end
$$;
