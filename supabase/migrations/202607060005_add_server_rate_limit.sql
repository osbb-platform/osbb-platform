-- S1.T5 — server-side rate limiting foundation.
--
-- Additive phase only:
--   1. create the private auth_attempts state table;
--   2. create atomic rate-limit RPC functions;
--   3. expose them only to service_role.
--
-- Direct create_house_session permissions remain unchanged in this
-- phase. Lockdown happens only after compatible application deployment
-- and smoke testing.
--
-- Rollback:
--   drop function if exists public.clear_rate_limit(text, text);
--   drop function if exists public.consume_rate_limit(
--     text, text, integer, integer, integer
--   );
--   drop function if exists public.record_rate_limit_failure(
--     text, text, integer, integer, integer
--   );
--   drop function if exists public.get_rate_limit_state(text, text);
--   drop table if exists public.auth_attempts;

begin;

create table if not exists public.auth_attempts (
  scope text not null,
  key_hash text not null,
  attempt_count integer not null default 0,
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz null,
  updated_at timestamptz not null default now(),

  constraint auth_attempts_pkey
    primary key (scope, key_hash),

  constraint auth_attempts_scope_format
    check (scope ~ '^[a-z0-9:_-]{1,80}$'),

  constraint auth_attempts_key_hash_format
    check (key_hash ~ '^[0-9a-f]{64}$'),

  constraint auth_attempts_count_nonnegative
    check (attempt_count >= 0)
);

create index if not exists auth_attempts_updated_at_idx
  on public.auth_attempts (updated_at);

alter table public.auth_attempts enable row level security;

revoke all
  on table public.auth_attempts
  from public, anon, authenticated;

grant select, insert, update, delete
  on table public.auth_attempts
  to service_role;

