begin;

-- ============================================================
-- P09 R0.3 — house content tenant isolation
-- Public published content stays readable anonymously.
-- Authenticated admin paths are house-scoped.
-- R0.4 debtors/history/import/task tables are intentionally out of scope.
-- ============================================================

-- Legacy documents table must participate in RLS.
alter table public.house_documents enable row level security;

-- Let requests reach RLS. service_role remains trusted/bypass as before.
grant select, insert, update, delete on table
  public.house_announcements,
  public.house_board_intro,
  public.house_board_members,
  public.house_documents,
  public.house_faq,
  public.house_faq_items,
  public.house_hero,
  public.house_home_widgets,
  public.house_information_posts,
  public.house_meetings,
  public.house_meeting_questions,
  public.house_meeting_manual_votes,
  public.house_meeting_votes,
  public.house_meeting_online_ballots,
  public.house_meeting_online_answers,
  public.house_meeting_diia_events,
  public.house_pages,
  public.house_sections,
  public.house_plan_tasks,
  public.house_plan_status_transitions,
  public.house_polls,
  public.house_poll_questions,
  public.house_poll_options,
  public.house_poll_participation,
  public.house_poll_answers,
  public.house_report_categories,
  public.house_reports,
  public.house_requisites,
  public.house_specialists,
  public.house_specialists_categories,
  public.house_content_files
to authenticated;

-- ------------------------------------------------------------
-- Helpers for indirect child tables.
-- ------------------------------------------------------------

create or replace function public.admin_has_faq_access(target_faq_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.house_faq f
    where f.id = target_faq_id
      and public.admin_has_house_access(f.house_id)
  );
$$;

create or replace function public.admin_has_meeting_access(target_meeting_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.house_meetings m
    where m.id = target_meeting_id
      and public.admin_has_house_access(m.house_id)
  );
$$;

create or replace function public.admin_has_ballot_access(target_ballot_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.house_meeting_online_ballots b
    where b.id = target_ballot_id
      and public.admin_has_house_access(b.house_id)
  );
$$;

create or replace function public.admin_has_poll_access(target_poll_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.house_polls p
    where p.id = target_poll_id
      and public.admin_has_house_access(p.house_id)
  );
$$;

create or replace function public.admin_has_poll_question_access(target_question_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.house_poll_questions q
    join public.house_polls p on p.id = q.poll_id
    where q.id = target_question_id
      and public.admin_has_house_access(p.house_id)
  );
$$;

create or replace function public.admin_has_house_page_access(target_page_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.house_pages p
    where p.id = target_page_id
      and public.admin_has_house_access(p.house_id)
  );
$$;

revoke all on function
  public.admin_has_faq_access(uuid),
  public.admin_has_meeting_access(uuid),
  public.admin_has_ballot_access(uuid),
  public.admin_has_poll_access(uuid),
  public.admin_has_poll_question_access(uuid),
  public.admin_has_house_page_access(uuid)
from public, anon;

grant execute on function
  public.admin_has_faq_access(uuid),
  public.admin_has_meeting_access(uuid),
  public.admin_has_ballot_access(uuid),
  public.admin_has_poll_access(uuid),
  public.admin_has_poll_question_access(uuid),
  public.admin_has_house_page_access(uuid)
to authenticated, service_role;

-- ------------------------------------------------------------
-- Utility block: direct house_id tables.
-- Remove old admin policies and create one scoped admin ALL policy.
-- Public policies are recreated separately below where needed.
-- ------------------------------------------------------------

-- ANNOUNCEMENTS
drop policy if exists "Admins manage house_announcements" on public.house_announcements;
drop policy if exists house_announcements_admin_insert on public.house_announcements;
drop policy if exists house_announcements_admin_update on public.house_announcements;
drop policy if exists house_announcements_admin_delete on public.house_announcements;
create policy p09_house_announcements_admin_scoped
on public.house_announcements
for all to authenticated
using (public.admin_has_house_access(house_id))
with check (public.admin_has_house_access(house_id));

drop policy if exists "Public read published house_announcements" on public.house_announcements;
create policy "Public read published house_announcements"
on public.house_announcements
for select to anon
using (lifecycle_status = 'published');

-- BOARD
drop policy if exists "Admins manage house_board_intro" on public.house_board_intro;
create policy p09_house_board_intro_admin_scoped
on public.house_board_intro
for all to authenticated
using (public.admin_has_house_access(house_id))
with check (public.admin_has_house_access(house_id));

