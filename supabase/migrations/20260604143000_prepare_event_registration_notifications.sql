alter table public.event_registrations
  add column if not exists confirmation_sent_at timestamptz,
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists notification_status text,
  add column if not exists notification_error text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'event_registrations_notification_status_check'
      and conrelid = 'public.event_registrations'::regclass
  ) then
    alter table public.event_registrations
      add constraint event_registrations_notification_status_check
      check (
        notification_status is null
        or notification_status in ('pending', 'sent', 'error')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'event_registrations_notification_error_not_blank'
      and conrelid = 'public.event_registrations'::regclass
  ) then
    alter table public.event_registrations
      add constraint event_registrations_notification_error_not_blank
      check (notification_error is null or length(trim(notification_error)) > 0);
  end if;
end;
$$;