create or replace function public.get_rate_limit_state(
  p_scope text,
  p_key_hash text
)
returns table (
  allowed boolean,
  retry_after_seconds integer,
  blocked_until timestamptz,
  attempt_count integer
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_row public.auth_attempts%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  if p_scope is null
     or p_scope !~ '^[a-z0-9:_-]{1,80}$'
     or p_key_hash is null
     or p_key_hash !~ '^[0-9a-f]{64}$'
  then
    raise exception 'INVALID_RATE_LIMIT_KEY'
      using errcode = '22023';
  end if;

  select attempt.*
  into v_row
  from public.auth_attempts as attempt
  where attempt.scope = p_scope
    and attempt.key_hash = p_key_hash;

  if not found then
    return query
    select
      true,
      0,
      null::timestamptz,
      0;

    return;
  end if;

  if v_row.blocked_until is not null
     and v_row.blocked_until > v_now
  then
    return query
    select
      false,
      greatest(
        1,
        ceil(
          extract(
            epoch from (v_row.blocked_until - v_now)
          )
        )::integer
      ),
      v_row.blocked_until,
      v_row.attempt_count;

    return;
  end if;

  return query
  select
    true,
    0,
    null::timestamptz,
    v_row.attempt_count;
end;
$function$;

create or replace function public.record_rate_limit_failure(
  p_scope text,
  p_key_hash text,
  p_max_attempts integer,
  p_window_seconds integer,
  p_block_seconds integer
)
returns table (
  allowed boolean,
  retry_after_seconds integer,
  blocked_until timestamptz,
  attempt_count integer
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_row public.auth_attempts%rowtype;
  v_now timestamptz := clock_timestamp();
  v_count integer;
  v_window_started_at timestamptz;
  v_blocked_until timestamptz;
begin
  if p_scope is null
     or p_scope !~ '^[a-z0-9:_-]{1,80}$'
     or p_key_hash is null
     or p_key_hash !~ '^[0-9a-f]{64}$'
     or p_max_attempts < 1
     or p_max_attempts > 10000
     or p_window_seconds < 1
     or p_window_seconds > 86400
     or p_block_seconds < 1
     or p_block_seconds > 86400
  then
    raise exception 'INVALID_RATE_LIMIT_POLICY'
      using errcode = '22023';
  end if;

  insert into public.auth_attempts (
    scope,
    key_hash,
    attempt_count,
    window_started_at,
    blocked_until,
    updated_at
  )
  values (
    p_scope,
    p_key_hash,
    0,
    v_now,
    null,
    v_now
  )
  on conflict (scope, key_hash) do nothing;

  select attempt.*
  into v_row
  from public.auth_attempts as attempt
  where attempt.scope = p_scope
    and attempt.key_hash = p_key_hash
  for update;

  if v_row.blocked_until is not null
     and v_row.blocked_until > v_now
  then
    return query
    select
      false,
      greatest(
        1,
        ceil(
          extract(
            epoch from (v_row.blocked_until - v_now)
          )
        )::integer
      ),
      v_row.blocked_until,
      v_row.attempt_count;

    return;
  end if;

  if (
    v_row.blocked_until is not null
    and v_row.blocked_until <= v_now
  ) or (
    v_row.window_started_at
      <= v_now - make_interval(secs => p_window_seconds)
  )
  then
    v_count := 0;
    v_window_started_at := v_now;
    v_blocked_until := null;
  else
    v_count := v_row.attempt_count;
    v_window_started_at := v_row.window_started_at;
    v_blocked_until := null;
  end if;

  v_count := v_count + 1;

  if v_count >= p_max_attempts then
    v_blocked_until :=
      v_now + make_interval(secs => p_block_seconds);
  end if;

  update public.auth_attempts
  set
    attempt_count = v_count,
    window_started_at = v_window_started_at,
    blocked_until = v_blocked_until,
    updated_at = v_now
  where scope = p_scope
    and key_hash = p_key_hash;

  if v_blocked_until is not null then
    return query
    select
      false,
      p_block_seconds,
      v_blocked_until,
      v_count;

    return;
  end if;

  return query
  select
    true,
    0,
    null::timestamptz,
    v_count;
end;
$function$;

create or replace function public.consume_rate_limit(
  p_scope text,
  p_key_hash text,
  p_max_attempts integer,
  p_window_seconds integer,
  p_block_seconds integer
)
returns table (
  allowed boolean,
  retry_after_seconds integer,
  blocked_until timestamptz,
  attempt_count integer
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_row public.auth_attempts%rowtype;
  v_now timestamptz := clock_timestamp();
  v_count integer;
  v_window_started_at timestamptz;
  v_blocked_until timestamptz;
begin
  if p_scope is null
     or p_scope !~ '^[a-z0-9:_-]{1,80}$'
     or p_key_hash is null
     or p_key_hash !~ '^[0-9a-f]{64}$'
     or p_max_attempts < 1
     or p_max_attempts > 10000
     or p_window_seconds < 1
     or p_window_seconds > 86400
     or p_block_seconds < 1
     or p_block_seconds > 86400
  then
    raise exception 'INVALID_RATE_LIMIT_POLICY'
      using errcode = '22023';
  end if;

  insert into public.auth_attempts (
    scope,
    key_hash,
    attempt_count,
    window_started_at,
    blocked_until,
    updated_at
  )
  values (
    p_scope,
    p_key_hash,
    0,
    v_now,
    null,
    v_now
  )
  on conflict (scope, key_hash) do nothing;

  select attempt.*
  into v_row
  from public.auth_attempts as attempt
  where attempt.scope = p_scope
    and attempt.key_hash = p_key_hash
  for update;

  if v_row.blocked_until is not null
     and v_row.blocked_until > v_now
  then
    return query
    select
      false,
      greatest(
        1,
        ceil(
          extract(
            epoch from (v_row.blocked_until - v_now)
          )
        )::integer
      ),
      v_row.blocked_until,
      v_row.attempt_count;

    return;
  end if;

  if (
    v_row.blocked_until is not null
    and v_row.blocked_until <= v_now
  ) or (
    v_row.window_started_at
      <= v_now - make_interval(secs => p_window_seconds)
  )
  then
    v_count := 0;
    v_window_started_at := v_now;
    v_blocked_until := null;
  else
    v_count := v_row.attempt_count;
    v_window_started_at := v_row.window_started_at;
    v_blocked_until := null;
  end if;

  if v_count >= p_max_attempts then
    v_blocked_until :=
      v_now + make_interval(secs => p_block_seconds);

    update public.auth_attempts
    set
      blocked_until = v_blocked_until,
      updated_at = v_now
    where scope = p_scope
      and key_hash = p_key_hash;

    return query
    select
      false,
      p_block_seconds,
      v_blocked_until,
      v_count;

    return;
  end if;

  v_count := v_count + 1;

  update public.auth_attempts
  set
    attempt_count = v_count,
    window_started_at = v_window_started_at,
    blocked_until = null,
    updated_at = v_now
  where scope = p_scope
    and key_hash = p_key_hash;

  return query
  select
    true,
    0,
    null::timestamptz,
    v_count;
end;
$function$;

create or replace function public.clear_rate_limit(
  p_scope text,
  p_key_hash text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if p_scope is null
     or p_scope !~ '^[a-z0-9:_-]{1,80}$'
     or p_key_hash is null
     or p_key_hash !~ '^[0-9a-f]{64}$'
  then
    raise exception 'INVALID_RATE_LIMIT_KEY'
      using errcode = '22023';
  end if;

  delete from public.auth_attempts
  where scope = p_scope
    and key_hash = p_key_hash;
end;
$function$;

comment on table public.auth_attempts is
  'Private server-side rate-limit state. Keys are SHA-256 hashes; raw IP, email and house slug values are not stored.';

comment on function public.get_rate_limit_state(text, text) is
  'S1.T5 service-role-only rate-limit preflight check.';

comment on function public.record_rate_limit_failure(
  text,
  text,
  integer,
  integer,
  integer
) is
  'S1.T5 service-role-only atomic failed-auth counter and lockout.';

comment on function public.consume_rate_limit(
  text,
  text,
  integer,
  integer,
  integer
) is
  'S1.T5 service-role-only atomic fixed-window request limiter.';

comment on function public.clear_rate_limit(text, text) is
  'S1.T5 service-role-only reset after successful authentication.';

revoke all
  on function public.get_rate_limit_state(text, text)
  from public, anon, authenticated;

revoke all
  on function public.record_rate_limit_failure(
    text,
    text,
    integer,
    integer,
    integer
  )
  from public, anon, authenticated;

revoke all
  on function public.consume_rate_limit(
    text,
    text,
    integer,
    integer,
    integer
  )
  from public, anon, authenticated;

revoke all
  on function public.clear_rate_limit(text, text)
  from public, anon, authenticated;

grant execute
  on function public.get_rate_limit_state(text, text)
  to service_role;

grant execute
  on function public.record_rate_limit_failure(
    text,
    text,
    integer,
    integer,
    integer
  )
  to service_role;

grant execute
  on function public.consume_rate_limit(
    text,
    text,
    integer,
    integer,
    integer
  )
  to service_role;

grant execute
  on function public.clear_rate_limit(text, text)
  to service_role;

commit;
