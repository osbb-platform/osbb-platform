-- OSBB P06 T10B
--
-- Network-visible callback completion must be one PostgreSQL transaction.
--
-- The T6 prepare RPC and T2 confirm RPC already contain the authoritative
-- callback, replay, identity, transaction and apartment-area rules.
--
-- Calling both from one SECURITY DEFINER function makes the application
-- perform exactly one RPC. PostgreSQL executes both nested function calls
-- inside the same outer transaction, eliminating the former network gap
-- between challenge consumption and ballot confirmation.

create or replace function public.finalize_online_ballot_callback(
  p_ballot_id uuid,
  p_meeting_id uuid,
  p_house_slug text,
  p_challenge text,
  p_provider text,
  p_identity_hmac text,
  p_txn_id text,
  p_verified_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prepare jsonb;
  v_confirm jsonb;
begin
  v_prepare :=
    public.prepare_online_ballot_callback(
      p_ballot_id,
      p_meeting_id,
      p_house_slug,
      p_challenge,
      p_provider,
      p_identity_hmac,
      p_txn_id
    );

  if coalesce(
       (v_prepare->>'ok')::boolean,
       false
     ) is not true then
    return v_prepare;
  end if;

  if v_prepare->>'code' = 'ALREADY_CONFIRMED' then
    return jsonb_build_object(
      'ok', true,
      'code', 'ALREADY_CONFIRMED'
    );
  end if;

  if v_prepare->>'code' <> 'CALLBACK_PREPARED' then
    return jsonb_build_object(
      'ok', false,
      'code', 'CALLBACK_FINALIZE_PREPARE_UNEXPECTED'
    );
  end if;

  v_confirm :=
    public.confirm_online_ballot(
      p_ballot_id,
      p_txn_id,
      coalesce(p_verified_at, now())
    );

  return v_confirm;
end;
$$;

comment on function public.finalize_online_ballot_callback(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  timestamptz
) is
  'P06 atomic verified callback finalization. Runs callback binding and hard area confirmation inside one PostgreSQL transaction.';

revoke all
on function public.finalize_online_ballot_callback(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  timestamptz
)
from public;

revoke all
on function public.finalize_online_ballot_callback(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  timestamptz
)
from anon;

revoke all
on function public.finalize_online_ballot_callback(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  timestamptz
)
from authenticated;

grant execute
on function public.finalize_online_ballot_callback(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  timestamptz
)
to service_role;
