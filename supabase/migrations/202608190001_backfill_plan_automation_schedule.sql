-- P11 T6: repair published automation tasks created before schedule-on-update fix.
-- Idempotent: only rows with missing automation_next_due_at are updated.
-- No schema changes.

update public.house_plan_tasks
set
  automation_anchor_at = now(),
  automation_next_due_at =
    now() + make_interval(days => automation_interval_days),
  updated_at = now(),
  lock_version = lock_version + 1
where automation_enabled = true
  and lifecycle_status = 'published'
  and automation_paused_at is null
  and automation_interval_days is not null
  and automation_next_due_at is null
  and task_status <> 'archived';
