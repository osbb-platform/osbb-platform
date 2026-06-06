-- BASELINE for Architecture 2.0 migration. DO NOT REORDER prior migrations.
-- Generated from production schema-only dump for OSBB Architecture 2.0 pre-migration baseline.
-- Idempotent baseline: safe to apply after earlier migrations on dev.

CREATE SCHEMA IF NOT EXISTS public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'admin_role'
  ) THEN
    CREATE TYPE public.admin_role AS ENUM (
    'super_admin',
    'admin',
    'employee',
    'superadmin',
    'manager'
);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'content_status'
  ) THEN
    CREATE TYPE public.content_status AS ENUM (
    'draft',
    'in_review',
    'published',
    'archived'
);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'page_kind'
  ) THEN
    CREATE TYPE public.page_kind AS ENUM (
    'company',
    'house'
);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'section_kind'
  ) THEN
    CREATE TYPE public.section_kind AS ENUM (
    'hero',
    'rich_text',
    'contacts',
    'faq',
    'announcements',
    'documents',
    'reports',
    'debtors',
    'meetings',
    'requisites',
    'important_info',
    'specialists',
    'plan',
    'custom'
);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.admin_memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    role public.admin_role NOT NULL,
    house_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    status text DEFAULT 'invited'::text NOT NULL,
    job_title text,
    invited_by uuid,
    invited_at timestamp with time zone,
    activated_at timestamp with time zone,
    archived_at timestamp with time zone,
    last_invite_sent_at timestamp with time zone,
    invite_email text,
    full_name_snapshot text,
    CONSTRAINT admin_memberships_status_check CHECK ((status = ANY (ARRAY['invited'::text, 'active'::text, 'inactive'::text, 'archived'::text])))
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_user_id uuid,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.company_contact_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    type text DEFAULT 'register_house'::text NOT NULL,
    requester_name text NOT NULL,
    requester_email text NOT NULL,
    requester_phone text,
    house_name text NOT NULL,
    osbb_name text,
    address text NOT NULL,
    comment text,
    status text DEFAULT 'new'::text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.company_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    status public.content_status DEFAULT 'draft'::public.content_status NOT NULL,
    seo_title text,
    seo_description text,
    published_at timestamp with time zone,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    nav_order integer DEFAULT 100 NOT NULL,
    show_in_navigation boolean DEFAULT true NOT NULL,
    show_in_footer boolean DEFAULT false NOT NULL
);

CREATE TABLE IF NOT EXISTS public.company_search_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    query text NOT NULL,
    event_type text NOT NULL,
    matched_house_id uuid,
    matched_house_slug text,
    results_count integer DEFAULT 0 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS public.company_sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_page_id uuid NOT NULL,
    kind public.section_kind NOT NULL,
    title text,
    sort_order integer DEFAULT 0 NOT NULL,
    status public.content_status DEFAULT 'draft'::public.content_status NOT NULL,
    content jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.content_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    version_number integer NOT NULL,
    snapshot jsonb NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.districts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    theme_color text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.house_access (
    house_id uuid NOT NULL,
    password_hash text NOT NULL,
    session_version integer DEFAULT 1 NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.house_apartments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    house_id uuid NOT NULL,
    account_number text NOT NULL,
    apartment_label text NOT NULL,
    owner_name text NOT NULL,
    area numeric(10,2),
    source_type text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    archived_at timestamp with time zone,
    CONSTRAINT house_apartments_source_type_check CHECK ((source_type = ANY (ARRAY['import'::text, 'manual'::text])))
);

CREATE TABLE IF NOT EXISTS public.house_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    house_id uuid NOT NULL,
    title text NOT NULL,
    category text NOT NULL,
    visibility_status text DEFAULT 'draft'::text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    storage_bucket text,
    storage_path text,
    original_file_name text,
    mime_type text,
    file_size_bytes bigint,
    uploaded_at timestamp with time zone,
    attachment_status text DEFAULT 'none'::text NOT NULL,
    document_year integer,
    document_scope text DEFAULT 'information'::text,
    document_type text,
    CONSTRAINT house_documents_attachment_status_check CHECK ((attachment_status = ANY (ARRAY['none'::text, 'uploaded'::text]))),
    CONSTRAINT house_documents_category_check CHECK ((category = ANY (ARRAY['regulations'::text, 'tariffs'::text, 'meetings'::text, 'technical'::text, 'contracts'::text, 'resident_info'::text]))),
    CONSTRAINT house_documents_document_year_check CHECK (((document_year IS NULL) OR ((document_year >= 2016) AND (document_year <= 2026)))),
    CONSTRAINT house_documents_visibility_status_check CHECK ((visibility_status = ANY (ARRAY['draft'::text, 'private'::text, 'published'::text])))
);

CREATE TABLE IF NOT EXISTS public.house_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    house_id uuid NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    status public.content_status DEFAULT 'draft'::public.content_status NOT NULL,
    seo_title text,
    seo_description text,
    published_at timestamp with time zone,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.house_sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    house_page_id uuid NOT NULL,
    kind public.section_kind NOT NULL,
    title text,
    sort_order integer DEFAULT 0 NOT NULL,
    status public.content_status DEFAULT 'draft'::public.content_status NOT NULL,
    content jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.house_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    house_id uuid NOT NULL,
    session_token text NOT NULL,
    session_version integer NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.houses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    district_id uuid,
    name text NOT NULL,
    slug text NOT NULL,
    address text NOT NULL,
    osbb_name text,
    short_description text,
    public_description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    archived_at timestamp with time zone,
    current_access_code text,
    cover_image_path text,
    tariff_amount numeric,
    management_company_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS public.management_companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    slogan text,
    phone text,
    email text,
    address text,
    work_schedule text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.platform_change_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    actor_admin_id uuid,
    actor_name text,
    actor_email text,
    actor_role text,
    entity_type text NOT NULL,
    entity_id text,
    entity_label text,
    action_type text NOT NULL,
    description text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS public.platform_task_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    author_id uuid,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.platform_task_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    actor_id uuid,
    event_type text NOT NULL,
    action_label text NOT NULL,
    before_value text,
    after_value text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS public.platform_task_houses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    house_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.platform_task_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    link_type text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT platform_task_links_link_type_check CHECK ((link_type = ANY (ARRAY['draft'::text, 'resident_request'::text, 'specialist_request'::text, 'system_event'::text])))
);

CREATE TABLE IF NOT EXISTS public.platform_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by uuid,
    assigned_to uuid,
    title text NOT NULL,
    description text,
    task_type text DEFAULT 'manual'::text NOT NULL,
    status text DEFAULT 'todo'::text NOT NULL,
    priority text,
    deadline_at timestamp with time zone,
    completed_at timestamp with time zone,
    archived_at timestamp with time zone,
    deleted_at timestamp with time zone,
    house_section text,
    is_manual boolean DEFAULT true NOT NULL,
    is_overdue boolean DEFAULT false NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT platform_tasks_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT platform_tasks_status_check CHECK ((status = ANY (ARRAY['todo'::text, 'in_progress'::text, 'review'::text, 'done'::text]))),
    CONSTRAINT platform_tasks_task_type_check CHECK ((task_type = ANY (ARRAY['manual'::text, 'draft_approval'::text, 'resident_request'::text, 'specialist_request'::text, 'system'::text])))
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    full_name text,
    email text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    theme text DEFAULT 'dark'::text NOT NULL,
    CONSTRAINT profiles_theme_check CHECK ((theme = ANY (ARRAY['dark'::text, 'light'::text])))
);