drop policy if exists "Public read house_board_intro" on public.house_board_intro;
create policy "Public read house_board_intro"
on public.house_board_intro
for select to anon
using (true);

drop policy if exists "Admins manage house_board_members" on public.house_board_members;
create policy p09_house_board_members_admin_scoped
on public.house_board_members
for all to authenticated
using (public.admin_has_house_access(house_id))
with check (public.admin_has_house_access(house_id));

drop policy if exists "Public read house_board_members" on public.house_board_members;
create policy "Public read house_board_members"
on public.house_board_members
for select to anon
using (true);

-- DOCUMENTS
drop policy if exists p09_house_documents_admin_scoped on public.house_documents;
create policy p09_house_documents_admin_scoped
on public.house_documents
for all to authenticated
using (public.admin_has_house_access(house_id))
with check (public.admin_has_house_access(house_id));

drop policy if exists p09_house_documents_public_published on public.house_documents;
create policy p09_house_documents_public_published
on public.house_documents
for select to anon
using (
  coalesce(lifecycle_status, 'draft') = 'published'
);

-- FAQ parent
drop policy if exists "Authenticated admins can read house faq" on public.house_faq;
drop policy if exists house_faq_insert_authenticated on public.house_faq;
drop policy if exists house_faq_update_authenticated on public.house_faq;
drop policy if exists house_faq_delete_authenticated on public.house_faq;
create policy p09_house_faq_admin_scoped
on public.house_faq
for all to authenticated
using (public.admin_has_house_access(house_id))
with check (public.admin_has_house_access(house_id));

drop policy if exists house_faq_select_public on public.house_faq;
create policy house_faq_select_public
on public.house_faq
for select to anon
using (lifecycle_status = 'published');

-- FAQ items child
drop policy if exists "Authenticated admins can read house faq items" on public.house_faq_items;
drop policy if exists house_faq_items_insert_authenticated on public.house_faq_items;
drop policy if exists house_faq_items_update_authenticated on public.house_faq_items;
drop policy if exists house_faq_items_delete_authenticated on public.house_faq_items;
create policy p09_house_faq_items_admin_scoped
on public.house_faq_items
for all to authenticated
using (public.admin_has_faq_access(faq_id))
with check (public.admin_has_faq_access(faq_id));

drop policy if exists house_faq_items_select_public on public.house_faq_items;
create policy house_faq_items_select_public
on public.house_faq_items
for select to anon
using (
  exists (
    select 1 from public.house_faq f
    where f.id = house_faq_items.faq_id
      and f.lifecycle_status = 'published'
  )
);

-- HERO
drop policy if exists "Admins manage house_hero" on public.house_hero;
create policy p09_house_hero_admin_scoped
on public.house_hero
for all to authenticated
using (public.admin_has_house_access(house_id))
with check (public.admin_has_house_access(house_id));

drop policy if exists "Public read house_hero" on public.house_hero;
create policy "Public read house_hero"
on public.house_hero
for select to anon
using (true);

-- HOME WIDGETS
drop policy if exists house_home_widgets_delete_authenticated on public.house_home_widgets;
drop policy if exists house_home_widgets_insert_authenticated on public.house_home_widgets;
drop policy if exists house_home_widgets_update_authenticated on public.house_home_widgets;
create policy p09_house_home_widgets_admin_scoped
on public.house_home_widgets
for all to authenticated
using (public.admin_has_house_access(house_id))
with check (public.admin_has_house_access(house_id));

drop policy if exists house_home_widgets_select_public on public.house_home_widgets;
create policy house_home_widgets_select_public
on public.house_home_widgets
for select to anon
using (true);

-- INFORMATION POSTS
drop policy if exists "Admins manage house_information_posts" on public.house_information_posts;
create policy p09_house_information_posts_admin_scoped
on public.house_information_posts
for all to authenticated
using (public.admin_has_house_access(house_id))
with check (public.admin_has_house_access(house_id));

drop policy if exists "Public read published house_information_posts" on public.house_information_posts;
create policy "Public read published house_information_posts"
on public.house_information_posts
for select to anon
using (lifecycle_status = 'published');

