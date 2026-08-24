begin;

grant select, insert on table public.house_content_history to authenticated;
grant select on table public.house_debtor_month_snapshots, public.house_debtor_month_rows, public.house_debtor_series to authenticated;
grant select, insert, update, delete on table public.house_debtors_items, public.house_debtors_settings, public.platform_tasks, public.platform_task_houses, public.platform_task_comments, public.platform_task_events, public.platform_task_links to authenticated;

drop policy if exists "Admins insert history" on public.house_content_history;
drop policy if exists "Admins read history" on public.house_content_history;
create policy p09_house_content_history_admin_select on public.house_content_history for select to authenticated using (public.admin_has_house_access(house_id));
create policy p09_house_content_history_admin_insert on public.house_content_history for insert to authenticated with check (public.admin_has_house_access(house_id) and (actor_admin_id is null or actor_admin_id = auth.uid()));

drop policy if exists house_debtor_month_snapshots_admin_read on public.house_debtor_month_snapshots;
create policy house_debtor_month_snapshots_admin_read on public.house_debtor_month_snapshots for select to authenticated using (public.admin_has_house_access(house_id));
drop policy if exists house_debtor_month_rows_admin_read on public.house_debtor_month_rows;
create policy house_debtor_month_rows_admin_read on public.house_debtor_month_rows for select to authenticated using (public.admin_has_house_access(house_id));
drop policy if exists house_debtor_series_admin_read on public.house_debtor_series;
create policy house_debtor_series_admin_read on public.house_debtor_series for select to authenticated using (public.admin_has_house_access(house_id));

drop policy if exists "Authenticated admins can manage house debtors items" on public.house_debtors_items;
create policy p09_house_debtors_items_admin_scoped on public.house_debtors_items for all to authenticated using (public.admin_has_house_access(house_id)) with check (public.admin_has_house_access(house_id));
drop policy if exists "Authenticated admins can manage house debtors settings" on public.house_debtors_settings;
create policy p09_house_debtors_settings_admin_scoped on public.house_debtors_settings for all to authenticated using (public.admin_has_house_access(house_id)) with check (public.admin_has_house_access(house_id));

create or replace function public.admin_has_platform_task_access(target_task_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.platform_tasks task
    where task.id = target_task_id
      and (
        public.admin_is_superadmin()
        or (
          not exists (select 1 from public.platform_task_houses th where th.task_id = task.id)
          and (
            task.created_by = auth.uid()
            or (public.admin_current_membership_city() is null and public.get_my_admin_role() is not null)
          )
        )
        or (
          exists (select 1 from public.platform_task_houses th where th.task_id = task.id)
          and not exists (
            select 1 from public.platform_task_houses th
            where th.task_id = task.id
              and not public.admin_has_house_access(th.house_id)
          )
        )
      )
  );
$$;
revoke all on function public.admin_has_platform_task_access(uuid) from public, anon;
grant execute on function public.admin_has_platform_task_access(uuid) to authenticated, service_role;

drop policy if exists platform_tasks_admin_select on public.platform_tasks;
drop policy if exists platform_tasks_admin_insert on public.platform_tasks;
drop policy if exists platform_tasks_admin_update on public.platform_tasks;
drop policy if exists platform_tasks_admin_delete on public.platform_tasks;
create policy platform_tasks_admin_select on public.platform_tasks for select to authenticated using (public.admin_has_platform_task_access(id));
create policy platform_tasks_admin_insert on public.platform_tasks for insert to authenticated with check (public.get_my_admin_role() is not null and (created_by is null or created_by = auth.uid()));
create policy platform_tasks_admin_update on public.platform_tasks for update to authenticated using (public.admin_has_platform_task_access(id)) with check (public.admin_has_platform_task_access(id));
create policy platform_tasks_admin_delete on public.platform_tasks for delete to authenticated using (public.admin_has_platform_task_access(id));

drop policy if exists platform_task_houses_admin_select on public.platform_task_houses;
drop policy if exists platform_task_houses_admin_insert on public.platform_task_houses;
drop policy if exists platform_task_houses_admin_update on public.platform_task_houses;
drop policy if exists platform_task_houses_admin_delete on public.platform_task_houses;
create policy platform_task_houses_admin_select on public.platform_task_houses for select to authenticated using (public.admin_has_platform_task_access(task_id) and public.admin_has_house_access(house_id));
create policy platform_task_houses_admin_insert on public.platform_task_houses for insert to authenticated with check (public.admin_has_house_access(house_id) and public.admin_has_platform_task_access(task_id));
create policy platform_task_houses_admin_update on public.platform_task_houses for update to authenticated using (public.admin_has_platform_task_access(task_id) and public.admin_has_house_access(house_id)) with check (public.admin_has_platform_task_access(task_id) and public.admin_has_house_access(house_id));
create policy platform_task_houses_admin_delete on public.platform_task_houses for delete to authenticated using (public.admin_has_platform_task_access(task_id) and public.admin_has_house_access(house_id));

