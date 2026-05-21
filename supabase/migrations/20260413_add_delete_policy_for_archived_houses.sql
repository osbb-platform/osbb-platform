do $$
begin
  if to_regclass('public.houses') is not null
     and to_regprocedure('public.is_authenticated_admin()') is not null then
    drop policy if exists "Authenticated admins can delete archived houses" on public.houses;

    create policy "Authenticated admins can delete archived houses"
    on public.houses
    for delete
    to authenticated
    using (
      is_authenticated_admin()
      and archived_at is not null
    );
  end if;
end $$;