-- MEETINGS parent
drop policy if exists "Authenticated admins can read house meetings" on public.house_meetings;
drop policy if exists "Authenticated admins can insert house meetings" on public.house_meetings;
drop policy if exists "Authenticated admins can update house meetings" on public.house_meetings;
drop policy if exists "Authenticated admins can delete house meetings" on public.house_meetings;
create policy p09_house_meetings_admin_scoped
on public.house_meetings
for all to authenticated
using (public.admin_has_house_access(house_id))
with check (public.admin_has_house_access(house_id));

drop policy if exists "Public can read published house meetings" on public.house_meetings;
create policy "Public can read published house meetings"
on public.house_meetings
for select to anon
using (lifecycle_status = 'published');

-- Meeting children
drop policy if exists "Authenticated admins can read house meeting questions" on public.house_meeting_questions;
drop policy if exists "Authenticated admins can insert house meeting questions" on public.house_meeting_questions;
drop policy if exists "Authenticated admins can update house meeting questions" on public.house_meeting_questions;
drop policy if exists "Authenticated admins can delete house meeting questions" on public.house_meeting_questions;
create policy p09_house_meeting_questions_admin_scoped
on public.house_meeting_questions
for all to authenticated
using (public.admin_has_meeting_access(meeting_id))
with check (public.admin_has_meeting_access(meeting_id));

drop policy if exists "Public can read published house meeting questions" on public.house_meeting_questions;
create policy "Public can read published house meeting questions"
on public.house_meeting_questions
for select to anon
using (
  exists (
    select 1 from public.house_meetings m
    where m.id = house_meeting_questions.meeting_id
      and m.lifecycle_status = 'published'
  )
);

drop policy if exists "Authenticated admins can read house meeting manual votes" on public.house_meeting_manual_votes;
drop policy if exists "Authenticated admins can insert house meeting manual votes" on public.house_meeting_manual_votes;
drop policy if exists "Authenticated admins can update house meeting manual votes" on public.house_meeting_manual_votes;
drop policy if exists "Authenticated admins can delete house meeting manual votes" on public.house_meeting_manual_votes;
create policy p09_house_meeting_manual_votes_admin_scoped
on public.house_meeting_manual_votes
for all to authenticated
using (public.admin_has_meeting_access(meeting_id))
with check (public.admin_has_meeting_access(meeting_id));

drop policy if exists "Public can read published house meeting manual votes" on public.house_meeting_manual_votes;
create policy "Public can read published house meeting manual votes"
on public.house_meeting_manual_votes
for select to anon
using (
  exists (
    select 1 from public.house_meetings m
    where m.id = house_meeting_manual_votes.meeting_id
      and m.lifecycle_status = 'published'
  )
);

drop policy if exists "Authenticated admins can read house meeting votes" on public.house_meeting_votes;
drop policy if exists "Authenticated admins can insert house meeting votes" on public.house_meeting_votes;
drop policy if exists "Authenticated admins can update house meeting votes" on public.house_meeting_votes;
drop policy if exists "Authenticated admins can delete house meeting votes" on public.house_meeting_votes;
create policy p09_house_meeting_votes_admin_scoped
on public.house_meeting_votes
for all to authenticated
using (public.admin_has_meeting_access(meeting_id))
with check (public.admin_has_meeting_access(meeting_id));

-- P06 online voting admin read paths
drop policy if exists house_meeting_online_ballots_admin_read on public.house_meeting_online_ballots;
create policy house_meeting_online_ballots_admin_read
on public.house_meeting_online_ballots
for select to authenticated
using (public.admin_has_house_access(house_id));

drop policy if exists house_meeting_online_answers_admin_read on public.house_meeting_online_answers;
create policy house_meeting_online_answers_admin_read
on public.house_meeting_online_answers
for select to authenticated
using (public.admin_has_ballot_access(ballot_id));

drop policy if exists house_meeting_diia_events_admin_read on public.house_meeting_diia_events;
create policy house_meeting_diia_events_admin_read
on public.house_meeting_diia_events
for select to authenticated
using (
  ballot_id is not null
  and public.admin_has_ballot_access(ballot_id)
);

-- PAGES / SECTIONS
drop policy if exists "Authenticated admins can read house pages" on public.house_pages;
drop policy if exists "Authenticated admins can insert house pages" on public.house_pages;
create policy p09_house_pages_admin_scoped
on public.house_pages
for all to authenticated
using (public.admin_has_house_access(house_id))
with check (public.admin_has_house_access(house_id));

drop policy if exists "Public can read published house pages" on public.house_pages;
create policy "Public can read published house pages"
on public.house_pages
for select to anon
using (status = 'published'::public.content_status);

