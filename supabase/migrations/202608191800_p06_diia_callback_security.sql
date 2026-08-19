-- P06 T6 — verified Diia callback preparation.
--
-- Provider authenticity is checked in provider.verifyCallback() first.
-- This SQL stage then atomically binds the verified callback to one ballot:
-- - ballot FOR UPDATE;
-- - meeting/house/challenge/provider binding;
-- - one-use challenge;
-- - HMAC identity only, never raw identity;
-- - duplicate identity protection;
-- - provider transaction replay protection.
--
-- Final apartment-area enforcement stays in confirm_online_ballot().

alter table public.house_meeting_online_ballots
  add column if not exists challenge_used_at timestamptz null;

comment on column public.house_meeting_online_ballots.challenge_used_at is
  'Set only after an authenticated provider callback has consumed the ballot challenge.';


create or replace function public.prepare_online_ballot_callback(
  p_ballot_id uuid,
  p_meeting_id uuid,
  p_house_slug text,
  p_challenge text,
  p_provider text,
  p_identity_hmac text,
  p_txn_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ballot public.house_meeting_online_ballots%rowtype;
begin
  if p_ballot_id is null
     or p_meeting_id is null
     or nullif(btrim(coalesce(p_house_slug, '')), '') is null
     or nullif(btrim(coalesce(p_challenge, '')), '') is null
     or nullif(btrim(coalesce(p_provider, '')), '') is null
     or nullif(btrim(coalesce(p_identity_hmac, '')), '') is null
     or nullif(btrim(coalesce(p_txn_id, '')), '') is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'CALLBACK_BINDING_INVALID'
    );
  end if;

  ---------------------------------------------------------------------------
  -- SERIALIZE ALL CALLBACKS FOR THIS BALLOT
  ---------------------------------------------------------------------------

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

  ---------------------------------------------------------------------------
  -- VERIFIED RETURN CONTEXT MUST MATCH AUTHORITATIVE BALLOT
  ---------------------------------------------------------------------------

  if v_ballot.meeting_id <> p_meeting_id
     or v_ballot.provider <> p_provider
     or v_ballot.challenge <> p_challenge
     or not exists (
       select 1
       from public.houses h
       where h.id = v_ballot.house_id
         and h.slug = lower(btrim(p_house_slug))
     ) then

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
      jsonb_build_object('code', 'CALLBACK_BINDING_MISMATCH')
    );

    return jsonb_build_object(
      'ok', false,
      'code', 'CALLBACK_BINDING_MISMATCH'
    );
  end if;

  ---------------------------------------------------------------------------
  -- IDEMPOTENT SUCCESS
  ---------------------------------------------------------------------------

  if v_ballot.status = 'confirmed'
     and v_ballot.provider_txn_id = p_txn_id then

    insert into public.house_meeting_diia_events (
      ballot_id,
      event_type,
      provider,
      provider_txn_id,
      detail
    )
    values (
      v_ballot.id,
      'replay_blocked',
      v_ballot.provider,
      p_txn_id,
      jsonb_build_object('code', 'ALREADY_CONFIRMED_IDEMPOTENT')
    );

    return jsonb_build_object(
      'ok', true,
      'code', 'ALREADY_CONFIRMED'
    );
  end if;

  ---------------------------------------------------------------------------
  -- CHALLENGE SINGLE USE / TERMINAL BALLOT REPLAY
  ---------------------------------------------------------------------------

  if v_ballot.challenge_used_at is not null
     or v_ballot.status <> 'pending' then

    insert into public.house_meeting_diia_events (
      ballot_id,
      event_type,
      provider,
      provider_txn_id,
      detail
    )
    values (
      v_ballot.id,
      'replay_blocked',
      v_ballot.provider,
      p_txn_id,
      jsonb_build_object('code', 'CALLBACK_REPLAY_BLOCKED')
    );

    return jsonb_build_object(
      'ok', false,
      'code', 'CALLBACK_REPLAY_BLOCKED'
    );
  end if;

  ---------------------------------------------------------------------------
  -- EXPIRED BALLOT
  ---------------------------------------------------------------------------

  if v_ballot.challenge_expires_at <= now() then
    update public.house_meeting_online_ballots
    set
      status = 'expired',
      challenge_used_at = now()
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
      jsonb_build_object('code', 'CALLBACK_AFTER_EXPIRY')
    );

    return jsonb_build_object(
      'ok', false,
      'code', 'CHALLENGE_EXPIRED'
    );
  end if;

  ---------------------------------------------------------------------------
  -- ONE PERSON = MAX ONE LIVE/CONFIRMED BALLOT PER MEETING
  ---------------------------------------------------------------------------

  if exists (
    select 1
    from public.house_meeting_online_ballots other_ballot
    where other_ballot.meeting_id = v_ballot.meeting_id
      and other_ballot.identity_hmac = p_identity_hmac
      and other_ballot.id <> v_ballot.id
      and other_ballot.status in ('pending', 'confirmed')
  ) then
    update public.house_meeting_online_ballots
    set
      status = 'failed',
      challenge_used_at = now()
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
      jsonb_build_object('code', 'IDENTITY_ALREADY_VOTED')
    );

    return jsonb_build_object(
      'ok', false,
      'code', 'IDENTITY_ALREADY_VOTED'
    );
  end if;

  ---------------------------------------------------------------------------
  -- PROVIDER TRANSACTION MUST ALSO BE SINGLE USE
  ---------------------------------------------------------------------------

  if exists (
    select 1
    from public.house_meeting_online_ballots other_ballot
    where other_ballot.provider = p_provider
      and other_ballot.provider_txn_id = p_txn_id
      and other_ballot.id <> v_ballot.id
  ) then
    update public.house_meeting_online_ballots
    set
      status = 'failed',
      challenge_used_at = now()
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
      'replay_blocked',
      v_ballot.provider,
      p_txn_id,
      jsonb_build_object('code', 'PROVIDER_TXN_REPLAY')
    );

    return jsonb_build_object(
      'ok', false,
      'code', 'PROVIDER_TXN_REPLAY'
    );
  end if;

  ---------------------------------------------------------------------------
  -- CONSUME CHALLENGE + ATTACH ONLY HMAC IDENTITY
  --
  -- Unique indexes remain the final race-condition safety net.
  ---------------------------------------------------------------------------

  begin
    update public.house_meeting_online_ballots
    set
      identity_hmac = p_identity_hmac,
      provider_txn_id = p_txn_id,
      challenge_used_at = now()
    where id = v_ballot.id;
  exception
    when unique_violation then
      update public.house_meeting_online_ballots
      set
        status = 'failed',
        challenge_used_at = now()
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
        'replay_blocked',
        v_ballot.provider,
        p_txn_id,
        jsonb_build_object('code', 'CALLBACK_UNIQUENESS_CONFLICT')
      );

      return jsonb_build_object(
        'ok', false,
        'code', 'CALLBACK_UNIQUENESS_CONFLICT'
      );
  end;

  insert into public.house_meeting_diia_events (
    ballot_id,
    event_type,
    provider,
    provider_txn_id,
    detail
  )
  values (
    v_ballot.id,
    'callback_received',
    v_ballot.provider,
    p_txn_id,
    jsonb_build_object('code', 'CALLBACK_VERIFIED')
  );

  return jsonb_build_object(
    'ok', true,
    'code', 'CALLBACK_PREPARED'
  );
end;
$$;


revoke all
on function public.prepare_online_ballot_callback(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text
)
from public;

revoke all
on function public.prepare_online_ballot_callback(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text
)
from anon;

revoke all
on function public.prepare_online_ballot_callback(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text
)
from authenticated;

grant execute
on function public.prepare_online_ballot_callback(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text
)
to service_role;


create or replace function public.record_diia_callback_rejection(
  p_provider text,
  p_code text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.house_meeting_diia_events (
    ballot_id,
    event_type,
    provider,
    provider_txn_id,
    detail
  )
  values (
    null,
    'rejected',
    coalesce(nullif(btrim(p_provider), ''), 'unknown'),
    null,
    jsonb_build_object(
      'code',
      coalesce(nullif(btrim(p_code), ''), 'CALLBACK_REJECTED')
    )
  );
end;
$$;

revoke all
on function public.record_diia_callback_rejection(text, text)
from public;

revoke all
on function public.record_diia_callback_rejection(text, text)
from anon;

revoke all
on function public.record_diia_callback_rejection(text, text)
from authenticated;

grant execute
on function public.record_diia_callback_rejection(text, text)
to service_role;
