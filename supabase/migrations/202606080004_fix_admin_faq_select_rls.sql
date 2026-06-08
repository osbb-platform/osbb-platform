-- Allow authenticated admins to read FAQ draft/published/archived rows in admin.
-- Public read policy can stay lifecycle-restricted, but admin loaders need full access.

drop policy if exists "Authenticated admins can read house faq" on public.house_faq;
create policy "Authenticated admins can read house faq"
on public.house_faq
for select
to authenticated
using (public.is_authenticated_admin());

drop policy if exists "Authenticated admins can read house faq items" on public.house_faq_items;
create policy "Authenticated admins can read house faq items"
on public.house_faq_items
for select
to authenticated
using (public.is_authenticated_admin());