drop policy if exists "Authenticated admins can read house sections" on public.house_sections;
drop policy if exists "Authenticated admins can insert house sections" on public.house_sections;
drop policy if exists "Authenticated admins can update house sections" on public.house_sections;
drop policy if exists house_sections_delete_cms_staff on public.house_sections;
create policy p09_house_sections_admin_scoped
on public.house_sections
for all to authenticated
using (public.admin_has_house_page_access(house_page_id))
with check (public.admin_has_house_page_access(house_page_id));

drop policy if exists "Public can read published house sections" on public.house_sections;
create policy "Public can read published house sections"
on public.house_sections
for select to anon
using (status = 'published'::public.content_status);

-- PLAN
drop policy if exists "Authenticated admins can read house plan tasks" on public.house_plan_tasks;
drop policy if exists "Authenticated admins can insert house plan tasks" on public.house_plan_tasks;
drop policy if exists "Authenticated admins can update house plan tasks" on public.house_plan_tasks;
drop policy if exists "Authenticated admins can delete house plan tasks" on public.house_plan_tasks;
create policy p09_house_plan_tasks_admin_scoped
on public.house_plan_tasks
for all to authenticated
using (public.admin_has_house_access(house_id))
with check (public.admin_has_house_access(house_id));

drop policy if exists "Public can read published and archived house plan tasks" on public.house_plan_tasks;
create policy "Public can read published and archived house plan tasks"
on public.house_plan_tasks
for select to anon
using (
  lifecycle_status = any (array['published'::text,'archived'::text])
  and exists (
    select 1 from public.houses h
    where h.id = house_plan_tasks.house_id
      and h.is_active = true
      and h.archived_at is null
  )
);

drop policy if exists house_plan_status_transitions_admin_select on public.house_plan_status_transitions;
drop policy if exists house_plan_status_transitions_admin_insert on public.house_plan_status_transitions;
create policy p09_house_plan_status_transitions_admin_select
on public.house_plan_status_transitions
for select to authenticated
using (public.admin_has_house_access(house_id));
create policy p09_house_plan_status_transitions_admin_insert
on public.house_plan_status_transitions
for insert to authenticated
with check (
  public.admin_has_house_access(house_id)
  and (actor_admin_id is null or actor_admin_id = auth.uid())
);

-- POLLS parent
drop policy if exists house_polls_admin_manage on public.house_polls;
create policy house_polls_admin_manage
on public.house_polls
for all to authenticated
using (public.admin_has_house_access(house_id))
with check (public.admin_has_house_access(house_id));

-- keep public poll read anonymous-only
drop policy if exists house_polls_public_read_published on public.house_polls;
create policy house_polls_public_read_published
on public.house_polls
for select to anon
using (lifecycle_status = 'published');

-- poll questions
drop policy if exists house_poll_questions_admin_manage on public.house_poll_questions;
create policy house_poll_questions_admin_manage
on public.house_poll_questions
for all to authenticated
using (public.admin_has_poll_access(poll_id))
with check (public.admin_has_poll_access(poll_id));

drop policy if exists house_poll_questions_public_read_published on public.house_poll_questions;
create policy house_poll_questions_public_read_published
on public.house_poll_questions
for select to anon
using (
  exists (
    select 1 from public.house_polls p
    where p.id = house_poll_questions.poll_id
      and p.lifecycle_status = 'published'
  )
);

-- poll options
drop policy if exists house_poll_options_admin_manage on public.house_poll_options;
create policy house_poll_options_admin_manage
on public.house_poll_options
for all to authenticated
using (public.admin_has_poll_question_access(question_id))
with check (public.admin_has_poll_question_access(question_id));

drop policy if exists house_poll_options_public_read_published on public.house_poll_options;
create policy house_poll_options_public_read_published
on public.house_poll_options
for select to anon
using (
  exists (
    select 1
    from public.house_poll_questions q
    join public.house_polls p on p.id = q.poll_id
    where q.id = house_poll_options.question_id
      and p.lifecycle_status = 'published'
  )
);

-- participation/answers remain resident-writable through existing dedicated RPC/repository semantics;
-- only replace broad admin-manage policy with scoped admin policy.
drop policy if exists house_poll_participation_admin_manage on public.house_poll_participation;
create policy house_poll_participation_admin_manage
on public.house_poll_participation
for all to authenticated
using (public.admin_has_poll_access(poll_id))
with check (public.admin_has_poll_access(poll_id));

