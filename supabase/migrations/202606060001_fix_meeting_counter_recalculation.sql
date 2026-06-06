create or replace function public.recalculate_house_meeting_question_counters(p_meeting_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with meeting_context as (
    select
      meeting.id as meeting_id,
      count(apartment.id)::int as total_apartments
    from public.house_meetings meeting
    left join public.house_apartments apartment
      on apartment.house_id = meeting.house_id
     and apartment.archived_at is null
    where meeting.id = p_meeting_id
    group by meeting.id
  ),
  vote_counts as (
    select
      manual_vote.question_id,
      count(*) filter (where manual_vote.choice = 'for')::int as votes_for,
      count(*) filter (where manual_vote.choice = 'against')::int as votes_against,
      count(*) filter (where manual_vote.choice = 'abstained')::int as votes_abstained,
      count(*)::int as total_votes
    from public.house_meeting_manual_votes manual_vote
    where manual_vote.meeting_id = p_meeting_id
    group by manual_vote.question_id
  )
  update public.house_meeting_questions question
  set
    votes_for = coalesce((
      select vote_counts.votes_for
      from vote_counts
      where vote_counts.question_id = question.id
    ), 0),
    votes_against = coalesce((
      select vote_counts.votes_against
      from vote_counts
      where vote_counts.question_id = question.id
    ), 0),
    votes_abstained = coalesce((
      select vote_counts.votes_abstained
      from vote_counts
      where vote_counts.question_id = question.id
    ), 0),
    total_apartments_voted = coalesce((
      select meeting_context.total_apartments
      from meeting_context
      where meeting_context.meeting_id = question.meeting_id
    ), 0),
    approval_outcome = case
      when coalesce((
        select vote_counts.total_votes
        from vote_counts
        where vote_counts.question_id = question.id
      ), 0) = 0 then 'pending'
      when coalesce((
        select vote_counts.votes_for
        from vote_counts
        where vote_counts.question_id = question.id
      ), 0) > coalesce((
        select vote_counts.votes_against
        from vote_counts
        where vote_counts.question_id = question.id
      ), 0) then 'approved'
      else 'rejected'
    end
  where question.meeting_id = p_meeting_id;
end;
$$;

grant execute on function public.recalculate_house_meeting_question_counters(uuid) to authenticated;
