alter table public.specialist_contact_requests
add column if not exists specialist_id text null;

alter table public.specialist_contact_requests
add column if not exists requester_phone text null;

alter table public.specialist_contact_requests
add column if not exists subject text null;

create index if not exists specialist_contact_requests_specialist_id_idx
  on public.specialist_contact_requests (specialist_id);