CREATE TABLE IF NOT EXISTS public.specialist_contact_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    house_id uuid NOT NULL,
    house_slug text NOT NULL,
    category text NOT NULL,
    specialist_label text NOT NULL,
    requester_name text NOT NULL,
    requester_email text NOT NULL,
    apartment text NOT NULL,
    comment text,
    status text DEFAULT 'new'::text NOT NULL,
    specialist_id text,
    requester_phone text,
    subject text
);

CREATE OR REPLACE FUNCTION public.cleanup_platform_tasks() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  update public.platform_tasks
  set
    archived_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where
    status = 'done'
    and archived_at is null
    and completed_at is not null
    and completed_at < timezone('utc', now()) - interval '7 days';

  delete from public.platform_tasks
  where
    archived_at is not null
    and archived_at < timezone('utc', now()) - interval '30 days';
end;
$$;

CREATE OR REPLACE FUNCTION public.create_house_session(target_house_slug text, raw_password text, new_session_token text, ttl_hours integer DEFAULT 720) RETURNS TABLE(house_id uuid, house_slug text, session_token text, session_version integer, expires_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  v_house_id uuid;
  v_house_slug text;
  v_session_version integer;
  v_password_hash text;
  v_expires_at timestamptz;
begin
  select
    h.id,
    h.slug,
    ha.session_version,
    ha.password_hash
  into
    v_house_id,
    v_house_slug,
    v_session_version,
    v_password_hash
  from public.houses h
  join public.house_access ha on ha.house_id = h.id
  where h.slug = target_house_slug
    and h.is_active = true
  limit 1;

  if v_house_id is null then
    return;
  end if;

  if extensions.crypt(raw_password, v_password_hash) <> v_password_hash then
    return;
  end if;

  v_expires_at := timezone('utc', now()) + make_interval(hours => ttl_hours);

  insert into public.house_sessions (
    house_id,
    session_token,
    session_version,
    expires_at
  )
  values (
    v_house_id,
    new_session_token,
    v_session_version,
    v_expires_at
  );

  return query
  select
    v_house_id,
    v_house_slug,
    new_session_token,
    v_session_version,
    v_expires_at;
end;
$$;

CREATE OR REPLACE FUNCTION public.get_my_admin_role() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  select am.role::text
  from public.admin_memberships am
  where am.user_id = auth.uid()
    and am.is_active = true
    and am.house_id is null
    and (
      am.status is null
      or am.status = 'active'
    )
  order by
    case am.role::text
      when 'superadmin' then 1
      when 'admin' then 2
      when 'manager' then 3
      when 'super_admin' then 4
      when 'employee' then 5
      else 100
    end
  limit 1;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.is_authenticated_admin() RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    AS $$
  select exists (
    select 1
    from public.admin_memberships am
    where am.user_id = auth.uid()
      and am.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_house_session_valid(target_house_slug text, target_session_token text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  v_is_valid boolean;
begin
  select exists (
    select 1
    from public.house_sessions hs
    join public.houses h on h.id = hs.house_id
    join public.house_access ha on ha.house_id = h.id
    where h.slug = target_house_slug
      and h.is_active = true
      and hs.session_token = target_session_token
      and hs.expires_at > timezone('utc', now())
      and hs.session_version = ha.session_version
  )
  into v_is_valid;

  return coalesce(v_is_valid, false);
end;
$$;

CREATE OR REPLACE FUNCTION public.set_house_apartments_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.set_management_companies_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.upsert_house_access(target_house_id uuid, raw_password text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  insert into public.house_access (
    house_id,
    password_hash,
    session_version
  )
  values (
    target_house_id,
    extensions.crypt(raw_password, extensions.gen_salt('bf')),
    1
  )
  on conflict (house_id)
  do update set
    password_hash = excluded.password_hash,
    session_version = public.house_access.session_version + 1,
    updated_at = timezone('utc', now());
end;
$$;

CREATE OR REPLACE FUNCTION public.verify_house_access(target_house_slug text, raw_password text) RETURNS TABLE(house_id uuid, house_slug text, session_version integer, is_valid boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  return query
  select
    h.id,
    h.slug,
    ha.session_version,
    extensions.crypt(raw_password, ha.password_hash) = ha.password_hash as is_valid
  from public.houses h
  join public.house_access ha on ha.house_id = h.id
  where h.slug = target_house_slug
    and h.is_active = true
  limit 1;
end;
$$;

DO $$
BEGIN
  IF to_regclass('public.admin_memberships') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'admin_memberships_pkey'
         AND conrelid = 'public.admin_memberships'::regclass
     ) THEN
    ALTER TABLE ONLY public.admin_memberships
    ADD CONSTRAINT admin_memberships_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.admin_memberships') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'admin_memberships_unique_scope'
         AND conrelid = 'public.admin_memberships'::regclass
     ) THEN
    ALTER TABLE ONLY public.admin_memberships
    ADD CONSTRAINT admin_memberships_unique_scope UNIQUE (user_id, role, house_id);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.audit_logs') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'audit_logs_pkey'
         AND conrelid = 'public.audit_logs'::regclass
     ) THEN
    ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.company_contact_requests') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'company_contact_requests_pkey'
         AND conrelid = 'public.company_contact_requests'::regclass
     ) THEN
    ALTER TABLE ONLY public.company_contact_requests
    ADD CONSTRAINT company_contact_requests_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.company_pages') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'company_pages_pkey'
         AND conrelid = 'public.company_pages'::regclass
     ) THEN
    ALTER TABLE ONLY public.company_pages
    ADD CONSTRAINT company_pages_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.company_pages') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'company_pages_slug_key'
         AND conrelid = 'public.company_pages'::regclass
     ) THEN
    ALTER TABLE ONLY public.company_pages
    ADD CONSTRAINT company_pages_slug_key UNIQUE (slug);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.company_search_events') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'company_search_events_pkey'
         AND conrelid = 'public.company_search_events'::regclass
     ) THEN
    ALTER TABLE ONLY public.company_search_events
    ADD CONSTRAINT company_search_events_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.company_sections') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'company_sections_pkey'
         AND conrelid = 'public.company_sections'::regclass
     ) THEN
    ALTER TABLE ONLY public.company_sections
    ADD CONSTRAINT company_sections_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.content_versions') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'content_versions_pkey'
         AND conrelid = 'public.content_versions'::regclass
     ) THEN
    ALTER TABLE ONLY public.content_versions
    ADD CONSTRAINT content_versions_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.content_versions') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'content_versions_unique_version'
         AND conrelid = 'public.content_versions'::regclass
     ) THEN
    ALTER TABLE ONLY public.content_versions
    ADD CONSTRAINT content_versions_unique_version UNIQUE (entity_type, entity_id, version_number);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.districts') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'districts_name_key'
         AND conrelid = 'public.districts'::regclass
     ) THEN
    ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_name_key UNIQUE (name);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.districts') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'districts_pkey'
         AND conrelid = 'public.districts'::regclass
     ) THEN
    ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.districts') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'districts_slug_key'
         AND conrelid = 'public.districts'::regclass
     ) THEN
    ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_slug_key UNIQUE (slug);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_access') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'house_access_pkey'
         AND conrelid = 'public.house_access'::regclass
     ) THEN
    ALTER TABLE ONLY public.house_access
    ADD CONSTRAINT house_access_pkey PRIMARY KEY (house_id);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_apartments') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'house_apartments_pkey'
         AND conrelid = 'public.house_apartments'::regclass
     ) THEN
    ALTER TABLE ONLY public.house_apartments
    ADD CONSTRAINT house_apartments_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_documents') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'house_documents_pkey'
         AND conrelid = 'public.house_documents'::regclass
     ) THEN
    ALTER TABLE ONLY public.house_documents
    ADD CONSTRAINT house_documents_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_pages') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'house_pages_pkey'
         AND conrelid = 'public.house_pages'::regclass
     ) THEN
    ALTER TABLE ONLY public.house_pages
    ADD CONSTRAINT house_pages_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_pages') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'house_pages_unique_slug_per_house'
         AND conrelid = 'public.house_pages'::regclass
     ) THEN
    ALTER TABLE ONLY public.house_pages
    ADD CONSTRAINT house_pages_unique_slug_per_house UNIQUE (house_id, slug);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_sections') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'house_sections_pkey'
         AND conrelid = 'public.house_sections'::regclass
     ) THEN
    ALTER TABLE ONLY public.house_sections
    ADD CONSTRAINT house_sections_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_sessions') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'house_sessions_pkey'
         AND conrelid = 'public.house_sessions'::regclass
     ) THEN
    ALTER TABLE ONLY public.house_sessions
    ADD CONSTRAINT house_sessions_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_sessions') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'house_sessions_session_token_key'
         AND conrelid = 'public.house_sessions'::regclass
     ) THEN
    ALTER TABLE ONLY public.house_sessions
    ADD CONSTRAINT house_sessions_session_token_key UNIQUE (session_token);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.houses') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'houses_pkey'
         AND conrelid = 'public.houses'::regclass
     ) THEN
    ALTER TABLE ONLY public.houses
    ADD CONSTRAINT houses_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.houses') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'houses_slug_key'
         AND conrelid = 'public.houses'::regclass
     ) THEN
    ALTER TABLE ONLY public.houses
    ADD CONSTRAINT houses_slug_key UNIQUE (slug);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.management_companies') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'management_companies_pkey'
         AND conrelid = 'public.management_companies'::regclass
     ) THEN
    ALTER TABLE ONLY public.management_companies
    ADD CONSTRAINT management_companies_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.management_companies') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'management_companies_slug_key'
         AND conrelid = 'public.management_companies'::regclass
     ) THEN
    ALTER TABLE ONLY public.management_companies
    ADD CONSTRAINT management_companies_slug_key UNIQUE (slug);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_change_history') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'platform_change_history_pkey'
         AND conrelid = 'public.platform_change_history'::regclass
     ) THEN
    ALTER TABLE ONLY public.platform_change_history
    ADD CONSTRAINT platform_change_history_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_task_comments') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'platform_task_comments_pkey'
         AND conrelid = 'public.platform_task_comments'::regclass
     ) THEN
    ALTER TABLE ONLY public.platform_task_comments
    ADD CONSTRAINT platform_task_comments_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_task_events') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'platform_task_events_pkey'
         AND conrelid = 'public.platform_task_events'::regclass
     ) THEN
    ALTER TABLE ONLY public.platform_task_events
    ADD CONSTRAINT platform_task_events_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_task_houses') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'platform_task_houses_pkey'
         AND conrelid = 'public.platform_task_houses'::regclass
     ) THEN
    ALTER TABLE ONLY public.platform_task_houses
    ADD CONSTRAINT platform_task_houses_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_task_links') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'platform_task_links_pkey'
         AND conrelid = 'public.platform_task_links'::regclass
     ) THEN
    ALTER TABLE ONLY public.platform_task_links
    ADD CONSTRAINT platform_task_links_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_tasks') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'platform_tasks_pkey'
         AND conrelid = 'public.platform_tasks'::regclass
     ) THEN
    ALTER TABLE ONLY public.platform_tasks
    ADD CONSTRAINT platform_tasks_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'profiles_pkey'
         AND conrelid = 'public.profiles'::regclass
     ) THEN
    ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.specialist_contact_requests') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'specialist_contact_requests_pkey'
         AND conrelid = 'public.specialist_contact_requests'::regclass
     ) THEN
    ALTER TABLE ONLY public.specialist_contact_requests
    ADD CONSTRAINT specialist_contact_requests_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.admin_memberships') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'admin_memberships_house_id_fkey'
         AND conrelid = 'public.admin_memberships'::regclass
     ) THEN
    ALTER TABLE ONLY public.admin_memberships
    ADD CONSTRAINT admin_memberships_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.admin_memberships') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'admin_memberships_invited_by_fkey'
         AND conrelid = 'public.admin_memberships'::regclass
     ) THEN
    ALTER TABLE ONLY public.admin_memberships
    ADD CONSTRAINT admin_memberships_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.admin_memberships') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'admin_memberships_user_id_fkey'
         AND conrelid = 'public.admin_memberships'::regclass
     ) THEN
    ALTER TABLE ONLY public.admin_memberships
    ADD CONSTRAINT admin_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.audit_logs') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'audit_logs_actor_user_id_fkey'
         AND conrelid = 'public.audit_logs'::regclass
     ) THEN
    ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.company_pages') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'company_pages_created_by_fkey'
         AND conrelid = 'public.company_pages'::regclass
     ) THEN
    ALTER TABLE ONLY public.company_pages
    ADD CONSTRAINT company_pages_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.company_pages') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'company_pages_updated_by_fkey'
         AND conrelid = 'public.company_pages'::regclass
     ) THEN
    ALTER TABLE ONLY public.company_pages
    ADD CONSTRAINT company_pages_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.company_search_events') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'company_search_events_matched_house_id_fkey'
         AND conrelid = 'public.company_search_events'::regclass
     ) THEN
    ALTER TABLE ONLY public.company_search_events
    ADD CONSTRAINT company_search_events_matched_house_id_fkey FOREIGN KEY (matched_house_id) REFERENCES public.houses(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.company_sections') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'company_sections_company_page_id_fkey'
         AND conrelid = 'public.company_sections'::regclass
     ) THEN
    ALTER TABLE ONLY public.company_sections
    ADD CONSTRAINT company_sections_company_page_id_fkey FOREIGN KEY (company_page_id) REFERENCES public.company_pages(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.company_sections') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'company_sections_created_by_fkey'
         AND conrelid = 'public.company_sections'::regclass
     ) THEN
    ALTER TABLE ONLY public.company_sections
    ADD CONSTRAINT company_sections_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.company_sections') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'company_sections_updated_by_fkey'
         AND conrelid = 'public.company_sections'::regclass
     ) THEN
    ALTER TABLE ONLY public.company_sections
    ADD CONSTRAINT company_sections_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.content_versions') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'content_versions_created_by_fkey'
         AND conrelid = 'public.content_versions'::regclass
     ) THEN
    ALTER TABLE ONLY public.content_versions
    ADD CONSTRAINT content_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_access') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'house_access_house_id_fkey'
         AND conrelid = 'public.house_access'::regclass
     ) THEN
    ALTER TABLE ONLY public.house_access
    ADD CONSTRAINT house_access_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_access') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'house_access_updated_by_fkey'
         AND conrelid = 'public.house_access'::regclass
     ) THEN
    ALTER TABLE ONLY public.house_access
    ADD CONSTRAINT house_access_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_apartments') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'house_apartments_created_by_fkey'
         AND conrelid = 'public.house_apartments'::regclass
     ) THEN
    ALTER TABLE ONLY public.house_apartments
    ADD CONSTRAINT house_apartments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_apartments') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'house_apartments_house_id_fkey'
         AND conrelid = 'public.house_apartments'::regclass
     ) THEN
    ALTER TABLE ONLY public.house_apartments
    ADD CONSTRAINT house_apartments_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_documents') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'house_documents_house_id_fkey'
         AND conrelid = 'public.house_documents'::regclass
     ) THEN
    ALTER TABLE ONLY public.house_documents
    ADD CONSTRAINT house_documents_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_pages') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'house_pages_created_by_fkey'
         AND conrelid = 'public.house_pages'::regclass
     ) THEN
    ALTER TABLE ONLY public.house_pages
    ADD CONSTRAINT house_pages_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_pages') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'house_pages_house_id_fkey'
         AND conrelid = 'public.house_pages'::regclass
     ) THEN
    ALTER TABLE ONLY public.house_pages
    ADD CONSTRAINT house_pages_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_pages') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'house_pages_updated_by_fkey'
         AND conrelid = 'public.house_pages'::regclass
     ) THEN
    ALTER TABLE ONLY public.house_pages
    ADD CONSTRAINT house_pages_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_sections') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'house_sections_created_by_fkey'
         AND conrelid = 'public.house_sections'::regclass
     ) THEN
    ALTER TABLE ONLY public.house_sections
    ADD CONSTRAINT house_sections_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_sections') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'house_sections_house_page_id_fkey'
         AND conrelid = 'public.house_sections'::regclass
     ) THEN
    ALTER TABLE ONLY public.house_sections
    ADD CONSTRAINT house_sections_house_page_id_fkey FOREIGN KEY (house_page_id) REFERENCES public.house_pages(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_sections') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'house_sections_updated_by_fkey'
         AND conrelid = 'public.house_sections'::regclass
     ) THEN
    ALTER TABLE ONLY public.house_sections
    ADD CONSTRAINT house_sections_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_sessions') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'house_sessions_house_id_fkey'
         AND conrelid = 'public.house_sessions'::regclass
     ) THEN
    ALTER TABLE ONLY public.house_sessions
    ADD CONSTRAINT house_sessions_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.houses') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'houses_district_id_fkey'
         AND conrelid = 'public.houses'::regclass
     ) THEN
    ALTER TABLE ONLY public.houses
    ADD CONSTRAINT houses_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.houses') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'houses_management_company_id_fkey'
         AND conrelid = 'public.houses'::regclass
     ) THEN
    ALTER TABLE ONLY public.houses
    ADD CONSTRAINT houses_management_company_id_fkey FOREIGN KEY (management_company_id) REFERENCES public.management_companies(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_change_history') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'platform_change_history_actor_admin_id_fkey'
         AND conrelid = 'public.platform_change_history'::regclass
     ) THEN
    ALTER TABLE ONLY public.platform_change_history
    ADD CONSTRAINT platform_change_history_actor_admin_id_fkey FOREIGN KEY (actor_admin_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_task_comments') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'platform_task_comments_author_id_fkey'
         AND conrelid = 'public.platform_task_comments'::regclass
     ) THEN
    ALTER TABLE ONLY public.platform_task_comments
    ADD CONSTRAINT platform_task_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_task_comments') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'platform_task_comments_task_id_fkey'
         AND conrelid = 'public.platform_task_comments'::regclass
     ) THEN
    ALTER TABLE ONLY public.platform_task_comments
    ADD CONSTRAINT platform_task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.platform_tasks(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_task_events') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'platform_task_events_actor_id_fkey'
         AND conrelid = 'public.platform_task_events'::regclass
     ) THEN
    ALTER TABLE ONLY public.platform_task_events
    ADD CONSTRAINT platform_task_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_task_events') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'platform_task_events_task_id_fkey'
         AND conrelid = 'public.platform_task_events'::regclass
     ) THEN
    ALTER TABLE ONLY public.platform_task_events
    ADD CONSTRAINT platform_task_events_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.platform_tasks(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_task_houses') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'platform_task_houses_house_id_fkey'
         AND conrelid = 'public.platform_task_houses'::regclass
     ) THEN
    ALTER TABLE ONLY public.platform_task_houses
    ADD CONSTRAINT platform_task_houses_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_task_houses') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'platform_task_houses_task_id_fkey'
         AND conrelid = 'public.platform_task_houses'::regclass
     ) THEN
    ALTER TABLE ONLY public.platform_task_houses
    ADD CONSTRAINT platform_task_houses_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.platform_tasks(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_task_links') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'platform_task_links_task_id_fkey'
         AND conrelid = 'public.platform_task_links'::regclass
     ) THEN
    ALTER TABLE ONLY public.platform_task_links
    ADD CONSTRAINT platform_task_links_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.platform_tasks(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_tasks') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'platform_tasks_assigned_to_fkey'
         AND conrelid = 'public.platform_tasks'::regclass
     ) THEN
    ALTER TABLE ONLY public.platform_tasks
    ADD CONSTRAINT platform_tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_tasks') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'platform_tasks_created_by_fkey'
         AND conrelid = 'public.platform_tasks'::regclass
     ) THEN
    ALTER TABLE ONLY public.platform_tasks
    ADD CONSTRAINT platform_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'profiles_id_fkey'
         AND conrelid = 'public.profiles'::regclass
     ) THEN
    ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.specialist_contact_requests') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'specialist_contact_requests_house_id_fkey'
         AND conrelid = 'public.specialist_contact_requests'::regclass
     ) THEN
    ALTER TABLE ONLY public.specialist_contact_requests
    ADD CONSTRAINT specialist_contact_requests_house_id_fkey FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS admin_memberships_house_id_idx ON public.admin_memberships USING btree (house_id);

