# Plan automation — P11 operational contract

## Scope

P11 repairs and completes P05 plan automation for published house tasks.

Lifecycle:

`planned -> in_progress -> completed -> archived`

Automation remains interval-based and uses calendar-day UTC arithmetic.

## Schedule lifecycle

Configuration:

- `automation_enabled`
- `automation_interval_days`
- `automation_anchor_at`
- `automation_next_due_at`
- `automation_paused_at`

### Draft

Draft tasks may store automation configuration, but must not have a live
schedule:

- `automation_anchor_at = null`
- `automation_next_due_at = null`
- `automation_paused_at = null`

### Publish

For an enabled automation:

- anchor = publication time
- next due = publication time + N calendar days

### Published task edit

Ordinary edits preserve the existing schedule.

A new full interval starts only when:

1. automation changes from disabled to enabled;
2. interval length changes;
3. published enabled automation has a missing due date and is not paused.

Then:

- anchor = current update time
- next due = current update time + N calendar days

### Disable

Disabling automation clears anchor, next due and pause timestamp.

### Pause

Pause keeps automation enabled but clears anchor and next due.

Ordinary edits must preserve the paused state.

### Resume

Resume starts a new full interval from resume time.

---

## Manual lifecycle transitions

Manual status changes are executed by:

`transition_house_plan_status_manual`

The database RPC owns:

- admin authorization;
- house boundary;
- optimistic locking;
- task status mutation;
- automation interval reset when applicable;
- immutable manual transition journal.

Application code must not call `resetPlanAutomationInterval()` additionally.

The existing Plan UI exposes the manual status action.

---

## Automatic executor

Executor:

`public.run_house_plan_automation(p_now, p_batch_size)`

Security:

- `SECURITY DEFINER`
- fixed `search_path = public, pg_temp`
- executable by `service_role`
- batch range `1..500`

Concurrency:

- deterministic due-date ordering
- `FOR UPDATE SKIP LOCKED`

Catch-up uses the stored due timestamp and is drift-free.

A sufficiently overdue task can therefore transition several times in a
single executor run until caught up or archived.

Authoritative automatic journal:

`house_plan_status_transitions`

Automatic rows contain:

- `kind = automatic`
- `actor_admin_id = null`
- original due timestamp
- configured interval

Automatic transition idempotency is based on:

`task_id + from_status + to_status + due_at`

---

## Executor response

Existing fields remain unchanged:

- `processedTasks`
- `transitions`
- `archivedTasks`
- `executedAt`

P11 additionally returns:

`transitionDetails`

Each detail contains:

- `taskId`
- `houseId`
- `fromStatus`
- `toStatus`
- `dueAt`
- `executedAt`

---

## Visible history

After successful SQL transitions the protected runtime route also writes
visible rows to:

`house_content_history`

Actor:

`Автоматика плану`

Important fields:

- `actor_admin_id = null`
- `entity_type = house_plan_task`
- `entity_id = task id`
- `metadata.source = plan_automation`
- `fromStatus`
- `toStatus`
- `dueAt`

The immutable status-transition table remains authoritative.

Visible-history persistence is best-effort. A history insert error is logged
but does not convert an already committed lifecycle transition into an
executor failure.

---

## Public cache invalidation

After automatic transitions the route resolves affected house slugs and
revalidates:

`/house/{slug}/plan`

---

## Existing data backfill

Migration:

`202608190001_backfill_plan_automation_schedule.sql`

repairs only tasks which are:

- automation enabled;
- published;
- not paused;
- interval configured;
- missing `automation_next_due_at`;
- not archived.

Repair semantics:

- `automation_anchor_at = now()`
- `automation_next_due_at = now() + configured interval`
- `lock_version = lock_version + 1`

Rows with an existing schedule are untouched.

The migration is idempotent.

---

## Executor extension migration

Migration:

`202608190002_extend_plan_automation_executor_details.sql`

preserves existing executor behavior and response fields and adds
`transitionDetails`.

No plan-task schema change is introduced.

---

## Scheduler

Preferred P05/P11 cadence is hourly.

