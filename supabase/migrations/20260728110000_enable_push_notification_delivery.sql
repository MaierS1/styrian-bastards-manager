create unique index if not exists notification_logs_sent_job_push_subscription_uidx
  on public.notification_logs (job_id, subscription_id)
  where job_id is not null
    and channel = 'push'
    and subscription_id is not null
    and status = 'sent';

create index if not exists notification_logs_push_endpoint_hash_idx
  on public.notification_logs (endpoint_hash, created_at desc)
  where channel = 'push'
    and endpoint_hash is not null;

update public.notification_templates
set
  default_channels = case
    when default_channels @> array['push']::text[] then default_channels
    else default_channels || array['push']::text[]
  end,
  updated_at = now()
where not default_channels @> array['push']::text[];
