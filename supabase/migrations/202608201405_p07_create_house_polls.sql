-- P07 — resident polls database foundation.
--
-- Scope:
--   * house_polls
--   * house_poll_questions
--   * house_poll_options
--   * house_poll_participation
--   * house_poll_answers
--   * constraints / indexes / updated_at
--   * explicit RLS
--
-- Security model:
--   * published poll definition is public-readable;
--   * answers and participation are NEVER directly public/resident-readable;
--   * resident writes will be performed later through a server-side SECURITY
--     DEFINER RPC guarded by withResidentSession + rate limiting;
--   * authenticated admin management follows the existing admin-role predicate.
--
-- Controlled anonymity:
--   * house_poll_participation is the only apartment participation link;
--   * house_poll_answers.apartment_id MUST be NULL for anonymous polls;
--   * there is deliberately no per-submit linking identifier joining participation to answers.

create table if not exists public.house_polls (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses(id) on delete cascade,
  title text not null,
  description text not null default '',
  identity_mode text not null default 'open'
    check (identity_mode in ('open', 'anonymous')),
  results_visibility text not null default 'after_completion'
    check (results_visibility in ('immediate', 'after_completion', 'hidden')),
  poll_status text not null default 'idle'
    check (poll_status in ('idle', 'active', 'completed')),
  lifecycle_status text not null default 'draft'
    check (lifecycle_status in ('draft', 'published', 'archived')),
  lock_version integer not null default 1
    check (lock_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz null,
  archived_at timestamptz null,
  created_by uuid null references public.profiles(id) on delete set null,
  constraint house_polls_title_not_blank
    check (length(btrim(title)) > 0),
  constraint house_polls_lifecycle_poll_state_check
    check (
      (lifecycle_status = 'draft' and poll_status = 'idle')
      or
      (lifecycle_status = 'published' and poll_status in ('idle', 'active', 'completed'))
      or
      (lifecycle_status = 'archived' and poll_status in ('idle', 'completed'))
    )
);

create index if not exists house_polls_house_lifecycle_status_idx
  on public.house_polls (house_id, lifecycle_status, poll_status);

create index if not exists house_polls_house_updated_at_idx
  on public.house_polls (house_id, updated_at desc);

create table if not exists public.house_poll_questions (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.house_polls(id) on delete cascade,
  question text not null,
  description text not null default '',
  question_type text not null
    check (
      question_type in (
        'single_choice',
        'multiple_choice',
        'yes_no',
        'scale',
        'free_text'
      )
    ),
  scale_max integer null check (scale_max in (5, 10)),
  scale_min_label text null,
  scale_max_label text null,
  is_required boolean not null default true,
  sort_order integer not null default 0,
  constraint house_poll_questions_question_not_blank
    check (length(btrim(question)) > 0),
  constraint house_poll_questions_scale_shape_check
    check (
      (question_type = 'scale' and scale_max in (5, 10))
      or
      (question_type <> 'scale'
        and scale_max is null
        and scale_min_label is null
        and scale_max_label is null)
    )
);

create index if not exists house_poll_questions_poll_sort_idx
  on public.house_poll_questions (poll_id, sort_order, id);

create table if not exists public.house_poll_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.house_poll_questions(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  constraint house_poll_options_label_not_blank
    check (length(btrim(label)) > 0)
);

create index if not exists house_poll_options_question_sort_idx
  on public.house_poll_options (question_id, sort_order, id);

create table if not exists public.house_poll_participation (
  poll_id uuid not null references public.house_polls(id) on delete cascade,
  apartment_id uuid not null references public.house_apartments(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  primary key (poll_id, apartment_id)
);

create index if not exists house_poll_participation_apartment_idx
  on public.house_poll_participation (apartment_id, submitted_at desc);

create table if not exists public.house_poll_answers (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.house_polls(id) on delete cascade,
  question_id uuid not null references public.house_poll_questions(id) on delete cascade,
  apartment_id uuid null references public.house_apartments(id) on delete set null,
  option_id uuid null references public.house_poll_options(id) on delete cascade,
  scale_value integer null,
  bool_value boolean null,
  text_value text null,
  created_at timestamptz not null default now(),
  constraint house_poll_answers_single_value_shape_check
    check (
      (case when option_id is not null then 1 else 0 end)
      + (case when scale_value is not null then 1 else 0 end)
      + (case when bool_value is not null then 1 else 0 end)
      + (case when text_value is not null then 1 else 0 end)
      = 1
    ),
  constraint house_poll_answers_scale_range_check
    check (scale_value is null or scale_value between 1 and 10),
  constraint house_poll_answers_text_not_blank_check
    check (text_value is null or length(btrim(text_value)) > 0)
);

create index if not exists house_poll_answers_poll_question_idx
  on public.house_poll_answers (poll_id, question_id);

create index if not exists house_poll_answers_poll_apartment_idx
  on public.house_poll_answers (poll_id, apartment_id)
  where apartment_id is not null;

-- Reuse the platform-wide updated_at trigger function already present in baseline.
drop trigger if exists house_polls_set_updated_at on public.house_polls;
create trigger house_polls_set_updated_at
before update on public.house_polls
for each row execute function public.set_updated_at();

alter table public.house_polls enable row level security;
alter table public.house_poll_questions enable row level security;
alter table public.house_poll_options enable row level security;
alter table public.house_poll_participation enable row level security;
alter table public.house_poll_answers enable row level security;

-- Admin management.
drop policy if exists house_polls_admin_manage on public.house_polls;
create policy house_polls_admin_manage
on public.house_polls
for all
to authenticated
using (
  public.get_my_admin_role() is not null
  and public.get_my_admin_role() <> 'inactive'
)
with check (
  public.get_my_admin_role() is not null
  and public.get_my_admin_role() <> 'inactive'
);

drop policy if exists house_poll_questions_admin_manage on public.house_poll_questions;
create policy house_poll_questions_admin_manage
on public.house_poll_questions
for all
to authenticated
using (
  public.get_my_admin_role() is not null
  and public.get_my_admin_role() <> 'inactive'
)
with check (
  public.get_my_admin_role() is not null
  and public.get_my_admin_role() <> 'inactive'
);

drop policy if exists house_poll_options_admin_manage on public.house_poll_options;
create policy house_poll_options_admin_manage
on public.house_poll_options
for all
to authenticated
using (
  public.get_my_admin_role() is not null
  and public.get_my_admin_role() <> 'inactive'
)
with check (
  public.get_my_admin_role() is not null
  and public.get_my_admin_role() <> 'inactive'
);

drop policy if exists house_poll_participation_admin_manage on public.house_poll_participation;
create policy house_poll_participation_admin_manage
on public.house_poll_participation
for all
to authenticated
using (
  public.get_my_admin_role() is not null
  and public.get_my_admin_role() <> 'inactive'
)
with check (
  public.get_my_admin_role() is not null
  and public.get_my_admin_role() <> 'inactive'
);

drop policy if exists house_poll_answers_admin_manage on public.house_poll_answers;
create policy house_poll_answers_admin_manage
on public.house_poll_answers
for all
to authenticated
using (
  public.get_my_admin_role() is not null
  and public.get_my_admin_role() <> 'inactive'
)
with check (
  public.get_my_admin_role() is not null
  and public.get_my_admin_role() <> 'inactive'
);

-- Public definition read: only published poll metadata and its question tree.
drop policy if exists house_polls_public_read_published on public.house_polls;
create policy house_polls_public_read_published
on public.house_polls
for select
to anon
using (lifecycle_status = 'published');

drop policy if exists house_poll_questions_public_read_published on public.house_poll_questions;
create policy house_poll_questions_public_read_published
on public.house_poll_questions
for select
to anon
using (
  exists (
    select 1
    from public.house_polls p
    where p.id = poll_id
      and p.lifecycle_status = 'published'
  )
);

drop policy if exists house_poll_options_public_read_published on public.house_poll_options;
create policy house_poll_options_public_read_published
on public.house_poll_options
for select
to anon
using (
  exists (
    select 1
    from public.house_poll_questions q
    join public.house_polls p on p.id = q.poll_id
    where q.id = question_id
      and p.lifecycle_status = 'published'
  )
);

-- Deliberately NO anon/resident policies on answers or participation.
-- Their data is only exposed later through validated server-side read models.

-- P07 explicit base table privileges.
-- Policies do not replace PostgreSQL table privileges.
grant select
on table public.house_polls, public.house_poll_questions, public.house_poll_options
to anon;

grant select, insert, update, delete
on table public.house_polls, public.house_poll_questions, public.house_poll_options,
  public.house_poll_participation, public.house_poll_answers
to authenticated;

grant select, insert, update, delete
on table public.house_polls, public.house_poll_questions, public.house_poll_options,
  public.house_poll_participation, public.house_poll_answers
to service_role;
