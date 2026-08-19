-- P06 T2 — Online voting + Diia foundation.
--
-- Product invariants:
-- - existing manual voting remains unchanged;
-- - legacy/reserved public.house_meeting_votes remains untouched;
-- - meeting mode = manual | online;
-- - online ballot is pending until identity callback is verified;
-- - identity_hmac is intentionally nullable while status='pending' because
--   identity is not known until the Diia callback;
-- - confirmed area is serialized per apartment with FOR UPDATE;
-- - no direct anon/resident access to sensitive ballot tables;
-- - no raw Diia identity or passport data is persisted.
--
-- Rollback strategy: forward-fix only.
-- Feature can remain unused because all existing meetings default to manual.

-------------------------------------------------------------------------------
-- PRE-FLIGHT SQL (production, read-only, before applying)
-------------------------------------------------------------------------------
--
-- select meeting_status, display_status, count(*)
-- from public.house_meetings
-- group by 1,2
-- order by 1,2;
--
-- select count(*) as manual_vote_count
-- from public.house_meeting_manual_votes;
--
-- select count(*) as reserved_legacy_vote_count
-- from public.house_meeting_votes;
--
-- select
--   count(*) filter (where area is null) as apartments_without_area,
--   count(*) filter (where area is not null and area <= 0) as nonpositive_area
-- from public.house_apartments
-- where archived_at is null;

-------------------------------------------------------------------------------
-- MEETING MODE
-------------------------------------------------------------------------------

alter table public.house_meetings
  add column if not exists voting_mode text not null default 'manual';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'house_meetings_voting_mode_check'
      and conrelid = 'public.house_meetings'::regclass
  ) then
    alter table public.house_meetings
      add constraint house_meetings_voting_mode_check
      check (voting_mode in ('manual', 'online'));
  end if;
end
$$;

comment on column public.house_meetings.voting_mode is
  'P06 voting mode. Existing meetings default to manual. Immutable after any manual or online ballot exists.';

-------------------------------------------------------------------------------
-- ONLINE BALLOTS
-------------------------------------------------------------------------------

create table if not exists public.house_meeting_online_ballots (
  id uuid primary key default gen_random_uuid(),

  meeting_id uuid not null
    references public.house_meetings(id)
    on delete cascade,

  house_id uuid not null
    references public.houses(id)
    on delete cascade,

  apartment_id uuid not null
    references public.house_apartments(id)
    on delete restrict,

  -- NULL before verified callback. Never store raw identity.
  identity_hmac text null,

  owned_area_m2 numeric(10,2) not null
    check (owned_area_m2 > 0),

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'confirmed',
        'expired',
        'failed',
        'cancelled'
      )
    ),

  challenge text not null,
  challenge_expires_at timestamptz not null,

  provider text not null default 'mock',
  provider_txn_id text null,
  verified_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.house_meeting_online_ballots is
  'P06 privacy-minimized online ballots. identity_hmac contains HMAC only; raw Diia identity is forbidden.';

create unique index if not exists
  house_meeting_online_ballots_challenge_uq
on public.house_meeting_online_ballots (challenge);

create unique index if not exists
  house_meeting_online_ballots_identity_active_uq
on public.house_meeting_online_ballots (
  meeting_id,
  identity_hmac
)
where
  identity_hmac is not null
  and status in ('pending', 'confirmed');

create unique index if not exists
  house_meeting_online_ballots_provider_txn_uq
on public.house_meeting_online_ballots (
  provider,
  provider_txn_id
)
where provider_txn_id is not null;

create index if not exists
  house_meeting_online_ballots_meeting_apartment_status_idx
on public.house_meeting_online_ballots (
  meeting_id,
  apartment_id,
  status
);

create index if not exists
  house_meeting_online_ballots_house_status_idx
on public.house_meeting_online_ballots (
  house_id,
  status
);

-------------------------------------------------------------------------------
-- ONLINE ANSWERS
-------------------------------------------------------------------------------

create table if not exists public.house_meeting_online_answers (
  id uuid primary key default gen_random_uuid(),

  ballot_id uuid not null
    references public.house_meeting_online_ballots(id)
    on delete cascade,

  question_id uuid not null
    references public.house_meeting_questions(id)
    on delete cascade,

  choice text not null
    check (choice in ('for', 'against', 'abstained')),

  created_at timestamptz not null default now(),

  unique (ballot_id, question_id)
);

