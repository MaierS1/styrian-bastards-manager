alter table public.notification_logs
  add column if not exists attempt_count integer not null default 1,
  add column if not exists last_attempt_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notification_logs_attempt_count_check'
      and conrelid = 'public.notification_logs'::regclass
  ) then
    alter table public.notification_logs
      add constraint notification_logs_attempt_count_check
      check (attempt_count > 0);
  end if;
end;
$$;

drop index if exists public.notification_logs_job_channel_auth_uidx;
drop index if exists public.notification_logs_job_channel_member_uidx;

create unique index if not exists notification_logs_delivered_job_channel_auth_uidx
  on public.notification_logs (job_id, channel, auth_user_id)
  where job_id is not null
    and auth_user_id is not null
    and status = 'delivered';

create unique index if not exists notification_logs_delivered_job_channel_member_uidx
  on public.notification_logs (job_id, channel, member_id)
  where job_id is not null
    and auth_user_id is null
    and member_id is not null
    and status = 'delivered';

create index if not exists notification_logs_retry_idx
  on public.notification_logs (channel, status, last_attempt_at desc)
  where status = 'failed';
