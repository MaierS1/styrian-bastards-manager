alter table public.notification_logs
  add column if not exists event_registration_id uuid references public.event_registrations(id) on delete set null;

create index if not exists notification_logs_event_registration_created_idx
  on public.notification_logs (event_registration_id, created_at desc)
  where event_registration_id is not null;

create unique index if not exists notification_logs_delivered_job_channel_event_registration_uidx
  on public.notification_logs (job_id, channel, event_registration_id)
  where job_id is not null
    and event_registration_id is not null
    and auth_user_id is null
    and member_id is null
    and status = 'delivered';
