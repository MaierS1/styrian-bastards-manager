alter table public.notification_jobs
  add column if not exists idempotency_key text,
  add column if not exists priority text not null default 'normal',
  add column if not exists source_module text,
  add column if not exists source_entity_type text,
  add column if not exists source_entity_id text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notification_jobs_priority_check'
      and conrelid = 'public.notification_jobs'::regclass
  ) then
    alter table public.notification_jobs
      add constraint notification_jobs_priority_check
      check (priority in ('low', 'normal', 'high', 'critical'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'notification_jobs_idempotency_key_not_blank'
      and conrelid = 'public.notification_jobs'::regclass
  ) then
    alter table public.notification_jobs
      add constraint notification_jobs_idempotency_key_not_blank
      check (idempotency_key is null or length(trim(idempotency_key)) > 0);
  end if;
end;
$$;

create unique index if not exists notification_jobs_idempotency_key_uidx
  on public.notification_jobs (idempotency_key)
  where idempotency_key is not null;

create index if not exists notification_jobs_source_idx
  on public.notification_jobs (source_module, source_entity_type, source_entity_id);

create unique index if not exists in_app_notifications_job_auth_uidx
  on public.in_app_notifications (job_id, auth_user_id)
  where job_id is not null and auth_user_id is not null;

create unique index if not exists in_app_notifications_job_member_uidx
  on public.in_app_notifications (job_id, member_id)
  where job_id is not null and auth_user_id is null and member_id is not null;

create unique index if not exists notification_logs_job_channel_auth_uidx
  on public.notification_logs (job_id, channel, auth_user_id)
  where job_id is not null and auth_user_id is not null;

create unique index if not exists notification_logs_job_channel_member_uidx
  on public.notification_logs (job_id, channel, member_id)
  where job_id is not null and auth_user_id is null and member_id is not null;
