create table if not exists public.house_meetings (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses(id) on delete cascade,

  title text not null,
  short_description text not null default '',
  agenda text not null default '',
  meeting_date timestamptz null,
  location text not null default '',

  meeting_status text not null default 'draft'
    check (meeting_status in ('draft', 'scheduled', 'in_progress', 'closed', 'cancelled')),

  display_status text not null default 'draft'
    check (display_status in ('draft', 'scheduled', 'active', 'review', 'completed', 'archived')),

  protocol_pdf text not null default '',
  protocol_document_id text not null default '',

  lifecycle_status text not null default 'draft'
    check (lifecycle_status in ('draft', 'published', 'archived')),

  lock_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz null,
  archived_at timestamptz null,
  created_by uuid null references public.profiles(id) on delete set null,

  -- Migration bridge only. Legacy cleanup happens in N6.
  legacy_section_id uuid null,
  legacy_item_index int null
);

create table if not exists public.house_meeting_questions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.house_meetings(id) on delete cascade,

  question text not null,
  description text not null default '',
  decision_draft text not null default '',
  sort_order int not null default 0,

  votes_for int not null default 0,
  votes_against int not null default 0,
  votes_abstained int not null default 0,
  total_apartments_voted int not null default 0,
  approval_outcome text not null default 'pending'
    check (approval_outcome in ('approved', 'rejected', 'pending'))
);

create table if not exists public.house_meeting_manual_votes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.house_meetings(id) on delete cascade,
  apartment_id uuid not null references public.house_apartments(id) on delete cascade,
  apartment_label text not null default '',
  question_id uuid not null references public.house_meeting_questions(id) on delete cascade,
  choice text not null check (choice in ('for', 'against', 'abstained')),
  recorded_at timestamptz not null default now(),

  unique (meeting_id, apartment_id, question_id)
);

create table if not exists public.house_meeting_votes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.house_meetings(id) on delete cascade,
  apartment_id uuid not null references public.house_apartments(id) on delete cascade,
  question_id uuid not null references public.house_meeting_questions(id) on delete cascade,
  choice text not null check (choice in ('for', 'against', 'abstained')),
  submitted_at timestamptz not null default now(),
  session_token_hash text null,

  unique (meeting_id, apartment_id, question_id)
);

create index if not exists house_meetings_house_lifecycle_idx
  on public.house_meetings (house_id, lifecycle_status);

create index if not exists house_meetings_house_display_status_idx
  on public.house_meetings (house_id, display_status);

create index if not exists house_meetings_house_meeting_date_idx
  on public.house_meetings (house_id, meeting_date);

create unique index if not exists house_meetings_legacy_bridge_unique_idx
  on public.house_meetings (legacy_section_id, legacy_item_index)
  where legacy_section_id is not null and legacy_item_index is not null;

create index if not exists house_meeting_questions_meeting_sort_idx
  on public.house_meeting_questions (meeting_id, sort_order);

create index if not exists house_meeting_manual_votes_meeting_idx
  on public.house_meeting_manual_votes (meeting_id);

create index if not exists house_meeting_manual_votes_apartment_idx
  on public.house_meeting_manual_votes (apartment_id);

create index if not exists house_meeting_votes_meeting_idx
  on public.house_meeting_votes (meeting_id);

create index if not exists house_meeting_votes_apartment_idx
  on public.house_meeting_votes (apartment_id);

drop trigger if exists house_meetings_set_updated_at on public.house_meetings;

create trigger house_meetings_set_updated_at
  before update on public.house_meetings
  for each row
  execute function public.set_updated_at();

alter table public.house_meetings enable row level security;
alter table public.house_meeting_questions enable row level security;
alter table public.house_meeting_manual_votes enable row level security;
alter table public.house_meeting_votes enable row level security;

drop policy if exists "Authenticated admins can read house meetings" on public.house_meetings;
create policy "Authenticated admins can read house meetings"
  on public.house_meetings
  for select
  using (public.is_authenticated_admin());

