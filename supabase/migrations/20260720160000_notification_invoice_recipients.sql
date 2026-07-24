alter table public.notification_logs
  add column if not exists invoice_id uuid references public.invoices(id) on delete set null;

create index if not exists notification_logs_invoice_created_idx
  on public.notification_logs (invoice_id, created_at desc)
  where invoice_id is not null;

create unique index if not exists notification_logs_delivered_job_channel_invoice_uidx
  on public.notification_logs (job_id, channel, invoice_id)
  where job_id is not null
    and invoice_id is not null
    and auth_user_id is null
    and member_id is null
    and event_registration_id is null
    and status = 'delivered';
