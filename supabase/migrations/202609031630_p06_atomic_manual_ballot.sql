begin;

create or replace function public.record_house_meeting_manual_ballot(
  p_meeting_id uuid,
  p_apartment_id uuid,
  p_expected_lock_version integer,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_meeting public.house_meetings%rowtype;
  v_answer jsonb;
  v_question_id uuid;
  v_choice text;
  v_next_lock integer;
  v_updated_at timestamptz;
begin
  if p_expected_lock_version is null or p_expected_lock_version < 1 then raise exception 'STALE_CONTENT'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'array' then raise exception 'ANSWERS_INVALID'; end if;

  select * into v_meeting
  from public.house_meetings
  where id = p_meeting_id
  for update;

  if not found then raise exception 'MEETING_NOT_FOUND'; end if;
  if v_meeting.lock_version <> p_expected_lock_version then raise exception 'STALE_CONTENT'; end if;

  for v_answer in select value from jsonb_array_elements(p_answers)
  loop
    v_question_id := nullif(v_answer->>'questionId', '')::uuid;
    v_choice := nullif(trim(v_answer->>'choice'), '');
    if v_question_id is null or v_choice is null then raise exception 'ANSWER_INVALID'; end if;
    perform public.record_house_meeting_manual_vote(
      p_meeting_id, v_question_id, p_apartment_id, v_choice
    );
  end loop;

  v_next_lock := v_meeting.lock_version + 1;
  v_updated_at := now();
  update public.house_meetings
  set lock_version = v_next_lock, updated_at = v_updated_at
  where id = p_meeting_id;

  return jsonb_build_object(
    'meeting_id', p_meeting_id,
    'lock_version', v_next_lock,
    'updated_at', v_updated_at
  );
end;
$$;

revoke all on function public.record_house_meeting_manual_ballot(uuid,uuid,integer,jsonb)
from public, anon, authenticated;
grant execute on function public.record_house_meeting_manual_ballot(uuid,uuid,integer,jsonb)
to service_role;

commit;