drop policy if exists "Authenticated admins can insert house meetings" on public.house_meetings;
create policy "Authenticated admins can insert house meetings"
  on public.house_meetings
  for insert
  with check (public.is_authenticated_admin());

drop policy if exists "Authenticated admins can update house meetings" on public.house_meetings;
create policy "Authenticated admins can update house meetings"
  on public.house_meetings
  for update
  using (public.is_authenticated_admin())
  with check (public.is_authenticated_admin());

drop policy if exists "Authenticated admins can delete house meetings" on public.house_meetings;
create policy "Authenticated admins can delete house meetings"
  on public.house_meetings
  for delete
  using (public.is_authenticated_admin());

drop policy if exists "Public can read published house meetings" on public.house_meetings;
create policy "Public can read published house meetings"
  on public.house_meetings
  for select
  using (lifecycle_status = 'published');

drop policy if exists "Authenticated admins can read house meeting questions" on public.house_meeting_questions;
create policy "Authenticated admins can read house meeting questions"
  on public.house_meeting_questions
  for select
  using (public.is_authenticated_admin());

drop policy if exists "Authenticated admins can insert house meeting questions" on public.house_meeting_questions;
create policy "Authenticated admins can insert house meeting questions"
  on public.house_meeting_questions
  for insert
  with check (public.is_authenticated_admin());

drop policy if exists "Authenticated admins can update house meeting questions" on public.house_meeting_questions;
create policy "Authenticated admins can update house meeting questions"
  on public.house_meeting_questions
  for update
  using (public.is_authenticated_admin())
  with check (public.is_authenticated_admin());

drop policy if exists "Authenticated admins can delete house meeting questions" on public.house_meeting_questions;
create policy "Authenticated admins can delete house meeting questions"
  on public.house_meeting_questions
  for delete
  using (public.is_authenticated_admin());

drop policy if exists "Public can read published house meeting questions" on public.house_meeting_questions;
create policy "Public can read published house meeting questions"
  on public.house_meeting_questions
  for select
  using (
    exists (
      select 1
      from public.house_meetings meeting
      where meeting.id = house_meeting_questions.meeting_id
        and meeting.lifecycle_status = 'published'
    )
  );

drop policy if exists "Authenticated admins can read house meeting manual votes" on public.house_meeting_manual_votes;
create policy "Authenticated admins can read house meeting manual votes"
  on public.house_meeting_manual_votes
  for select
  using (public.is_authenticated_admin());

drop policy if exists "Authenticated admins can insert house meeting manual votes" on public.house_meeting_manual_votes;
create policy "Authenticated admins can insert house meeting manual votes"
  on public.house_meeting_manual_votes
  for insert
  with check (public.is_authenticated_admin());

drop policy if exists "Authenticated admins can update house meeting manual votes" on public.house_meeting_manual_votes;
create policy "Authenticated admins can update house meeting manual votes"
  on public.house_meeting_manual_votes
  for update
  using (public.is_authenticated_admin())
  with check (public.is_authenticated_admin());

drop policy if exists "Authenticated admins can delete house meeting manual votes" on public.house_meeting_manual_votes;
create policy "Authenticated admins can delete house meeting manual votes"
  on public.house_meeting_manual_votes
  for delete
  using (public.is_authenticated_admin());

drop policy if exists "Public can read published house meeting manual votes" on public.house_meeting_manual_votes;
create policy "Public can read published house meeting manual votes"
  on public.house_meeting_manual_votes
  for select
  using (
    exists (
      select 1
      from public.house_meetings meeting
      where meeting.id = house_meeting_manual_votes.meeting_id
        and meeting.lifecycle_status = 'published'
    )
  );

drop policy if exists "Authenticated admins can read house meeting votes" on public.house_meeting_votes;
create policy "Authenticated admins can read house meeting votes"
  on public.house_meeting_votes
  for select
  using (public.is_authenticated_admin());

