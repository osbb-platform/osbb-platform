-- P06 T7 — authoritative online-voting weighted aggregation.
--
-- Rules:
-- - ONLINE results use confirmed ballots only.
-- - ballot weight = owned_area_m2.
-- - question integer counters are NOT read.
-- - denominator = sum(area) of active apartments in the house.
-- - apartment participation:
--     not_voted  = confirmed sum <= 0
--     partially  = 0 < confirmed sum < apartment.area
--     fully      = confirmed sum >= apartment.area
-- - no identity_hmac/provider transaction/audit data leaves this function.

create or replace function public.get_online_meeting_aggregation(
  p_house_id uuid,
  p_meeting_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_meeting public.house_meetings%rowtype;
  v_total_house_area numeric(16,2);
  v_confirmed_area numeric(16,2);
  v_question_results jsonb;
  v_apartment_results jsonb;
begin
  if p_house_id is null or p_meeting_id is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_SCOPE'
    );
  end if;

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

  if v_meeting.voting_mode <> 'online' then
    return jsonb_build_object(
      'ok', false,
      'code', 'MEETING_NOT_ONLINE'
    );
  end if;

  ---------------------------------------------------------------------------
  -- HOUSE DENOMINATOR
  ---------------------------------------------------------------------------

  select
    coalesce(sum(a.area), 0)
  into v_total_house_area
  from public.house_apartments a
  where a.house_id = p_house_id
    and a.archived_at is null
    and a.area is not null
    and a.area > 0;

  ---------------------------------------------------------------------------
  -- CONFIRMED PARTICIPATION AREA
  ---------------------------------------------------------------------------

  select
    coalesce(sum(b.owned_area_m2), 0)
  into v_confirmed_area
  from public.house_meeting_online_ballots b
  where b.meeting_id = p_meeting_id
    and b.house_id = p_house_id
    and b.status = 'confirmed';

  ---------------------------------------------------------------------------
  -- QUESTION RESULTS
  --
  -- Weight comes exclusively from confirmed ballot owned_area_m2.
  ---------------------------------------------------------------------------

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'question_id', q.id,
          'for_area_m2', coalesce(x.for_area_m2, 0),
          'against_area_m2', coalesce(x.against_area_m2, 0),
          'abstained_area_m2', coalesce(x.abstained_area_m2, 0),
          'participating_area_m2', coalesce(x.participating_area_m2, 0),
          'for_percent',
            case
              when v_total_house_area > 0
                then round(
                  (coalesce(x.for_area_m2, 0) / v_total_house_area) * 100,
                  2
                )
              else 0
            end,
          'against_percent',
            case
              when v_total_house_area > 0
                then round(
                  (coalesce(x.against_area_m2, 0) / v_total_house_area) * 100,
                  2
                )
              else 0
            end,
          'abstained_percent',
            case
              when v_total_house_area > 0
                then round(
                  (coalesce(x.abstained_area_m2, 0) / v_total_house_area) * 100,
                  2
                )
              else 0
            end
        )
        order by q.sort_order, q.id
      ),
      '[]'::jsonb
    )
  into v_question_results
  from public.house_meeting_questions q
  left join lateral (
    select
      coalesce(
        sum(b.owned_area_m2)
          filter (where ans.choice = 'for'),
        0
      ) as for_area_m2,

      coalesce(
        sum(b.owned_area_m2)
          filter (where ans.choice = 'against'),
        0
      ) as against_area_m2,

      coalesce(
        sum(b.owned_area_m2)
          filter (where ans.choice = 'abstained'),
        0
      ) as abstained_area_m2,

      coalesce(
        sum(b.owned_area_m2),
        0
      ) as participating_area_m2

    from public.house_meeting_online_answers ans
    join public.house_meeting_online_ballots b
      on b.id = ans.ballot_id
     and b.status = 'confirmed'
     and b.meeting_id = p_meeting_id
     and b.house_id = p_house_id
    where ans.question_id = q.id
  ) x on true
  where q.meeting_id = p_meeting_id;

  ---------------------------------------------------------------------------
  -- APARTMENT PARTICIPATION
  --
  -- No co-owner identity is exposed.
  ---------------------------------------------------------------------------

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'apartment_id', a.id,
          'apartment_area_m2', a.area,
          'confirmed_area_m2', coalesce(v.confirmed_area_m2, 0),
          'remaining_area_m2',
            greatest(
              a.area - coalesce(v.confirmed_area_m2, 0),
              0
            ),
          'status',
            case
              when coalesce(v.confirmed_area_m2, 0) <= 0
                then 'not_voted'
              when coalesce(v.confirmed_area_m2, 0) < a.area
                then 'partially'
              else 'fully'
            end
        )
        order by a.apartment_label, a.id
      ),
      '[]'::jsonb
    )
  into v_apartment_results
  from public.house_apartments a
  left join lateral (
    select
      coalesce(sum(b.owned_area_m2), 0)
        as confirmed_area_m2
    from public.house_meeting_online_ballots b
    where b.meeting_id = p_meeting_id
      and b.house_id = p_house_id
      and b.apartment_id = a.id
      and b.status = 'confirmed'
  ) v on true
  where a.house_id = p_house_id
    and a.archived_at is null
    and a.area is not null
    and a.area > 0;

  return jsonb_build_object(
    'ok', true,
    'code', 'ONLINE_AGGREGATION_READY',
    'meeting_id', p_meeting_id,
    'house_id', p_house_id,
    'total_house_area_m2', v_total_house_area,
    'confirmed_area_m2', v_confirmed_area,
    'participation_percent',
      case
        when v_total_house_area > 0
          then round(
            (v_confirmed_area / v_total_house_area) * 100,
            2
          )
        else 0
      end,
    'questions', v_question_results,
    'apartments', v_apartment_results
  );
end;
$$;

revoke all
on function public.get_online_meeting_aggregation(uuid, uuid)
from public;

revoke all
on function public.get_online_meeting_aggregation(uuid, uuid)
from anon;

revoke all
on function public.get_online_meeting_aggregation(uuid, uuid)
from authenticated;

grant execute
on function public.get_online_meeting_aggregation(uuid, uuid)
to service_role;
