begin;

create table if not exists public.site_notification_settings (
  id uuid primary key default gen_random_uuid(),
  singleton_key text not null default 'primary',
  lead_notifications_enabled boolean not null default true,
  lead_notify_emails text[] not null
    default array['osbb.platform.project@gmail.com']::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint site_notification_settings_singleton_unique
    unique (singleton_key),

  constraint site_notification_settings_singleton_check
    check (singleton_key = 'primary'),

  constraint site_notification_settings_email_count_check
    check (
      cardinality(lead_notify_emails) between 1 and 10
    )
);

alter table public.site_notification_settings
  enable row level security;

drop policy if exists "Admins manage site notification settings"
  on public.site_notification_settings;

create policy "Admins manage site notification settings"
  on public.site_notification_settings
  for all
  to authenticated
  using (
    public.get_my_admin_role() is not null
    and public.get_my_admin_role() <> 'inactive'
  )
  with check (
    public.get_my_admin_role() is not null
    and public.get_my_admin_role() <> 'inactive'
  );

insert into public.site_notification_settings (
  singleton_key,
  lead_notifications_enabled,
  lead_notify_emails
)
values (
  'primary',
  true,
  array['osbb.platform.project@gmail.com']::text[]
)
on conflict (singleton_key) do nothing;

comment on table public.site_notification_settings is
  'Private admin-only notification recipients for public site events.';

comment on column public.site_notification_settings.lead_notify_emails is
  'Validated recipient email addresses; never exposed through public CMS reads.';

commit;
