alter table public.company_pages
add column if not exists is_primary boolean not null default false;

alter table public.company_pages
add column if not exists nav_order integer not null default 100;

alter table public.company_pages
add column if not exists show_in_navigation boolean not null default true;

alter table public.company_pages
add column if not exists show_in_footer boolean not null default false;

update public.company_pages
set is_primary = true
where slug = 'home-main';

create unique index if not exists company_pages_single_primary_idx
on public.company_pages (is_primary)
where is_primary = true;