drop policy if exists platform_task_comments_admin_select on public.platform_task_comments;
drop policy if exists platform_task_comments_admin_insert on public.platform_task_comments;
drop policy if exists platform_task_comments_admin_update on public.platform_task_comments;
drop policy if exists platform_task_comments_admin_delete on public.platform_task_comments;
create policy platform_task_comments_admin_select on public.platform_task_comments for select to authenticated using (public.admin_has_platform_task_access(task_id));
create policy platform_task_comments_admin_insert on public.platform_task_comments for insert to authenticated with check (public.admin_has_platform_task_access(task_id) and (author_id is null or author_id = auth.uid()));
create policy platform_task_comments_admin_update on public.platform_task_comments for update to authenticated using (public.admin_has_platform_task_access(task_id)) with check (public.admin_has_platform_task_access(task_id));
create policy platform_task_comments_admin_delete on public.platform_task_comments for delete to authenticated using (public.admin_has_platform_task_access(task_id));

drop policy if exists platform_task_events_admin_select on public.platform_task_events;
drop policy if exists platform_task_events_admin_insert on public.platform_task_events;
drop policy if exists platform_task_events_admin_update on public.platform_task_events;
drop policy if exists platform_task_events_admin_delete on public.platform_task_events;
create policy platform_task_events_admin_select on public.platform_task_events for select to authenticated using (public.admin_has_platform_task_access(task_id));
create policy platform_task_events_admin_insert on public.platform_task_events for insert to authenticated with check (public.admin_has_platform_task_access(task_id) and (actor_id is null or actor_id = auth.uid()));
create policy platform_task_events_admin_update on public.platform_task_events for update to authenticated using (public.admin_has_platform_task_access(task_id)) with check (public.admin_has_platform_task_access(task_id));
create policy platform_task_events_admin_delete on public.platform_task_events for delete to authenticated using (public.admin_has_platform_task_access(task_id));

drop policy if exists platform_task_links_admin_select on public.platform_task_links;
drop policy if exists platform_task_links_admin_insert on public.platform_task_links;
drop policy if exists platform_task_links_admin_update on public.platform_task_links;
drop policy if exists platform_task_links_admin_delete on public.platform_task_links;
create policy platform_task_links_admin_select on public.platform_task_links for select to authenticated using (public.admin_has_platform_task_access(task_id));
create policy platform_task_links_admin_insert on public.platform_task_links for insert to authenticated with check (public.admin_has_platform_task_access(task_id));
create policy platform_task_links_admin_update on public.platform_task_links for update to authenticated using (public.admin_has_platform_task_access(task_id)) with check (public.admin_has_platform_task_access(task_id));
create policy platform_task_links_admin_delete on public.platform_task_links for delete to authenticated using (public.admin_has_platform_task_access(task_id));

create or replace function public.publish_house_debtors_draft(p_house_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() = 'service_role' then null;
  elsif auth.role() = 'authenticated' and public.admin_has_house_access(p_house_id) then null;
  else raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.house_debtors_items set lifecycle_status='archived', updated_at=pg_catalog.now() where house_id=p_house_id and lifecycle_status='published';
  update public.house_debtors_items set lifecycle_status='published', updated_at=pg_catalog.now() where house_id=p_house_id and lifecycle_status='draft';
end;
$$;
revoke all on function public.publish_house_debtors_draft(uuid) from public, anon;
grant execute on function public.publish_house_debtors_draft(uuid) to authenticated, service_role;

create or replace function public.cleanup_platform_tasks()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if session_user = 'postgres' or auth.role() = 'service_role' or (auth.role() = 'authenticated' and public.admin_is_superadmin()) then null;
  else raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.platform_tasks
  set archived_at=pg_catalog.timezone('utc',pg_catalog.now()), updated_at=pg_catalog.timezone('utc',pg_catalog.now())
  where status='done' and archived_at is null and completed_at is not null and completed_at < pg_catalog.timezone('utc',pg_catalog.now()) - interval '7 days';
  delete from public.platform_tasks
  where archived_at is not null and archived_at < pg_catalog.timezone('utc',pg_catalog.now()) - interval '30 days';
end;
$$;
revoke all on function public.cleanup_platform_tasks() from public, anon;
grant execute on function public.cleanup_platform_tasks() to authenticated, service_role;

commit;