drop policy if exists house_poll_answers_admin_manage on public.house_poll_answers;
create policy house_poll_answers_admin_manage
on public.house_poll_answers
for all to authenticated
using (public.admin_has_poll_access(poll_id))
with check (public.admin_has_poll_access(poll_id));

-- REPORTS
drop policy if exists "Admins manage house_report_categories" on public.house_report_categories;
create policy p09_house_report_categories_admin_scoped
on public.house_report_categories
for all to authenticated
using (public.admin_has_house_access(house_id))
with check (public.admin_has_house_access(house_id));

drop policy if exists "Public read house_report_categories" on public.house_report_categories;
create policy "Public read house_report_categories"
on public.house_report_categories
for select to anon
using (true);

drop policy if exists "Admins manage house_reports" on public.house_reports;
create policy p09_house_reports_admin_scoped
on public.house_reports
for all to authenticated
using (public.admin_has_house_access(house_id))
with check (public.admin_has_house_access(house_id));

drop policy if exists "Public read published house_reports" on public.house_reports;
create policy "Public read published house_reports"
on public.house_reports
for select to anon
using (lifecycle_status = 'published');

-- REQUISITES
drop policy if exists "Admins manage house_requisites" on public.house_requisites;
create policy p09_house_requisites_admin_scoped
on public.house_requisites
for all to authenticated
using (public.admin_has_house_access(house_id))
with check (public.admin_has_house_access(house_id));

drop policy if exists "Public read house_requisites" on public.house_requisites;
create policy "Public read house_requisites"
on public.house_requisites
for select to anon
using (true);

-- SPECIALISTS
drop policy if exists "Admins can manage house specialists" on public.house_specialists;
create policy p09_house_specialists_admin_scoped
on public.house_specialists
for all to authenticated
using (public.admin_has_house_access(house_id))
with check (public.admin_has_house_access(house_id));

drop policy if exists "Public can read published house specialists" on public.house_specialists;
create policy "Public can read published house specialists"
on public.house_specialists
for select to anon
using (lifecycle_status = 'published');

drop policy if exists "Admins can manage house specialists categories" on public.house_specialists_categories;
create policy p09_house_specialists_categories_admin_scoped
on public.house_specialists_categories
for all to authenticated
using (public.admin_has_house_access(house_id))
with check (public.admin_has_house_access(house_id));

drop policy if exists "Public can read house specialists categories" on public.house_specialists_categories;
create policy "Public can read house specialists categories"
on public.house_specialists_categories
for select to anon
using (true);

-- CONTENT FILES:
-- remove broad admin/read policies. Keep specialized public file reads and
-- announcement-specific managed-file policies, but authenticated broad access
-- is now entity-house scoped through a helper expression.
drop policy if exists "Admins manage house_content_files" on public.house_content_files;
drop policy if exists "Authenticated read house_content_files" on public.house_content_files;

create or replace function public.admin_has_content_file_access(
  target_entity_type text,
  target_entity_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  case target_entity_type
    when 'house_announcement' then
      return exists (
        select 1 from public.house_announcements x
        where x.id = target_entity_id and public.admin_has_house_access(x.house_id)
      );
    when 'house_document' then
      return exists (
        select 1 from public.house_documents x
        where x.id = target_entity_id and public.admin_has_house_access(x.house_id)
      );
    when 'house_information_post' then
      return exists (
        select 1 from public.house_information_posts x
        where x.id = target_entity_id and public.admin_has_house_access(x.house_id)
      );
    when 'house_report' then
      return exists (
        select 1 from public.house_reports x
        where x.id = target_entity_id and public.admin_has_house_access(x.house_id)
      );
    when 'house_plan_task' then
      return exists (
        select 1 from public.house_plan_tasks x
        where x.id = target_entity_id and public.admin_has_house_access(x.house_id)
      );
    else
      return false;
  end case;
end;
$$;

revoke all on function public.admin_has_content_file_access(text,uuid)
from public, anon;
grant execute on function public.admin_has_content_file_access(text,uuid)
to authenticated, service_role;

create policy p09_house_content_files_admin_scoped
on public.house_content_files
for all to authenticated
using (public.admin_has_content_file_access(entity_type, entity_id))
with check (public.admin_has_content_file_access(entity_type, entity_id));

commit;
