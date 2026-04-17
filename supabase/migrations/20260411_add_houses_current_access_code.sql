alter table public.houses
add column if not exists current_access_code text null;

comment on column public.houses.current_access_code
is 'Readable current house access code for CMS operational access.';

create index if not exists houses_current_access_code_idx
  on public.houses (current_access_code);