drop policy if exists "Authenticated admins can insert house meeting votes" on public.house_meeting_votes;
create policy "Authenticated admins can insert house meeting votes"
  on public.house_meeting_votes
  for insert
  with check (public.is_authenticated_admin());

drop policy if exists "Authenticated admins can update house meeting votes" on public.house_meeting_votes;
create policy "Authenticated admins can update house meeting votes"
  on public.house_meeting_votes
  for update
  using (public.is_authenticated_admin())
  with check (public.is_authenticated_admin());

drop policy if exists "Authenticated admins can delete house meeting votes" on public.house_meeting_votes;
create policy "Authenticated admins can delete house meeting votes"
  on public.house_meeting_votes
  for delete
  using (public.is_authenticated_admin());

-- Reserved for future public voting. Public insert/update policies are intentionally not created now.

insert into public.house_meetings (
  id,
  house_id,
  title,
  short_description,
  agenda,
  meeting_date,
  location,
  meeting_status,
  display_status,
  protocol_pdf,
  protocol_document_id,
  lifecycle_status,
  lock_version,
  created_at,
  updated_at,
  published_at,
  archived_at,
  legacy_section_id,
  legacy_item_index
)
select
  case
    when item->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then (item->>'id')::uuid
    else gen_random_uuid()
  end,
  hp.house_id,
  coalesce(nullif(btrim(item->>'title'), ''), 'Збори без назви'),
  coalesce(item->>'shortDescription', item->>'description', ''),
  coalesce(item->>'agenda', ''),
  case
    when nullif(item->>'meetingDateTime', '') is not null
      then (item->>'meetingDateTime')::timestamptz
    when nullif(item->>'date', '') is not null
      then (item->>'date')::timestamptz
    else null
  end,
  coalesce(item->>'location', ''),
  case
    when item->>'status' = 'draft' then 'draft'
    when item->>'status' = 'scheduled' then 'scheduled'
    when item->>'status' = 'active' then 'in_progress'
    when item->>'status' = 'planned' then 'scheduled'
    when item->>'status' in ('review', 'completed', 'archived') then 'closed'
    when item->>'status' = 'cancelled' then 'cancelled'
    else 'draft'
  end,
  case
    when item->>'status' in ('draft', 'scheduled', 'active', 'review', 'completed', 'archived')
      then item->>'status'
    when item->>'status' = 'planned'
      then 'scheduled'
    else 'draft'
  end,
  coalesce(item->>'protocolPdf', ''),
  coalesce(item->>'protocolDocumentId', ''),
  case
    when item->>'status' = 'draft' then 'draft'
    when item->>'status' = 'archived' then 'archived'
    else 'published'
  end,
  1,
  coalesce(
    case when nullif(item->>'createdAt', '') is not null then (item->>'createdAt')::timestamptz else null end,
    hs.created_at,
    now()
  ),
  coalesce(
    case when nullif(item->>'updatedAt', '') is not null then (item->>'updatedAt')::timestamptz else null end,
    hs.updated_at,
    now()
  ),
  case
    when item->>'status' not in ('draft', 'archived')
      then coalesce(hs.updated_at, now())
    else null
  end,
  case
    when item->>'status' = 'archived'
      then coalesce(
        case when nullif(item->>'archivedAt', '') is not null then (item->>'archivedAt')::timestamptz else null end,
        hs.updated_at,
        now()
      )
    else null
  end,
  hs.id,
  item_ordinality::int - 1
from public.house_sections hs
join public.house_pages hp on hp.id = hs.house_page_id
cross join lateral jsonb_array_elements(
  case
    when hs.content ? 'items' and jsonb_typeof(hs.content->'items') = 'array'
      then hs.content->'items'
    else '[]'::jsonb
  end
) with ordinality as source(item, item_ordinality)
where hs.kind = 'meetings'
on conflict do nothing;