CREATE INDEX IF NOT EXISTS admin_memberships_invite_email_idx ON public.admin_memberships USING btree (invite_email);

CREATE INDEX IF NOT EXISTS admin_memberships_user_id_idx ON public.admin_memberships USING btree (user_id);

CREATE INDEX IF NOT EXISTS audit_logs_actor_user_id_idx ON public.audit_logs USING btree (actor_user_id);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs USING btree (created_at);

CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON public.audit_logs USING btree (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS company_contact_requests_created_at_idx ON public.company_contact_requests USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS company_contact_requests_status_idx ON public.company_contact_requests USING btree (status);

CREATE UNIQUE INDEX IF NOT EXISTS company_pages_single_primary_idx ON public.company_pages USING btree (is_primary) WHERE (is_primary = true);

CREATE INDEX IF NOT EXISTS company_search_events_created_at_idx ON public.company_search_events USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS company_search_events_event_type_idx ON public.company_search_events USING btree (event_type);

CREATE INDEX IF NOT EXISTS company_search_events_matched_house_id_idx ON public.company_search_events USING btree (matched_house_id);

CREATE INDEX IF NOT EXISTS company_sections_company_page_id_idx ON public.company_sections USING btree (company_page_id);

CREATE INDEX IF NOT EXISTS company_sections_kind_idx ON public.company_sections USING btree (kind);

CREATE INDEX IF NOT EXISTS content_versions_entity_idx ON public.content_versions USING btree (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS house_apartments_created_at_idx ON public.house_apartments USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS house_apartments_house_archive_idx ON public.house_apartments USING btree (house_id, archived_at);

CREATE INDEX IF NOT EXISTS house_apartments_house_id_idx ON public.house_apartments USING btree (house_id);

CREATE INDEX IF NOT EXISTS house_apartments_search_idx ON public.house_apartments USING btree (house_id, apartment_label, owner_name);

CREATE UNIQUE INDEX IF NOT EXISTS house_apartments_unique_account_active_idx ON public.house_apartments USING btree (house_id, account_number) WHERE (archived_at IS NULL);

CREATE UNIQUE INDEX IF NOT EXISTS house_apartments_unique_apartment_active_idx ON public.house_apartments USING btree (house_id, apartment_label) WHERE (archived_at IS NULL);

CREATE INDEX IF NOT EXISTS house_documents_house_id_created_at_idx ON public.house_documents USING btree (house_id, created_at DESC);

CREATE INDEX IF NOT EXISTS house_documents_house_id_idx ON public.house_documents USING btree (house_id);

CREATE INDEX IF NOT EXISTS house_documents_house_id_updated_at_idx ON public.house_documents USING btree (house_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS house_pages_house_id_idx ON public.house_pages USING btree (house_id);

CREATE INDEX IF NOT EXISTS house_sections_house_page_id_idx ON public.house_sections USING btree (house_page_id);

CREATE INDEX IF NOT EXISTS house_sections_kind_idx ON public.house_sections USING btree (kind);

CREATE INDEX IF NOT EXISTS house_sessions_expires_at_idx ON public.house_sessions USING btree (expires_at);

CREATE INDEX IF NOT EXISTS house_sessions_house_id_idx ON public.house_sessions USING btree (house_id);

CREATE INDEX IF NOT EXISTS house_sessions_token_idx ON public.house_sessions USING btree (session_token);

CREATE INDEX IF NOT EXISTS houses_current_access_code_idx ON public.houses USING btree (current_access_code);

CREATE INDEX IF NOT EXISTS houses_district_id_idx ON public.houses USING btree (district_id);

CREATE INDEX IF NOT EXISTS houses_management_company_id_idx ON public.houses USING btree (management_company_id);

CREATE INDEX IF NOT EXISTS houses_slug_idx ON public.houses USING btree (slug);

CREATE INDEX IF NOT EXISTS idx_houses_archived_at ON public.houses USING btree (archived_at);

CREATE INDEX IF NOT EXISTS platform_change_history_action_type_idx ON public.platform_change_history USING btree (action_type);

CREATE INDEX IF NOT EXISTS platform_change_history_actor_admin_id_idx ON public.platform_change_history USING btree (actor_admin_id);

CREATE INDEX IF NOT EXISTS platform_change_history_created_at_idx ON public.platform_change_history USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS platform_change_history_entity_type_idx ON public.platform_change_history USING btree (entity_type);

CREATE INDEX IF NOT EXISTS platform_task_comments_task_idx ON public.platform_task_comments USING btree (task_id);

CREATE INDEX IF NOT EXISTS platform_task_events_task_idx ON public.platform_task_events USING btree (task_id);

CREATE INDEX IF NOT EXISTS platform_task_houses_house_idx ON public.platform_task_houses USING btree (house_id);

CREATE INDEX IF NOT EXISTS platform_task_houses_task_idx ON public.platform_task_houses USING btree (task_id);

CREATE UNIQUE INDEX IF NOT EXISTS platform_task_houses_unique_idx ON public.platform_task_houses USING btree (task_id, house_id);

CREATE INDEX IF NOT EXISTS platform_task_links_task_idx ON public.platform_task_links USING btree (task_id);

CREATE INDEX IF NOT EXISTS platform_tasks_archived_idx ON public.platform_tasks USING btree (archived_at);

CREATE INDEX IF NOT EXISTS platform_tasks_assigned_to_idx ON public.platform_tasks USING btree (assigned_to);

CREATE INDEX IF NOT EXISTS platform_tasks_created_at_idx ON public.platform_tasks USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS platform_tasks_created_by_idx ON public.platform_tasks USING btree (created_by);

CREATE INDEX IF NOT EXISTS platform_tasks_deadline_idx ON public.platform_tasks USING btree (deadline_at);

CREATE INDEX IF NOT EXISTS platform_tasks_status_idx ON public.platform_tasks USING btree (status);

CREATE INDEX IF NOT EXISTS specialist_contact_requests_created_at_idx ON public.specialist_contact_requests USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS specialist_contact_requests_house_id_idx ON public.specialist_contact_requests USING btree (house_id);

CREATE INDEX IF NOT EXISTS specialist_contact_requests_specialist_id_idx ON public.specialist_contact_requests USING btree (specialist_id);

CREATE INDEX IF NOT EXISTS specialist_contact_requests_status_idx ON public.specialist_contact_requests USING btree (status);

DO $$
BEGIN
  IF to_regclass('public.admin_memberships') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_trigger
       WHERE tgname = 'admin_memberships_set_updated_at'
         AND tgrelid = 'public.admin_memberships'::regclass
     ) THEN
    CREATE TRIGGER admin_memberships_set_updated_at BEFORE UPDATE ON public.admin_memberships FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.company_pages') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_trigger
       WHERE tgname = 'company_pages_set_updated_at'
         AND tgrelid = 'public.company_pages'::regclass
     ) THEN
    CREATE TRIGGER company_pages_set_updated_at BEFORE UPDATE ON public.company_pages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.company_sections') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_trigger
       WHERE tgname = 'company_sections_set_updated_at'
         AND tgrelid = 'public.company_sections'::regclass
     ) THEN
    CREATE TRIGGER company_sections_set_updated_at BEFORE UPDATE ON public.company_sections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.districts') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_trigger
       WHERE tgname = 'districts_set_updated_at'
         AND tgrelid = 'public.districts'::regclass
     ) THEN
    CREATE TRIGGER districts_set_updated_at BEFORE UPDATE ON public.districts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_access') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_trigger
       WHERE tgname = 'house_access_set_updated_at'
         AND tgrelid = 'public.house_access'::regclass
     ) THEN
    CREATE TRIGGER house_access_set_updated_at BEFORE UPDATE ON public.house_access FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_pages') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_trigger
       WHERE tgname = 'house_pages_set_updated_at'
         AND tgrelid = 'public.house_pages'::regclass
     ) THEN
    CREATE TRIGGER house_pages_set_updated_at BEFORE UPDATE ON public.house_pages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_sections') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_trigger
       WHERE tgname = 'house_sections_set_updated_at'
         AND tgrelid = 'public.house_sections'::regclass
     ) THEN
    CREATE TRIGGER house_sections_set_updated_at BEFORE UPDATE ON public.house_sections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.houses') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_trigger
       WHERE tgname = 'houses_set_updated_at'
         AND tgrelid = 'public.houses'::regclass
     ) THEN
    CREATE TRIGGER houses_set_updated_at BEFORE UPDATE ON public.houses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.management_companies') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_trigger
       WHERE tgname = 'management_companies_set_updated_at'
         AND tgrelid = 'public.management_companies'::regclass
     ) THEN
    CREATE TRIGGER management_companies_set_updated_at BEFORE UPDATE ON public.management_companies FOR EACH ROW EXECUTE FUNCTION public.set_management_companies_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_trigger
       WHERE tgname = 'profiles_set_updated_at'
         AND tgrelid = 'public.profiles'::regclass
     ) THEN
    CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_apartments') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_trigger
       WHERE tgname = 'set_house_apartments_updated_at_trigger'
         AND tgrelid = 'public.house_apartments'::regclass
     ) THEN
    CREATE TRIGGER set_house_apartments_updated_at_trigger BEFORE UPDATE ON public.house_apartments FOR EACH ROW EXECUTE FUNCTION public.set_house_apartments_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.admin_memberships') IS NOT NULL THEN
    ALTER TABLE public.admin_memberships ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.company_contact_requests') IS NOT NULL THEN
    ALTER TABLE public.company_contact_requests ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.company_pages') IS NOT NULL THEN
    ALTER TABLE public.company_pages ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.company_search_events') IS NOT NULL THEN
    ALTER TABLE public.company_search_events ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.company_sections') IS NOT NULL THEN
    ALTER TABLE public.company_sections ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.content_versions') IS NOT NULL THEN
    ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.districts') IS NOT NULL THEN
    ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_access') IS NOT NULL THEN
    ALTER TABLE public.house_access ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_apartments') IS NOT NULL THEN
    ALTER TABLE public.house_apartments ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_pages') IS NOT NULL THEN
    ALTER TABLE public.house_pages ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_sections') IS NOT NULL THEN
    ALTER TABLE public.house_sections ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_sessions') IS NOT NULL THEN
    ALTER TABLE public.house_sessions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.houses') IS NOT NULL THEN
    ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_change_history') IS NOT NULL THEN
    ALTER TABLE public.platform_change_history ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_task_comments') IS NOT NULL THEN
    ALTER TABLE public.platform_task_comments ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_task_events') IS NOT NULL THEN
    ALTER TABLE public.platform_task_events ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_task_houses') IS NOT NULL THEN
    ALTER TABLE public.platform_task_houses ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_task_links') IS NOT NULL THEN
    ALTER TABLE public.platform_task_links ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_tasks') IS NOT NULL THEN
    ALTER TABLE public.platform_tasks ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.specialist_contact_requests') IS NOT NULL THEN
    ALTER TABLE public.specialist_contact_requests ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.houses') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'Authenticated admins can delete archived houses'
         AND polrelid = 'public.houses'::regclass
     ) THEN
    CREATE POLICY "Authenticated admins can delete archived houses" ON public.houses FOR DELETE TO authenticated USING ((public.is_authenticated_admin() AND (archived_at IS NOT NULL)));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.company_pages') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'Authenticated admins can insert company pages'
         AND polrelid = 'public.company_pages'::regclass
     ) THEN
    CREATE POLICY "Authenticated admins can insert company pages" ON public.company_pages FOR INSERT WITH CHECK (public.is_authenticated_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.company_sections') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'Authenticated admins can insert company sections'
         AND polrelid = 'public.company_sections'::regclass
     ) THEN
    CREATE POLICY "Authenticated admins can insert company sections" ON public.company_sections FOR INSERT WITH CHECK (public.is_authenticated_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.content_versions') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'Authenticated admins can insert content versions'
         AND polrelid = 'public.content_versions'::regclass
     ) THEN
    CREATE POLICY "Authenticated admins can insert content versions" ON public.content_versions FOR INSERT WITH CHECK (public.is_authenticated_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.districts') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'Authenticated admins can insert districts'
         AND polrelid = 'public.districts'::regclass
     ) THEN
    CREATE POLICY "Authenticated admins can insert districts" ON public.districts FOR INSERT WITH CHECK (public.is_authenticated_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_pages') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'Authenticated admins can insert house pages'
         AND polrelid = 'public.house_pages'::regclass
     ) THEN
    CREATE POLICY "Authenticated admins can insert house pages" ON public.house_pages FOR INSERT WITH CHECK (public.is_authenticated_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_sections') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'Authenticated admins can insert house sections'
         AND polrelid = 'public.house_sections'::regclass
     ) THEN
    CREATE POLICY "Authenticated admins can insert house sections" ON public.house_sections FOR INSERT WITH CHECK (public.is_authenticated_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.houses') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'Authenticated admins can insert houses'
         AND polrelid = 'public.houses'::regclass
     ) THEN
    CREATE POLICY "Authenticated admins can insert houses" ON public.houses FOR INSERT WITH CHECK (public.is_authenticated_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.admin_memberships') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'Authenticated admins can read admin memberships'
         AND polrelid = 'public.admin_memberships'::regclass
     ) THEN
    CREATE POLICY "Authenticated admins can read admin memberships" ON public.admin_memberships FOR SELECT USING (public.is_authenticated_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.houses') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'Authenticated admins can read all houses'
         AND polrelid = 'public.houses'::regclass
     ) THEN
    CREATE POLICY "Authenticated admins can read all houses" ON public.houses FOR SELECT TO authenticated USING (public.is_authenticated_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.company_pages') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'Authenticated admins can read company pages'
         AND polrelid = 'public.company_pages'::regclass
     ) THEN
    CREATE POLICY "Authenticated admins can read company pages" ON public.company_pages FOR SELECT USING (public.is_authenticated_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.company_sections') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'Authenticated admins can read company sections'
         AND polrelid = 'public.company_sections'::regclass
     ) THEN
    CREATE POLICY "Authenticated admins can read company sections" ON public.company_sections FOR SELECT USING (public.is_authenticated_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_access') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'Authenticated admins can read house access'
         AND polrelid = 'public.house_access'::regclass
     ) THEN
    CREATE POLICY "Authenticated admins can read house access" ON public.house_access FOR SELECT USING (public.is_authenticated_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_pages') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'Authenticated admins can read house pages'
         AND polrelid = 'public.house_pages'::regclass
     ) THEN
    CREATE POLICY "Authenticated admins can read house pages" ON public.house_pages FOR SELECT USING (public.is_authenticated_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_sections') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'Authenticated admins can read house sections'
         AND polrelid = 'public.house_sections'::regclass
     ) THEN
    CREATE POLICY "Authenticated admins can read house sections" ON public.house_sections FOR SELECT USING (public.is_authenticated_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'Authenticated admins can read profiles'
         AND polrelid = 'public.profiles'::regclass
     ) THEN
    CREATE POLICY "Authenticated admins can read profiles" ON public.profiles FOR SELECT USING (public.is_authenticated_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.company_pages') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'Authenticated admins can update company pages'
         AND polrelid = 'public.company_pages'::regclass
     ) THEN
    CREATE POLICY "Authenticated admins can update company pages" ON public.company_pages FOR UPDATE USING (public.is_authenticated_admin()) WITH CHECK (public.is_authenticated_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.company_sections') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'Authenticated admins can update company sections'
         AND polrelid = 'public.company_sections'::regclass
     ) THEN
    CREATE POLICY "Authenticated admins can update company sections" ON public.company_sections FOR UPDATE USING (public.is_authenticated_admin()) WITH CHECK (public.is_authenticated_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_access') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'Authenticated admins can update house access'
         AND polrelid = 'public.house_access'::regclass
     ) THEN
    CREATE POLICY "Authenticated admins can update house access" ON public.house_access FOR UPDATE USING (public.is_authenticated_admin()) WITH CHECK (public.is_authenticated_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_sections') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'Authenticated admins can update house sections'
         AND polrelid = 'public.house_sections'::regclass
     ) THEN
    CREATE POLICY "Authenticated admins can update house sections" ON public.house_sections FOR UPDATE USING (public.is_authenticated_admin()) WITH CHECK (public.is_authenticated_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.houses') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'Authenticated admins can update houses'
         AND polrelid = 'public.houses'::regclass
     ) THEN
    CREATE POLICY "Authenticated admins can update houses" ON public.houses FOR UPDATE USING (public.is_authenticated_admin()) WITH CHECK (public.is_authenticated_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.houses') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'Public can read active houses'
         AND polrelid = 'public.houses'::regclass
     ) THEN
    CREATE POLICY "Public can read active houses" ON public.houses FOR SELECT USING ((is_active = true));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.districts') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'Public can read districts'
         AND polrelid = 'public.districts'::regclass
     ) THEN
    CREATE POLICY "Public can read districts" ON public.districts FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.company_pages') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'Public can read published company pages'
         AND polrelid = 'public.company_pages'::regclass
     ) THEN
    CREATE POLICY "Public can read published company pages" ON public.company_pages FOR SELECT USING ((status = 'published'::public.content_status));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.company_sections') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'Public can read published company sections'
         AND polrelid = 'public.company_sections'::regclass
     ) THEN
    CREATE POLICY "Public can read published company sections" ON public.company_sections FOR SELECT USING ((status = 'published'::public.content_status));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_pages') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'Public can read published house pages'
         AND polrelid = 'public.house_pages'::regclass
     ) THEN
    CREATE POLICY "Public can read published house pages" ON public.house_pages FOR SELECT USING ((status = 'published'::public.content_status));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_sections') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'Public can read published house sections'
         AND polrelid = 'public.house_sections'::regclass
     ) THEN
    CREATE POLICY "Public can read published house sections" ON public.house_sections FOR SELECT USING ((status = 'published'::public.content_status));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.company_contact_requests') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'company_contact_requests_insert_public'
         AND polrelid = 'public.company_contact_requests'::regclass
     ) THEN
    CREATE POLICY company_contact_requests_insert_public ON public.company_contact_requests FOR INSERT TO authenticated, anon WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.company_contact_requests') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'company_contact_requests_select_authenticated'
         AND polrelid = 'public.company_contact_requests'::regclass
     ) THEN
    CREATE POLICY company_contact_requests_select_authenticated ON public.company_contact_requests FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.company_contact_requests') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'company_contact_requests_update_authenticated'
         AND polrelid = 'public.company_contact_requests'::regclass
     ) THEN
    CREATE POLICY company_contact_requests_update_authenticated ON public.company_contact_requests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.company_search_events') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'company_search_events_insert_public'
         AND polrelid = 'public.company_search_events'::regclass
     ) THEN
    CREATE POLICY company_search_events_insert_public ON public.company_search_events FOR INSERT TO authenticated, anon WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.company_search_events') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'company_search_events_select_authenticated'
         AND polrelid = 'public.company_search_events'::regclass
     ) THEN
    CREATE POLICY company_search_events_select_authenticated ON public.company_search_events FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.districts') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'districts_delete_authenticated'
         AND polrelid = 'public.districts'::regclass
     ) THEN
    CREATE POLICY districts_delete_authenticated ON public.districts FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.districts') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'districts_insert_authenticated'
         AND polrelid = 'public.districts'::regclass
     ) THEN
    CREATE POLICY districts_insert_authenticated ON public.districts FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.districts') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'districts_select_authenticated'
         AND polrelid = 'public.districts'::regclass
     ) THEN
    CREATE POLICY districts_select_authenticated ON public.districts FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.districts') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'districts_update_authenticated'
         AND polrelid = 'public.districts'::regclass
     ) THEN
    CREATE POLICY districts_update_authenticated ON public.districts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_apartments') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'house_apartments_insert_authenticated'
         AND polrelid = 'public.house_apartments'::regclass
     ) THEN
    CREATE POLICY house_apartments_insert_authenticated ON public.house_apartments FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_apartments') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'house_apartments_select_authenticated'
         AND polrelid = 'public.house_apartments'::regclass
     ) THEN
    CREATE POLICY house_apartments_select_authenticated ON public.house_apartments FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_apartments') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'house_apartments_update_authenticated'
         AND polrelid = 'public.house_apartments'::regclass
     ) THEN
    CREATE POLICY house_apartments_update_authenticated ON public.house_apartments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.house_sections') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'house_sections_delete_cms_staff'
         AND polrelid = 'public.house_sections'::regclass
     ) THEN
    CREATE POLICY house_sections_delete_cms_staff ON public.house_sections FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.admin_memberships am
  WHERE ((am.user_id = auth.uid()) AND (am.house_id IS NULL) AND (am.is_active = true) AND (am.status = ANY (ARRAY['active'::text, 'invited'::text])) AND (am.role = ANY (ARRAY['superadmin'::public.admin_role, 'admin'::public.admin_role, 'manager'::public.admin_role]))))));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_change_history') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'platform_change_history_insert_authenticated'
         AND polrelid = 'public.platform_change_history'::regclass
     ) THEN
    CREATE POLICY platform_change_history_insert_authenticated ON public.platform_change_history FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_change_history') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'platform_change_history_select_authenticated'
         AND polrelid = 'public.platform_change_history'::regclass
     ) THEN
    CREATE POLICY platform_change_history_select_authenticated ON public.platform_change_history FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_task_comments') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'platform_task_comments_admin_delete'
         AND polrelid = 'public.platform_task_comments'::regclass
     ) THEN
    CREATE POLICY platform_task_comments_admin_delete ON public.platform_task_comments FOR DELETE TO authenticated USING ((public.get_my_admin_role() IS NOT NULL));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_task_comments') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'platform_task_comments_admin_insert'
         AND polrelid = 'public.platform_task_comments'::regclass
     ) THEN
    CREATE POLICY platform_task_comments_admin_insert ON public.platform_task_comments FOR INSERT TO authenticated WITH CHECK ((public.get_my_admin_role() IS NOT NULL));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_task_comments') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'platform_task_comments_admin_select'
         AND polrelid = 'public.platform_task_comments'::regclass
     ) THEN
    CREATE POLICY platform_task_comments_admin_select ON public.platform_task_comments FOR SELECT TO authenticated USING ((public.get_my_admin_role() IS NOT NULL));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_task_comments') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'platform_task_comments_admin_update'
         AND polrelid = 'public.platform_task_comments'::regclass
     ) THEN
    CREATE POLICY platform_task_comments_admin_update ON public.platform_task_comments FOR UPDATE TO authenticated USING ((public.get_my_admin_role() IS NOT NULL)) WITH CHECK ((public.get_my_admin_role() IS NOT NULL));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_task_events') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'platform_task_events_admin_delete'
         AND polrelid = 'public.platform_task_events'::regclass
     ) THEN
    CREATE POLICY platform_task_events_admin_delete ON public.platform_task_events FOR DELETE TO authenticated USING ((public.get_my_admin_role() IS NOT NULL));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_task_events') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'platform_task_events_admin_insert'
         AND polrelid = 'public.platform_task_events'::regclass
     ) THEN
    CREATE POLICY platform_task_events_admin_insert ON public.platform_task_events FOR INSERT TO authenticated WITH CHECK ((public.get_my_admin_role() IS NOT NULL));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_task_events') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'platform_task_events_admin_select'
         AND polrelid = 'public.platform_task_events'::regclass
     ) THEN
    CREATE POLICY platform_task_events_admin_select ON public.platform_task_events FOR SELECT TO authenticated USING ((public.get_my_admin_role() IS NOT NULL));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_task_events') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'platform_task_events_admin_update'
         AND polrelid = 'public.platform_task_events'::regclass
     ) THEN
    CREATE POLICY platform_task_events_admin_update ON public.platform_task_events FOR UPDATE TO authenticated USING ((public.get_my_admin_role() IS NOT NULL)) WITH CHECK ((public.get_my_admin_role() IS NOT NULL));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_task_houses') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'platform_task_houses_admin_delete'
         AND polrelid = 'public.platform_task_houses'::regclass
     ) THEN
    CREATE POLICY platform_task_houses_admin_delete ON public.platform_task_houses FOR DELETE TO authenticated USING ((public.get_my_admin_role() IS NOT NULL));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_task_houses') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'platform_task_houses_admin_insert'
         AND polrelid = 'public.platform_task_houses'::regclass
     ) THEN
    CREATE POLICY platform_task_houses_admin_insert ON public.platform_task_houses FOR INSERT TO authenticated WITH CHECK ((public.get_my_admin_role() IS NOT NULL));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_task_houses') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'platform_task_houses_admin_select'
         AND polrelid = 'public.platform_task_houses'::regclass
     ) THEN
    CREATE POLICY platform_task_houses_admin_select ON public.platform_task_houses FOR SELECT TO authenticated USING ((public.get_my_admin_role() IS NOT NULL));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_task_houses') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'platform_task_houses_admin_update'
         AND polrelid = 'public.platform_task_houses'::regclass
     ) THEN
    CREATE POLICY platform_task_houses_admin_update ON public.platform_task_houses FOR UPDATE TO authenticated USING ((public.get_my_admin_role() IS NOT NULL)) WITH CHECK ((public.get_my_admin_role() IS NOT NULL));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_task_links') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'platform_task_links_admin_delete'
         AND polrelid = 'public.platform_task_links'::regclass
     ) THEN
    CREATE POLICY platform_task_links_admin_delete ON public.platform_task_links FOR DELETE TO authenticated USING ((public.get_my_admin_role() IS NOT NULL));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_task_links') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'platform_task_links_admin_insert'
         AND polrelid = 'public.platform_task_links'::regclass
     ) THEN
    CREATE POLICY platform_task_links_admin_insert ON public.platform_task_links FOR INSERT TO authenticated WITH CHECK ((public.get_my_admin_role() IS NOT NULL));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_task_links') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'platform_task_links_admin_select'
         AND polrelid = 'public.platform_task_links'::regclass
     ) THEN
    CREATE POLICY platform_task_links_admin_select ON public.platform_task_links FOR SELECT TO authenticated USING ((public.get_my_admin_role() IS NOT NULL));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_task_links') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'platform_task_links_admin_update'
         AND polrelid = 'public.platform_task_links'::regclass
     ) THEN
    CREATE POLICY platform_task_links_admin_update ON public.platform_task_links FOR UPDATE TO authenticated USING ((public.get_my_admin_role() IS NOT NULL)) WITH CHECK ((public.get_my_admin_role() IS NOT NULL));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_tasks') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'platform_tasks_admin_delete'
         AND polrelid = 'public.platform_tasks'::regclass
     ) THEN
    CREATE POLICY platform_tasks_admin_delete ON public.platform_tasks FOR DELETE TO authenticated USING ((public.get_my_admin_role() IS NOT NULL));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_tasks') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'platform_tasks_admin_insert'
         AND polrelid = 'public.platform_tasks'::regclass
     ) THEN
    CREATE POLICY platform_tasks_admin_insert ON public.platform_tasks FOR INSERT TO authenticated WITH CHECK ((public.get_my_admin_role() IS NOT NULL));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_tasks') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'platform_tasks_admin_select'
         AND polrelid = 'public.platform_tasks'::regclass
     ) THEN
    CREATE POLICY platform_tasks_admin_select ON public.platform_tasks FOR SELECT TO authenticated USING ((public.get_my_admin_role() IS NOT NULL));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.platform_tasks') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'platform_tasks_admin_update'
         AND polrelid = 'public.platform_tasks'::regclass
     ) THEN
    CREATE POLICY platform_tasks_admin_update ON public.platform_tasks FOR UPDATE TO authenticated USING ((public.get_my_admin_role() IS NOT NULL)) WITH CHECK ((public.get_my_admin_role() IS NOT NULL));
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.specialist_contact_requests') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'specialist_contact_requests_insert_public'
         AND polrelid = 'public.specialist_contact_requests'::regclass
     ) THEN
    CREATE POLICY specialist_contact_requests_insert_public ON public.specialist_contact_requests FOR INSERT TO authenticated, anon WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.specialist_contact_requests') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_policy
       WHERE polname = 'specialist_contact_requests_select_authenticated'
         AND polrelid = 'public.specialist_contact_requests'::regclass
     ) THEN
    CREATE POLICY specialist_contact_requests_select_authenticated ON public.specialist_contact_requests FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

COMMENT ON SCHEMA public IS 'standard public schema';

COMMENT ON FUNCTION public.cleanup_platform_tasks() IS 'Автоархивация выполненных задач через 7 дней и удаление архивных через 30 дней.';

COMMENT ON COLUMN public.house_documents.document_scope IS 'Logical scope of document section: information | founding';

COMMENT ON COLUMN public.house_documents.document_type IS 'Document type label for founding documents (statute, protocol, extract, etc.)';

COMMENT ON COLUMN public.houses.current_access_code IS 'Readable current house access code for CMS operational access.';

COMMENT ON COLUMN public.houses.cover_image_path IS 'Storage path for public house access page cover image';

COMMENT ON COLUMN public.houses.management_company_id IS 'Прив’язка будинку до керуючої компанії для public footer та CMS';

COMMENT ON TABLE public.management_companies IS 'Довідник керуючих компаній для прив’язки до будинків та public footer';

COMMENT ON COLUMN public.management_companies.slug IS 'Системний slug керуючої компанії';

COMMENT ON COLUMN public.management_companies.work_schedule IS 'Графік роботи для відображення у footer будинку';