create index if not exists
  house_meeting_online_answers_question_idx
on public.house_meeting_online_answers (question_id);

-------------------------------------------------------------------------------
-- DIIA INTEGRATION EVENT LOG — NO PII
-------------------------------------------------------------------------------

create table if not exists public.house_meeting_diia_events (
  id uuid primary key default gen_random_uuid(),

  ballot_id uuid null
    references public.house_meeting_online_ballots(id)
    on delete set null,

  event_type text not null
    check (
      event_type in (
        'initiated',
        'callback_received',
        'confirmed',
        'rejected',
        'replay_blocked',
        'expired',
        'error'
      )
    ),

  provider text not null,
  provider_txn_id text null,

  -- Technical status/error codes only. Never raw provider payload or PII.
  detail jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

comment on column public.house_meeting_diia_events.detail is
  'Technical codes only. Raw Diia callback payload and personal data are forbidden.';

create index if not exists
  house_meeting_diia_events_ballot_created_idx
on public.house_meeting_diia_events (
  ballot_id,
  created_at desc
);

create index if not exists
  house_meeting_diia_events_provider_txn_idx
on public.house_meeting_diia_events (
  provider,
  provider_txn_id
)
where provider_txn_id is not null;

-------------------------------------------------------------------------------
-- UPDATED_AT
-------------------------------------------------------------------------------

create or replace function public.p06_touch_online_ballot_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists
  p06_house_meeting_online_ballot_updated_at
on public.house_meeting_online_ballots;

create trigger p06_house_meeting_online_ballot_updated_at
before update on public.house_meeting_online_ballots
for each row
execute function public.p06_touch_online_ballot_updated_at();

-------------------------------------------------------------------------------
-- VOTING MODE IMMUTABILITY SAFETY TRIGGER
-------------------------------------------------------------------------------

create or replace function public.p06_guard_meeting_voting_mode()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.voting_mode is distinct from old.voting_mode then
    if exists (
      select 1
      from public.house_meeting_manual_votes mv
      where mv.meeting_id = old.id
    ) or exists (
      select 1
      from public.house_meeting_online_ballots ob
      where ob.meeting_id = old.id
    ) then
      raise exception using
        errcode = '23514',
        message = 'MEETING_VOTING_MODE_IMMUTABLE';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists
  p06_house_meetings_voting_mode_immutable
on public.house_meetings;

create trigger p06_house_meetings_voting_mode_immutable
before update of voting_mode
on public.house_meetings
for each row
execute function public.p06_guard_meeting_voting_mode();

-------------------------------------------------------------------------------
-- RLS
--
-- Resident writes are NOT exposed by table policies.
-- They happen via guarded server code / security-definer RPCs.
-------------------------------------------------------------------------------

alter table public.house_meeting_online_ballots enable row level security;
alter table public.house_meeting_online_answers enable row level security;
alter table public.house_meeting_diia_events enable row level security;

drop policy if exists
  house_meeting_online_ballots_admin_read
on public.house_meeting_online_ballots;

create policy house_meeting_online_ballots_admin_read
on public.house_meeting_online_ballots
for select
to authenticated
using (public.get_my_admin_role() is not null);

drop policy if exists
  house_meeting_online_answers_admin_read
on public.house_meeting_online_answers;

create policy house_meeting_online_answers_admin_read
on public.house_meeting_online_answers
for select
to authenticated
using (public.get_my_admin_role() is not null);

drop policy if exists
  house_meeting_diia_events_admin_read
on public.house_meeting_diia_events;

create policy house_meeting_diia_events_admin_read
on public.house_meeting_diia_events
for select
to authenticated
using (public.get_my_admin_role() is not null);

-------------------------------------------------------------------------------
-- ATOMIC CONFIRMATION
--
-- Business failures RETURN a code instead of raising, so failed/expired status
-- and integration audit remain committed.
--
-- identity_hmac must already have been written by the verified callback layer.
-------------------------------------------------------------------------------

create or replace function public.confirm_online_ballot(
  p_ballot_id uuid,
  p_txn_id text,
  p_verified_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ballot public.house_meeting_online_ballots%rowtype;
  v_apartment public.house_apartments%rowtype;
  v_meeting public.house_meetings%rowtype;
  v_confirmed_area numeric(14,2);
begin
  if p_ballot_id is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'BALLOT_ID_REQUIRED'
    );
  end if;

  if nullif(btrim(coalesce(p_txn_id, '')), '') is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'TXN_ID_REQUIRED'
    );
  end if;

  select *
  into v_ballot
  from public.house_meeting_online_ballots
  where id = p_ballot_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'code', 'BALLOT_NOT_FOUND'
    );
  end if;

  -- Idempotent confirmed callback.
  if v_ballot.status = 'confirmed' then
    if v_ballot.provider_txn_id = p_txn_id then
      return jsonb_build_object(
        'ok', true,
        'code', 'ALREADY_CONFIRMED'
      );
    end if;

    return jsonb_build_object(
      'ok', false,
      'code', 'BALLOT_ALREADY_TERMINAL'
    );
  end if;

  if v_ballot.status <> 'pending' then
    return jsonb_build_object(
      'ok', false,
      'code', 'BALLOT_NOT_PENDING'
    );
  end if;

  if v_ballot.challenge_expires_at <= now() then
    update public.house_meeting_online_ballots
    set status = 'expired'
    where id = v_ballot.id;

    insert into public.house_meeting_diia_events (
      ballot_id,
      event_type,
      provider,
      provider_txn_id,
      detail
    )
    values (
      v_ballot.id,
      'expired',
      v_ballot.provider,
      p_txn_id,
      jsonb_build_object('code', 'CHALLENGE_EXPIRED')
    );

    return jsonb_build_object(
      'ok', false,
      'code', 'CHALLENGE_EXPIRED'
    );
  end if;

  if v_ballot.identity_hmac is null
     or btrim(v_ballot.identity_hmac) = '' then
    update public.house_meeting_online_ballots
    set status = 'failed'
    where id = v_ballot.id;

    insert into public.house_meeting_diia_events (
      ballot_id,
      event_type,
      provider,
      provider_txn_id,
      detail
    )
    values (
      v_ballot.id,
      'rejected',
      v_ballot.provider,
      p_txn_id,
      jsonb_build_object('code', 'IDENTITY_NOT_VERIFIED')
    );

    return jsonb_build_object(
      'ok', false,
      'code', 'IDENTITY_NOT_VERIFIED'
    );
  end if;

  if exists (
    select 1
    from public.house_meeting_online_ballots other_ballot
    where other_ballot.provider = v_ballot.provider
      and other_ballot.provider_txn_id = p_txn_id
      and other_ballot.id <> v_ballot.id
  ) then
    update public.house_meeting_online_ballots
    set status = 'failed'
    where id = v_ballot.id;

    insert into public.house_meeting_diia_events (
      ballot_id,
      event_type,
      provider,
      provider_txn_id,
      detail
    )
    values (
      v_ballot.id,
      'rejected',
      v_ballot.provider,
      p_txn_id,
      jsonb_build_object('code', 'PROVIDER_TXN_ALREADY_USED')
    );

    return jsonb_build_object(
      'ok', false,
      'code', 'PROVIDER_TXN_ALREADY_USED'
    );
  end if;

  select *
  into v_meeting
  from public.house_meetings
  where id = v_ballot.meeting_id;

  if not found
     or v_meeting.house_id <> v_ballot.house_id
     or v_meeting.voting_mode <> 'online'
     or v_meeting.meeting_status <> 'in_progress'
     or v_meeting.display_status <> 'active'
     or v_meeting.lifecycle_status <> 'published' then

    update public.house_meeting_online_ballots
    set status = 'failed'
    where id = v_ballot.id;

    insert into public.house_meeting_diia_events (
      ballot_id,
      event_type,
      provider,
      provider_txn_id,
      detail
    )
    values (
      v_ballot.id,
      'rejected',
      v_ballot.provider,
      p_txn_id,
      jsonb_build_object('code', 'MEETING_NOT_ACTIVE_ONLINE')
    );

    return jsonb_build_object(
      'ok', false,
      'code', 'MEETING_NOT_ACTIVE_ONLINE'
    );
  end if;

  -- Serialize ALL confirmation attempts for the same apartment.
  select *
  into v_apartment
  from public.house_apartments
  where id = v_ballot.apartment_id
  for update;

  if not found
     or v_apartment.house_id <> v_ballot.house_id
     or v_apartment.archived_at is not null then

    update public.house_meeting_online_ballots
    set status = 'failed'
    where id = v_ballot.id;

    insert into public.house_meeting_diia_events (
      ballot_id,
      event_type,
      provider,
      provider_txn_id,
      detail
    )
    values (
      v_ballot.id,
      'rejected',
      v_ballot.provider,
      p_txn_id,
      jsonb_build_object('code', 'APARTMENT_INVALID')
    );

    return jsonb_build_object(
      'ok', false,
      'code', 'APARTMENT_INVALID'
    );
  end if;

  if v_apartment.area is null or v_apartment.area <= 0 then
    update public.house_meeting_online_ballots
    set status = 'failed'
    where id = v_ballot.id;

    insert into public.house_meeting_diia_events (
      ballot_id,
      event_type,
      provider,
      provider_txn_id,
      detail
    )
    values (
      v_ballot.id,
      'rejected',
      v_ballot.provider,
      p_txn_id,
      jsonb_build_object('code', 'APARTMENT_AREA_MISSING')
    );

    return jsonb_build_object(
      'ok', false,
      'code', 'APARTMENT_AREA_MISSING'
    );
  end if;

  select coalesce(sum(owned_area_m2), 0)
  into v_confirmed_area
  from public.house_meeting_online_ballots
  where meeting_id = v_ballot.meeting_id
    and apartment_id = v_ballot.apartment_id
    and status = 'confirmed'
    and id <> v_ballot.id;

  if v_confirmed_area + v_ballot.owned_area_m2 > v_apartment.area then
    update public.house_meeting_online_ballots
    set status = 'failed'
    where id = v_ballot.id;

    insert into public.house_meeting_diia_events (
      ballot_id,
      event_type,
      provider,
      provider_txn_id,
      detail
    )
    values (
      v_ballot.id,
      'rejected',
      v_ballot.provider,
      p_txn_id,
      jsonb_build_object('code', 'APARTMENT_AREA_EXCEEDED')
    );

    return jsonb_build_object(
      'ok', false,
      'code', 'APARTMENT_AREA_EXCEEDED'
    );
  end if;

  update public.house_meeting_online_ballots
  set
    status = 'confirmed',
    provider_txn_id = p_txn_id,
    verified_at = coalesce(p_verified_at, now())
  where id = v_ballot.id;

  insert into public.house_meeting_diia_events (
    ballot_id,
    event_type,
    provider,
    provider_txn_id,
    detail
  )
  values (
    v_ballot.id,
    'confirmed',
    v_ballot.provider,
    p_txn_id,
    jsonb_build_object('code', 'CONFIRMED')
  );

  return jsonb_build_object(
    'ok', true,
    'code', 'CONFIRMED',
    'confirmed_area_m2', v_ballot.owned_area_m2
  );