insert into public.house_meeting_questions (
  id,
  meeting_id,
  question,
  description,
  decision_draft,
  sort_order,
  votes_for,
  votes_against,
  votes_abstained,
  total_apartments_voted,
  approval_outcome
)
select
  case
    when question_item->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then (question_item->>'id')::uuid
    else gen_random_uuid()
  end,
  meeting.id,
  coalesce(nullif(btrim(question_item->>'title'), ''), 'Питання без назви'),
  coalesce(question_item->>'description', ''),
  coalesce(question_item->>'decisionDraft', ''),
  coalesce(
    case
      when (question_item->>'order') ~ '^[0-9]+$'
        then (question_item->>'order')::int
      else null
    end,
    question_ordinality::int - 1
  ),
  coalesce(
    case
      when (question_item->>'votesFor') ~ '^-?[0-9]+$'
        then greatest((question_item->>'votesFor')::int, 0)
      else null
    end,
    0
  ),
  coalesce(
    case
      when (question_item->>'votesAgainst') ~ '^-?[0-9]+$'
        then greatest((question_item->>'votesAgainst')::int, 0)
      else null
    end,
    0
  ),
  coalesce(
    case
      when (question_item->>'votesAbstained') ~ '^-?[0-9]+$'
        then greatest((question_item->>'votesAbstained')::int, 0)
      else null
    end,
    0
  ),
  coalesce(
    case
      when (question_item->>'totalApartmentsVoted') ~ '^-?[0-9]+$'
        then greatest((question_item->>'totalApartmentsVoted')::int, 0)
      else null
    end,
    0
  ),
  case
    when question_item->>'approvalOutcome' in ('approved', 'rejected', 'pending')
      then question_item->>'approvalOutcome'
    else 'pending'
  end
from public.house_sections hs
join public.house_pages hp on hp.id = hs.house_page_id
cross join lateral jsonb_array_elements(
  case
    when hs.content ? 'items' and jsonb_typeof(hs.content->'items') = 'array'
      then hs.content->'items'
    else '[]'::jsonb
  end
) with ordinality as source(item, item_ordinality)
join public.house_meetings meeting
  on meeting.legacy_section_id = hs.id
 and meeting.legacy_item_index = item_ordinality::int - 1
cross join lateral jsonb_array_elements(
  case
    when item ? 'questions' and jsonb_typeof(item->'questions') = 'array'
      then item->'questions'
    else '[]'::jsonb
  end
) with ordinality as questions(question_item, question_ordinality)
where hs.kind = 'meetings'
on conflict (id) do nothing;

insert into public.house_meeting_manual_votes (
  meeting_id,
  apartment_id,
  apartment_label,
  question_id,
  choice,
  recorded_at
)
select
  meeting.id,
  (vote_item->>'apartmentId')::uuid,
  coalesce(vote_item->>'apartmentLabel', ''),
  question.id,
  answer_item->>'choice',
  coalesce(
    case when nullif(vote_item->>'submittedAt', '') is not null then (vote_item->>'submittedAt')::timestamptz else null end,
    meeting.updated_at,
    now()
  )
from public.house_sections hs
join public.house_pages hp on hp.id = hs.house_page_id
cross join lateral jsonb_array_elements(
  case
    when hs.content ? 'items' and jsonb_typeof(hs.content->'items') = 'array'
      then hs.content->'items'
    else '[]'::jsonb
  end
) with ordinality as source(item, item_ordinality)
join public.house_meetings meeting
  on meeting.legacy_section_id = hs.id
 and meeting.legacy_item_index = item_ordinality::int - 1
cross join lateral jsonb_array_elements(
  case
    when item ? 'manualVotes' and jsonb_typeof(item->'manualVotes') = 'array'
      then item->'manualVotes'
    else '[]'::jsonb
  end
) as votes(vote_item)
cross join lateral jsonb_array_elements(
  case
    when vote_item ? 'answers' and jsonb_typeof(vote_item->'answers') = 'array'
      then vote_item->'answers'
    else '[]'::jsonb
  end
) as answers(answer_item)
join public.house_meeting_questions question
  on question.meeting_id = meeting.id
 and question.id = case
    when answer_item->>'questionId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then (answer_item->>'questionId')::uuid
    else null
  end
