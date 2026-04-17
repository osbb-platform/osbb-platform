drop policy if exists "Authenticated admins can delete archived houses" on public.houses;

create policy "Authenticated admins can delete archived houses"
on public.houses
for delete
to authenticated
using (
  is_authenticated_admin()
  and archived_at is not null
);