end;
$$;

-------------------------------------------------------------------------------
-- RPC ACCESS
-------------------------------------------------------------------------------

revoke all
on function public.confirm_online_ballot(uuid, text, timestamptz)
from public;

revoke all
on function public.confirm_online_ballot(uuid, text, timestamptz)
from anon;

revoke all
on function public.confirm_online_ballot(uuid, text, timestamptz)
from authenticated;

grant execute
on function public.confirm_online_ballot(uuid, text, timestamptz)
to service_role;

-------------------------------------------------------------------------------
-- VERIFICATION SQL (run after applying to dev/prod)
-------------------------------------------------------------------------------
--
-- select column_name, data_type, column_default
-- from information_schema.columns
-- where table_schema='public'
--   and table_name='house_meetings'
--   and column_name='voting_mode';
--
-- select voting_mode, count(*)
-- from public.house_meetings
-- group by 1;
-- -- Existing meetings must all be manual immediately after migration.
--
-- select tablename, rowsecurity
-- from pg_tables
-- where schemaname='public'
--   and tablename in (
--     'house_meeting_online_ballots',
--     'house_meeting_online_answers',
--     'house_meeting_diia_events'
--   );
--
-- select proname, prosecdef
-- from pg_proc
-- where proname in (
--   'confirm_online_ballot',
--   'p06_guard_meeting_voting_mode'
-- );
--
-- select indexname
-- from pg_indexes
-- where schemaname='public'
--   and tablename='house_meeting_online_ballots'
-- order by indexname;
--
-- select count(*) from public.house_meeting_votes;
-- -- Must exactly match preflight count: legacy/reserved table is untouched.