join public.house_apartments apartment
  on apartment.id = case
    when vote_item->>'apartmentId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then (vote_item->>'apartmentId')::uuid
    else null
  end
 and apartment.house_id = hp.house_id
where hs.kind = 'meetings'
  and answer_item->>'choice' in ('for', 'against', 'abstained')
on conflict (meeting_id, apartment_id, question_id) do update
set
  choice = excluded.choice,
  apartment_label = excluded.apartment_label,
  recorded_at = excluded.recorded_at;

create or replace function public.recalculate_house_meeting_question_counters(p_meeting_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.house_meeting_questions question
  set
    votes_for = coalesce(votes.votes_for, 0),
    votes_against = coalesce(votes.votes_against, 0),
    votes_abstained = coalesce(votes.votes_abstained, 0),
    total_apartments_voted = coalesce(apartments.total_apartments, 0),
    approval_outcome = case
      when coalesce(votes.total_votes, 0) = 0 then 'pending'
      when coalesce(votes.votes_for, 0) > coalesce(votes.votes_against, 0) then 'approved'
      else 'rejected'
    end
  from public.house_meetings meeting
  left join lateral (
    select count(*)::int as total_apartments
    from public.house_apartments apartment
    where apartment.house_id = meeting.house_id
      and apartment.archived_at is null
  ) apartments on true
  left join lateral (
    select
      count(*) filter (where manual_vote.choice = 'for')::int as votes_for,
      count(*) filter (where manual_vote.choice = 'against')::int as votes_against,
      count(*) filter (where manual_vote.choice = 'abstained')::int as votes_abstained,
      count(*)::int as total_votes
    from public.house_meeting_manual_votes manual_vote
    where manual_vote.question_id = question.id
  ) votes on true
  where question.meeting_id = p_meeting_id
    and meeting.id = question.meeting_id;
end;
$$;

grant execute on function public.recalculate_house_meeting_question_counters(uuid) to authenticated;

create or replace function public.record_house_meeting_manual_vote(
  p_meeting_id uuid,
  p_apartment_id uuid,
  p_question_id uuid,
  p_choice text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_house_id uuid;
  v_apartment_label text;
begin
  if p_choice not in ('for', 'against', 'abstained') then
    raise exception 'Invalid vote choice: %', p_choice;
  end if;

  select house_id into v_house_id
  from public.house_meetings
  where id = p_meeting_id;

  if v_house_id is null then
    raise exception 'Meeting not found: %', p_meeting_id;
  end if;

  select
    case
      when owner_name is not null and btrim(owner_name) <> ''
        then apartment_label || ' — ' || owner_name
      else apartment_label
    end
  into v_apartment_label
  from public.house_apartments
  where id = p_apartment_id
    and house_id = v_house_id
    and archived_at is null;

  if v_apartment_label is null then
    raise exception 'Apartment not found for meeting house: %', p_apartment_id;
  end if;

  insert into public.house_meeting_manual_votes (
    meeting_id,
    apartment_id,
    apartment_label,
    question_id,
    choice,
    recorded_at
  )
  values (
    p_meeting_id,
    p_apartment_id,
    v_apartment_label,
    p_question_id,
    p_choice,
    now()
  )
  on conflict (meeting_id, apartment_id, question_id) do update
  set
    choice = excluded.choice,
    apartment_label = excluded.apartment_label,
    recorded_at = excluded.recorded_at;

  perform public.recalculate_house_meeting_question_counters(p_meeting_id);
end;
$$;

grant execute on function public.record_house_meeting_manual_vote(uuid, uuid, uuid, text) to authenticated;

do $$
declare
  meeting_record record;
begin
  for meeting_record in
    select id from public.house_meetings
  loop
    perform public.recalculate_house_meeting_question_counters(meeting_record.id);
  end loop;
end;
$$;
