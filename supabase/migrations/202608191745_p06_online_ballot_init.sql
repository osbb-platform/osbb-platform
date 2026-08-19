-- P06 T5 — atomic resident online ballot initiation.
--
-- Security:
-- - service_role only;
-- - resident session/origin/rate-limit are enforced by server action;
-- - this function revalidates all authoritative DB facts;
-- - no identity is accepted at initiation time;
-- - raw PII is never stored.
--
-- Pending TTL: 15 minutes.
-- Pending area is a SOFT reservation.
-- Hard area guarantee remains confirm_online_ballot() from T2.

create or replace function public.init_online_ballot(
  p_house_id uuid,
  p_meeting_id uuid,
  p_apartment_id uuid,
  p_owned_area_m2 numeric,
  p_answers jsonb,
  p_challenge text,
  p_provider text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meeting public.house_meetings%rowtype;
  v_apartment public.house_apartments%rowtype;

  v_expected_question_count integer;
  v_submitted_question_count integer;

  v_confirmed_area numeric(14,2);
  v_pending_area numeric(14,2);

  v_ballot_id uuid;
begin
  ---------------------------------------------------------------------------
  -- BASIC INPUT
  ---------------------------------------------------------------------------

  if p_house_id is null
     or p_meeting_id is null
     or p_apartment_id is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_SCOPE'
    );
  end if;

  if p_owned_area_m2 is null
     or p_owned_area_m2 <= 0 then
    return jsonb_build_object(
      'ok', false,
      'code', 'OWNED_AREA_INVALID'
    );
  end if;

  if nullif(btrim(coalesce(p_challenge, '')), '') is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'CHALLENGE_REQUIRED'
    );
  end if;

  if nullif(btrim(coalesce(p_provider, '')), '') is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'PROVIDER_REQUIRED'
    );
  end if;

  if p_answers is null
     or jsonb_typeof(p_answers) <> 'array' then
    return jsonb_build_object(
      'ok', false,
      'code', 'ANSWERS_INVALID'
    );
  end if;

  ---------------------------------------------------------------------------
  -- MEETING
  ---------------------------------------------------------------------------

  select *
  into v_meeting
  from public.house_meetings
  where id = p_meeting_id
    and house_id = p_house_id;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'code', 'MEETING_NOT_FOUND'
    );
  end if;

  if v_meeting.voting_mode <> 'online'
     or v_meeting.lifecycle_status <> 'published'
     or v_meeting.display_status <> 'active'
     or v_meeting.meeting_status <> 'in_progress' then
    return jsonb_build_object(
      'ok', false,
      'code', 'MEETING_NOT_ACTIVE_ONLINE'
    );
  end if;

  ---------------------------------------------------------------------------
  -- APARTMENT
  --
  -- Lock apartment so simultaneous initiation attempts for that apartment
  -- calculate the same soft reservation serially.
  ---------------------------------------------------------------------------

  select *
  into v_apartment
  from public.house_apartments
  where id = p_apartment_id
    and house_id = p_house_id
  for update;

  if not found
     or v_apartment.archived_at is not null then
    return jsonb_build_object(
      'ok', false,
      'code', 'APARTMENT_INVALID'
    );
  end if;

  if v_apartment.area is null
     or v_apartment.area <= 0 then
    return jsonb_build_object(
      'ok', false,
      'code', 'APARTMENT_AREA_MISSING'
    );
  end if;

  if p_owned_area_m2 > v_apartment.area then
    return jsonb_build_object(
      'ok', false,
      'code', 'OWNED_AREA_EXCEEDS_APARTMENT'
    );
  end if;

  ---------------------------------------------------------------------------
  -- HOUSEKEEPING
  --
  -- Expired pending ballots stop reserving area and can be retried.
  ---------------------------------------------------------------------------

  update public.house_meeting_online_ballots
  set status = 'expired'
  where meeting_id = p_meeting_id
    and status = 'pending'
    and challenge_expires_at <= now();

  insert into public.house_meeting_diia_events (
    ballot_id,
    event_type,
    provider,
    provider_txn_id,
    detail
  )
  select
    b.id,
    'expired',
    b.provider,
    null,
    jsonb_build_object('code', 'PENDING_HOUSEKEEPING_EXPIRED')
  from public.house_meeting_online_ballots b
  where b.meeting_id = p_meeting_id
    and b.status = 'expired'
    and b.updated_at >= transaction_timestamp()
    and not exists (
      select 1
      from public.house_meeting_diia_events e
      where e.ballot_id = b.id
        and e.event_type = 'expired'
    );

  ---------------------------------------------------------------------------
  -- ANSWER CONTRACT
  ---------------------------------------------------------------------------

  select count(*)
  into v_expected_question_count
  from public.house_meeting_questions q
  where q.meeting_id = p_meeting_id;

  select count(*)
  into v_submitted_question_count
  from jsonb_array_elements(p_answers) item;

  if v_expected_question_count <= 0
     or v_submitted_question_count <> v_expected_question_count then
    return jsonb_build_object(
      'ok', false,
      'code', 'ANSWERS_INCOMPLETE'
    );
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_answers) item
    where jsonb_typeof(item) <> 'object'
       or nullif(btrim(coalesce(item->>'questionId', '')), '') is null
       or (item->>'choice') not in ('for', 'against', 'abstained')
  ) then
    return jsonb_build_object(
      'ok', false,
      'code', 'ANSWERS_INVALID'
    );
  end if;

  if (
    select count(distinct item->>'questionId')
    from jsonb_array_elements(p_answers) item
  ) <> v_expected_question_count then
    return jsonb_build_object(
      'ok', false,
      'code', 'ANSWERS_DUPLICATE_OR_MISSING'
    );
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_answers) item
    where not exists (
      select 1
      from public.house_meeting_questions q
      where q.meeting_id = p_meeting_id
        and q.id::text = item->>'questionId'
    )
  ) then
    return jsonb_build_object(
      'ok', false,
      'code', 'QUESTION_SCOPE_INVALID'
    );
  end if;

  ---------------------------------------------------------------------------
  -- SOFT AREA RESERVATION
  ---------------------------------------------------------------------------

  select coalesce(sum(owned_area_m2), 0)
  into v_confirmed_area
  from public.house_meeting_online_ballots
  where meeting_id = p_meeting_id
    and apartment_id = p_apartment_id
    and status = 'confirmed';

  select coalesce(sum(owned_area_m2), 0)
  into v_pending_area
  from public.house_meeting_online_ballots
  where meeting_id = p_meeting_id
    and apartment_id = p_apartment_id
    and status = 'pending'
    and challenge_expires_at > now();

  if (
    v_confirmed_area
    + v_pending_area
    + p_owned_area_m2
  ) > v_apartment.area then
    return jsonb_build_object(
      'ok', false,
      'code', 'APARTMENT_AREA_SOFT_RESERVED',
      'apartment_area_m2', v_apartment.area,
      'confirmed_area_m2', v_confirmed_area,
      'pending_area_m2', v_pending_area
    );
  end if;

  ---------------------------------------------------------------------------
  -- BALLOT + ANSWERS + AUDIT — SAME TRANSACTION
  ---------------------------------------------------------------------------

  insert into public.house_meeting_online_ballots (
    meeting_id,
    house_id,
    apartment_id,
    identity_hmac,
    owned_area_m2,
    status,
    challenge,
    challenge_expires_at,
    provider
  )
  values (
    p_meeting_id,
    p_house_id,
    p_apartment_id,
    null,
    p_owned_area_m2,
    'pending',
    p_challenge,
    now() + interval '15 minutes',
    p_provider
  )
  returning id
  into v_ballot_id;

  insert into public.house_meeting_online_answers (
    ballot_id,
    question_id,
    choice
  )
  select
    v_ballot_id,
    (item->>'questionId')::uuid,
    item->>'choice'
  from jsonb_array_elements(p_answers) item;

  insert into public.house_meeting_diia_events (
    ballot_id,
    event_type,
    provider,
    provider_txn_id,
    detail
  )
  values (
    v_ballot_id,
    'initiated',
    p_provider,
    null,
    jsonb_build_object('code', 'AUTH_INITIATED')
  );

  return jsonb_build_object(
    'ok', true,
    'code', 'BALLOT_PENDING',
    'ballot_id', v_ballot_id,
    'challenge_expires_at',
      now() + interval '15 minutes'
  );
