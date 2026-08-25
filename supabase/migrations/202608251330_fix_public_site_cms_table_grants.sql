-- Restore table-level privileges required for the existing public.site_* RLS policies.
--
-- PostgreSQL checks table privileges before row-level security. The original
-- public site CMS migration defined correct RLS policies for anon/authenticated
-- but did not grant the underlying table privileges, causing PostgREST reads to
-- fail with SQLSTATE 42501 before RLS could be evaluated.
--
-- Security model after this migration:
--   anon          -> SELECT only; existing public-read RLS policies filter rows.
--   authenticated -> SELECT/INSERT/UPDATE/DELETE; existing RLS policies enforce
--                    public reads and active-admin write authorization.
--   service_role  -> full DML for trusted server-side operational access.
--
-- No RLS policy is weakened or replaced.

grant usage on schema public to anon, authenticated, service_role;

grant select
  on table
    public.site_settings,
    public.site_cities,
    public.site_testimonials,
    public.site_post_categories,
    public.site_posts,
    public.site_releases
  to anon;

grant select, insert, update, delete
  on table
    public.site_settings,
    public.site_cities,
    public.site_testimonials,
    public.site_post_categories,
    public.site_posts,
    public.site_releases
  to authenticated;

grant select, insert, update, delete
  on table
    public.site_settings,
    public.site_cities,
    public.site_testimonials,
    public.site_post_categories,
    public.site_posts,
    public.site_releases
  to service_role;
