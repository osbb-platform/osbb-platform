begin;

drop policy if exists
  "Public can read house debtors settings"
  on public.house_debtors_settings;

drop policy if exists
  "Public can read published house debtors items"
  on public.house_debtors_items;

drop policy if exists
  "Public can read published house meetings"
  on public.house_meetings;

drop policy if exists
  "Public can read published house meeting questions"
  on public.house_meeting_questions;

drop policy if exists
  "Public can read published house meeting manual votes"
  on public.house_meeting_manual_votes;

revoke select
  on table public.house_debtors_settings
  from anon;

revoke select
  on table public.house_debtors_settings
  from public;

revoke select
  on table public.house_debtors_items
  from anon;

revoke select
  on table public.house_debtors_items
  from public;

revoke select
  on table public.house_meetings
  from anon;

revoke select
  on table public.house_meetings
  from public;

revoke select
  on table public.house_meeting_questions
  from anon;

revoke select
  on table public.house_meeting_questions
  from public;

revoke select
  on table public.house_meeting_manual_votes
  from anon;

revoke select
  on table public.house_meeting_manual_votes
  from public;

revoke select
  on table public.house_meeting_votes
  from anon;

revoke select
  on table public.house_meeting_votes
  from public;

revoke select
  on table public.house_apartments
  from anon;

revoke select
  on table public.house_apartments
  from public;

revoke all
  on table public.house_sessions
  from anon;

revoke all
  on table public.house_sessions
  from public;

grant select
  on table public.house_debtors_settings
  to authenticated;

grant select
  on table public.house_debtors_items
  to authenticated;

grant select
  on table public.house_meetings
  to authenticated;

grant select
  on table public.house_meeting_questions
  to authenticated;

grant select
  on table public.house_meeting_manual_votes
  to authenticated;

grant select
  on table public.house_meeting_votes
  to authenticated;

grant select
  on table public.house_apartments
  to authenticated;

revoke execute
  on function public.get_house_bell_feed(uuid, integer)
  from anon;

revoke execute
  on function public.get_house_bell_feed(uuid, integer)
  from authenticated;

revoke execute
  on function public.get_house_bell_feed(uuid, integer)
  from public;

commit;