end;
$$;

revoke all
on function public.init_online_ballot(
  uuid,
  uuid,
  uuid,
  numeric,
  jsonb,
  text,
  text
)
from public;

revoke all
on function public.init_online_ballot(
  uuid,
  uuid,
  uuid,
  numeric,
  jsonb,
  text,
  text
)
from anon;

revoke all
on function public.init_online_ballot(
  uuid,
  uuid,
  uuid,
  numeric,
  jsonb,
  text,
  text
)
from authenticated;

grant execute
on function public.init_online_ballot(
  uuid,
  uuid,
  uuid,
  numeric,
  jsonb,
  text,
  text
)
to service_role;


create or replace function public.cancel_online_ballot_init(
  p_ballot_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_provider text;
begin
  update public.house_meeting_online_ballots
  set status = 'cancelled'
  where id = p_ballot_id
    and status = 'pending'
  returning provider
  into v_provider;

  if found then
    insert into public.house_meeting_diia_events (
      ballot_id,
      event_type,
      provider,
      provider_txn_id,
      detail
    )
    values (
      p_ballot_id,
      'error',
      v_provider,
      null,
      jsonb_build_object(
        'code',
        coalesce(nullif(btrim(p_reason), ''), 'AUTH_INIT_FAILED')
      )
    );
  end if;
end;
$$;

revoke all
on function public.cancel_online_ballot_init(uuid, text)
from public;

revoke all
on function public.cancel_online_ballot_init(uuid, text)
from anon;

revoke all
on function public.cancel_online_ballot_init(uuid, text)
from authenticated;

grant execute
on function public.cancel_online_ballot_init(uuid, text)
to service_role;
