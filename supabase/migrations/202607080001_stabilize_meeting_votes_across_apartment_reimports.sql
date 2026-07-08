create or replace function public.normalize_house_apartment_key(p_label text)
returns text
language sql
immutable
strict
set search_path = public, extensions
as $$
  select lower(
    btrim(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            replace(p_label, chr(160), ' '),
            '^[[:space:]]*(кв\.?|квартира|прим\.?)\s*',
            '',
            'i'
          ),
          '[[:space:]]+—.*$',
          '',
          'g'
        ),
        '[[:space:]]+',
        ' ',
        'g'
      )
    )
  );
$$;

alter table public.house_meeting_manual_votes
  add column if not exists apartment_key text;

-- Keep apartment_key correct for every write path, including direct inserts
-- performed while meeting questions are edited and reconstructed.
create or replace function public.set_house_meeting_manual_vote_apartment_key()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  new.apartment_key := coalesce(
    nullif(public.normalize_house_apartment_key(new.apartment_label), ''),
    new.apartment_id::text
  );

  return new;
end;
$$;

drop trigger if exists house_meeting_manual_votes_set_apartment_key
  on public.house_meeting_manual_votes;

create trigger house_meeting_manual_votes_set_apartment_key
before insert or update of apartment_id, apartment_label
on public.house_meeting_manual_votes
for each row
execute function public.set_house_meeting_manual_vote_apartment_key();

update public.house_meeting_manual_votes
set apartment_key = coalesce(
  nullif(public.normalize_house_apartment_key(apartment_label), ''),
  apartment_id::text
)
where apartment_key is null
   or btrim(apartment_key) = '';

-- Never silently choose between conflicting answers. If any logical apartment
-- has different choices for the same question, abort the whole migration so
-- the conflict can be reviewed manually.
do $$
begin
  if exists (
    select 1
    from public.house_meeting_manual_votes vote
    group by
      vote.meeting_id,
      vote.question_id,
      vote.apartment_key
    having count(*) > 1
       and count(distinct vote.choice) > 1
  ) then
    raise exception
      'Conflicting duplicate house meeting votes detected; migration aborted';
  end if;
end;
$$;

-- If an apartment register was re-imported, the same logical apartment can be
-- represented by an archived UUID and a new active UUID. Keep the latest answer.
with ranked_votes as (
  select
    id,
    row_number() over (
      partition by meeting_id, question_id, apartment_key
      order by recorded_at desc, id desc
    ) as duplicate_rank
  from public.house_meeting_manual_votes
)
delete from public.house_meeting_manual_votes vote
using ranked_votes ranked
where vote.id = ranked.id
  and ranked.duplicate_rank > 1;

-- Relink all surviving historical votes to the currently active apartment row
-- so owner data and foreign-key identity stay aligned with the active register.
with ranked_active_apartments as (
  select
    apartment.id,
    apartment.house_id,
    apartment.apartment_label,
    apartment.owner_name,
    public.normalize_house_apartment_key(apartment.apartment_label) as apartment_key,
    row_number() over (
      partition by
        apartment.house_id,
        public.normalize_house_apartment_key(apartment.apartment_label)
      order by
        case
          when nullif(btrim(apartment.owner_name), '') is not null then 0
          else 1
        end,
        apartment.updated_at desc,
        apartment.id desc
    ) as apartment_rank
  from public.house_apartments apartment
  where apartment.archived_at is null
),
active_apartments as (
  select
    id,
    house_id,
    apartment_label,
    owner_name,
    apartment_key
  from ranked_active_apartments
  where apartment_rank = 1
)
update public.house_meeting_manual_votes vote
set
  apartment_id = apartment.id,
  apartment_label = case
    when nullif(btrim(apartment.owner_name), '') is not null
      then apartment.apartment_label || ' — ' || apartment.owner_name
    else apartment.apartment_label
  end,
  apartment_key = apartment.apartment_key
from public.house_meetings meeting
join active_apartments apartment
  on apartment.house_id = meeting.house_id
where meeting.id = vote.meeting_id
  and apartment.apartment_key = vote.apartment_key;

alter table public.house_meeting_manual_votes
  alter column apartment_key set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'house_meeting_manual_votes_apartment_key_not_blank'
      and conrelid = 'public.house_meeting_manual_votes'::regclass
  ) then
    alter table public.house_meeting_manual_votes
      add constraint house_meeting_manual_votes_apartment_key_not_blank
      check (btrim(apartment_key) <> '');
  end if;
end;
$$;

create unique index if not exists house_meeting_manual_votes_logical_apartment_unique_idx
  on public.house_meeting_manual_votes (meeting_id, apartment_key, question_id);

create index if not exists house_meeting_manual_votes_meeting_apartment_key_idx
  on public.house_meeting_manual_votes (meeting_id, apartment_key);

create or replace function public.record_house_meeting_manual_vote(
  p_meeting_id uuid,
  p_apartment_id uuid,
  p_question_id uuid,
  p_choice text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_house_id uuid;
  v_apartment_label text;
  v_apartment_key text;
begin
  if p_choice not in ('for', 'against', 'abstained') then
    raise exception 'Invalid vote choice: %', p_choice;
  end if;

  select meeting.house_id
  into v_house_id
  from public.house_meetings meeting
  where meeting.id = p_meeting_id;

  if v_house_id is null then
    raise exception 'Meeting not found: %', p_meeting_id;
  end if;

  if not exists (
    select 1
    from public.house_meeting_questions question
    where question.id = p_question_id
      and question.meeting_id = p_meeting_id
  ) then
    raise exception 'Question does not belong to meeting: %', p_question_id;
  end if;

  select
    case
      when nullif(btrim(apartment.owner_name), '') is not null
        then apartment.apartment_label || ' — ' || apartment.owner_name
      else apartment.apartment_label
    end,
    public.normalize_house_apartment_key(apartment.apartment_label)
  into
    v_apartment_label,
    v_apartment_key
  from public.house_apartments apartment
  where apartment.id = p_apartment_id
    and apartment.house_id = v_house_id
    and apartment.archived_at is null;

  if v_apartment_label is null or nullif(v_apartment_key, '') is null then
    raise exception 'Apartment not found for meeting house: %', p_apartment_id;
  end if;

  insert into public.house_meeting_manual_votes (
    meeting_id,
    apartment_id,
    apartment_label,
    apartment_key,
    question_id,
    choice,
    recorded_at
  )
  values (
    p_meeting_id,
    p_apartment_id,
    v_apartment_label,
    v_apartment_key,
    p_question_id,
    p_choice,
    now()
  )
  on conflict (meeting_id, apartment_key, question_id) do update
  set
    apartment_id = excluded.apartment_id,
    apartment_label = excluded.apartment_label,
    choice = excluded.choice,
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
    select distinct vote.meeting_id as id
    from public.house_meeting_manual_votes vote
  loop
    perform public.recalculate_house_meeting_question_counters(meeting_record.id);
  end loop;
end;
$$;
