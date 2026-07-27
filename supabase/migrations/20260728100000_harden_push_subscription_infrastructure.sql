alter table public.push_subscriptions
  add column if not exists failure_count integer not null default 0;

alter table public.push_subscriptions
  add column if not exists endpoint_hash text generated always as (md5(endpoint)) stored;

alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_failure_count_check;

alter table public.push_subscriptions
  add constraint push_subscriptions_failure_count_check
  check (failure_count >= 0);

alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_endpoint_hash_not_blank;

alter table public.push_subscriptions
  add constraint push_subscriptions_endpoint_hash_not_blank
  check (length(trim(endpoint_hash)) > 0);

create index if not exists push_subscriptions_endpoint_hash_idx
  on public.push_subscriptions (endpoint_hash);

create index if not exists push_subscriptions_active_failure_idx
  on public.push_subscriptions (is_active, failure_count);