P11 production infrastructure verification found:

- Supabase Production `pg_cron`: not installed;
- Vercel project plan: Hobby.

Therefore the current supported production fallback is Vercel Cron once per
day.

Current schedule:

`10 0 * * *`

Protected route:

`/api/internal/plan-automation/run`

The daily cadence is an infrastructure limitation, not a change to lifecycle
business semantics.

When production infrastructure supports hourly execution, scheduler cadence
can be upgraded without changing executor business logic.

---

## Cron authentication

The protected route requires:

`Authorization: Bearer <CRON_SECRET>`

Secret comparison uses `timingSafeEqual`.

`CRON_SECRET` is configured as a Sensitive Production environment variable in
Vercel.

The secret must never be committed to Git, documentation or logs.

A new production deployment is required for newly added environment variables
to become active.

---

## Production verification SQL

### Missing automation schedules

```sql
select
  id,
  house_id,
  title,
  task_status,
  lifecycle_status,
  automation_enabled,
  automation_interval_days,
  automation_paused_at,
  automation_anchor_at,
  automation_next_due_at
from public.house_plan_tasks
where automation_enabled = true
  and lifecycle_status = 'published'
  and automation_paused_at is null
  and automation_interval_days is not null
  and automation_next_due_at is null
  and task_status <> 'archived'
order by house_id, id;
```

Expected after backfill:

`0 rows`

### Recent automatic transitions

```sql
select
  task_id,
  house_id,
  from_status,
  to_status,
  due_at,
  executed_at,
  kind,
  actor_admin_id,
  configured_interval_days
from public.house_plan_status_transitions
where kind = 'automatic'
order by executed_at desc
limit 100;
```

### Visible automation history

```sql
select
  occurred_at,
  house_id,
  entity_id,
  actor_admin_id,
  actor_name,
  action,
  description,
  metadata
from public.house_content_history
where metadata ->> 'source' = 'plan_automation'
order by occurred_at desc
limit 100;
```

---

## Manual executor smoke

Run only from a trusted operator environment:

```bash
curl --fail-with-body \
  -H "Authorization: Bearer $CRON_SECRET" \
  "https://<production-host>/api/internal/plan-automation/run"
```

Never paste the real secret into documentation, source code or screenshots.

---

## Emergency stop

Preferred operational stop:

1. disable/remove Plan Automation Cron in Vercel;
2. stop manual calls to the protected route.

Individual tasks can be paused using the existing Plan automation controls.

Rotating/removing `CRON_SECRET` is an additional authentication stop, but an
environment change requires a new deployment.

Do not perform a global direct-SQL disable unless a separate incident
procedure explicitly requires it.

---

## Production rollout order

1. Confirm production branch/database state.
2. Apply `202608190001_backfill_plan_automation_schedule.sql`.
3. Apply `202608190002_extend_plan_automation_executor_details.sql`.
4. Release P11 application code.
5. Confirm the new deployment has `CRON_SECRET`.
6. Confirm unauthenticated cron request returns `401`.
7. Perform one authenticated executor smoke.
8. Verify automatic journal/history if transitions occurred.
9. Verify affected public Plan pages.
10. Verify Vercel Cron registration with `10 0 * * *`.

No destructive database reset is part of the P11 release.

---

## P11 closure evidence

Before release P11 established:

- production diagnostic task had zero leftover transition journal rows;
- published-update schedule behavior has unit coverage;
- real local PostgreSQL integration covers publish, edit, enable, interval
  change, pause, disable, missing-due repair, catch-up and idempotency;
- T6 backfill produced `UPDATE 1`, then `UPDATE 0` on repeated execution in a
  rollback transaction;
- T7 executor details were verified against real local PostgreSQL;
- manual transition UI and immutable manual journal remain present;
- dead application-side manual interval reset was removed;
- automatic visible history and public Plan revalidation have tests;
- production `pg_cron` is absent;
- production Vercel `CRON_SECRET` exists as a Sensitive variable;
- Vercel Hobby daily scheduler fallback is explicitly documented.
