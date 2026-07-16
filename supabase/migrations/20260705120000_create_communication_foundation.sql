create table if not exists public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  category text not null,
  title text not null,
  body text,
  template_key text,
  channels text[] not null default array['in_app']::text[],
  target_type text not null,
  target_payload jsonb not null default '{}'::jsonb,
  source_table text,
  source_id uuid,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  scheduled_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_by_member_id uuid references public.members(id) on delete set null,
  recipient_count integer not null default 0,
  success_count integer not null default 0,
  failure_count integer not null default 0,
  skipped_count integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint notification_jobs_type_not_blank check (length(trim(type)) > 0),
  constraint notification_jobs_category_check check (
    category in ('event', 'membership_fee', 'invoice', 'document', 'club_news', 'board', 'system', 'backup')
  ),
  constraint notification_jobs_title_not_blank check (length(trim(title)) > 0),
  constraint notification_jobs_channels_not_empty check (cardinality(channels) > 0),
  constraint notification_jobs_channels_check check (
    channels <@ array['push', 'email', 'in_app']::text[]
  ),
  constraint notification_jobs_target_type_not_blank check (length(trim(target_type)) > 0),
  constraint notification_jobs_status_check check (
    status in ('draft', 'queued', 'processing', 'sent', 'partial', 'failed', 'cancelled')
  ),
  constraint notification_jobs_counts_check check (
    recipient_count >= 0
    and success_count >= 0
    and failure_count >= 0
    and skipped_count >= 0
  ),
  constraint notification_jobs_error_not_blank check (error is null or length(trim(error)) > 0)
);
create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  label text not null,
  description text,
  category text not null,
  default_channels text[] not null default array['in_app']::text[],
  subject_template text,
  title_template text not null,
  body_template text,
  html_template text,
  variables_schema jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint notification_templates_key_not_blank check (length(trim(key)) > 0),
  constraint notification_templates_label_not_blank check (length(trim(label)) > 0),
  constraint notification_templates_category_check check (
    category in ('event', 'membership_fee', 'invoice', 'document', 'club_news', 'board', 'system', 'backup')
  ),
  constraint notification_templates_default_channels_not_empty check (cardinality(default_channels) > 0),
  constraint notification_templates_default_channels_check check (
    default_channels <@ array['push', 'email', 'in_app']::text[]
  ),
  constraint notification_templates_title_not_blank check (length(trim(title_template)) > 0)
);
create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete cascade,
  member_id uuid references public.members(id) on delete cascade,
  notification_type text not null,
  category text not null,
  channel text not null,
  enabled boolean not null default true,
  required boolean not null default false,
  opted_in_at timestamptz,
  opted_out_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint notification_preferences_owner_check check (auth_user_id is not null or member_id is not null),
  constraint notification_preferences_type_not_blank check (length(trim(notification_type)) > 0),
  constraint notification_preferences_category_check check (
    category in ('event', 'membership_fee', 'invoice', 'document', 'club_news', 'board', 'system', 'backup')
  ),
  constraint notification_preferences_channel_check check (channel in ('push', 'email', 'in_app')),
  constraint notification_preferences_opt_dates_check check (
    opted_out_at is null or opted_in_at is null or opted_out_at >= opted_in_at
  )
);
create table if not exists public.in_app_notifications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.notification_jobs(id) on delete set null,
  auth_user_id uuid references auth.users(id) on delete cascade,
  member_id uuid references public.members(id) on delete cascade,
  type text not null,
  category text not null,
  title text not null,
  body text,
  url text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint in_app_notifications_owner_check check (auth_user_id is not null or member_id is not null),
  constraint in_app_notifications_type_not_blank check (length(trim(type)) > 0),
  constraint in_app_notifications_category_check check (
    category in ('event', 'membership_fee', 'invoice', 'document', 'club_news', 'board', 'system', 'backup')
  ),
  constraint in_app_notifications_title_not_blank check (length(trim(title)) > 0)
);
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  content_encoding text not null default 'aes128gcm',
  user_agent text,
  platform text,
  device_label text,
  permission text not null default 'granted',
  is_active boolean not null default true,
  opted_in_at timestamptz not null default now(),
  opted_out_at timestamptz,
  last_seen_at timestamptz,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint push_subscriptions_endpoint_not_blank check (length(trim(endpoint)) > 0),
  constraint push_subscriptions_p256dh_not_blank check (length(trim(p256dh)) > 0),
  constraint push_subscriptions_auth_not_blank check (length(trim(auth)) > 0),
  constraint push_subscriptions_permission_check check (permission in ('granted', 'denied', 'default')),
  constraint push_subscriptions_opt_dates_check check (opted_out_at is null or opted_out_at >= opted_in_at),
  constraint push_subscriptions_last_error_not_blank check (last_error is null or length(trim(last_error)) > 0)
);
create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.notification_jobs(id) on delete cascade,
  channel text not null,
  member_id uuid references public.members(id) on delete set null,
  auth_user_id uuid references auth.users(id) on delete set null,
  subscription_id uuid references public.push_subscriptions(id) on delete set null,
  email text,
  endpoint_hash text,
  status text not null,
  http_status integer,
  error_code text,
  error_message text,
  provider_response jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now(),

  constraint notification_logs_channel_check check (channel in ('push', 'email', 'in_app')),
  constraint notification_logs_status_check check (status in ('sent', 'failed', 'skipped', 'read', 'delivered')),
  constraint notification_logs_http_status_check check (http_status is null or (http_status >= 100 and http_status <= 599)),
  constraint notification_logs_endpoint_hash_not_blank check (endpoint_hash is null or length(trim(endpoint_hash)) > 0),
  constraint notification_logs_error_code_not_blank check (error_code is null or length(trim(error_code)) > 0),
  constraint notification_logs_error_message_not_blank check (error_message is null or length(trim(error_message)) > 0)
);
create index if not exists notification_jobs_status_scheduled_at_idx
  on public.notification_jobs (status, scheduled_at);
create index if not exists notification_jobs_created_at_idx
  on public.notification_jobs (created_at desc);
create index if not exists notification_logs_job_id_idx
  on public.notification_logs (job_id);
create index if not exists notification_logs_member_created_at_idx
  on public.notification_logs (member_id, created_at desc);
create index if not exists notification_logs_channel_status_idx
  on public.notification_logs (channel, status);
create unique index if not exists notification_templates_key_uidx
  on public.notification_templates (key);
create unique index if not exists notification_preferences_member_type_channel_uidx
  on public.notification_preferences (member_id, notification_type, channel)
  where member_id is not null;
create unique index if not exists notification_preferences_auth_type_channel_uidx
  on public.notification_preferences (auth_user_id, notification_type, channel)
  where auth_user_id is not null;
create index if not exists in_app_notifications_member_read_created_idx
  on public.in_app_notifications (member_id, read_at, created_at desc);
create index if not exists in_app_notifications_auth_read_created_idx
  on public.in_app_notifications (auth_user_id, read_at, created_at desc);
create index if not exists push_subscriptions_auth_active_idx
  on public.push_subscriptions (auth_user_id, is_active);
create index if not exists push_subscriptions_member_active_idx
  on public.push_subscriptions (member_id, is_active);
create unique index if not exists push_subscriptions_endpoint_uidx
  on public.push_subscriptions (endpoint);
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_notification_jobs_updated_at'
      and tgrelid = 'public.notification_jobs'::regclass
  ) then
    create trigger set_notification_jobs_updated_at
      before update on public.notification_jobs
      for each row
      execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_notification_templates_updated_at'
      and tgrelid = 'public.notification_templates'::regclass
  ) then
    create trigger set_notification_templates_updated_at
      before update on public.notification_templates
      for each row
      execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_notification_preferences_updated_at'
      and tgrelid = 'public.notification_preferences'::regclass
  ) then
    create trigger set_notification_preferences_updated_at
      before update on public.notification_preferences
      for each row
      execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_in_app_notifications_updated_at'
      and tgrelid = 'public.in_app_notifications'::regclass
  ) then
    create trigger set_in_app_notifications_updated_at
      before update on public.in_app_notifications
      for each row
      execute function public.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_push_subscriptions_updated_at'
      and tgrelid = 'public.push_subscriptions'::regclass
  ) then
    create trigger set_push_subscriptions_updated_at
      before update on public.push_subscriptions
      for each row
      execute function public.set_updated_at();
  end if;
end;
$$;
alter table public.notification_jobs enable row level security;
alter table public.notification_logs enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_templates enable row level security;
alter table public.in_app_notifications enable row level security;
alter table public.push_subscriptions enable row level security;
revoke all on table public.notification_jobs from public;
revoke all on table public.notification_logs from public;
revoke all on table public.notification_preferences from public;
revoke all on table public.notification_templates from public;
revoke all on table public.in_app_notifications from public;
revoke all on table public.push_subscriptions from public;
revoke all on table public.notification_jobs from anon;
revoke all on table public.notification_logs from anon;
revoke all on table public.notification_preferences from anon;
revoke all on table public.notification_templates from anon;
revoke all on table public.in_app_notifications from anon;
revoke all on table public.push_subscriptions from anon;
grant select, insert, update, delete on table public.notification_jobs to authenticated;
grant select, insert, update, delete on table public.notification_logs to authenticated;
grant select, insert, update, delete on table public.notification_preferences to authenticated;
grant select, insert, update, delete on table public.notification_templates to authenticated;
grant select, insert, update, delete on table public.in_app_notifications to authenticated;
grant select, insert, update, delete on table public.push_subscriptions to authenticated;
insert into public.permissions (key, module, action, label)
select 'kommunikation.' || action, 'kommunikation', action, label
from (
  values
    ('view', 'Kommunikation anzeigen'),
    ('create', 'Kommunikation erstellen'),
    ('edit', 'Kommunikation bearbeiten und senden'),
    ('delete', 'Kommunikation loeschen')
) as communication_permissions(action, label)
on conflict (key) do update set
  module = excluded.module,
  action = excluded.action,
  label = excluded.label;
insert into public.role_permissions (role_key, permission_key)
select role_key, 'kommunikation.' || action
from (
  values
    ('super_admin', 'view'),
    ('super_admin', 'create'),
    ('super_admin', 'edit'),
    ('super_admin', 'delete'),
    ('administrator', 'view'),
    ('administrator', 'create'),
    ('administrator', 'edit'),
    ('administrator', 'delete'),
    ('vorstand', 'view'),
    ('vorstand', 'create'),
    ('vorstand', 'edit'),
    ('schriftfuehrer', 'view'),
    ('schriftfuehrer', 'create'),
    ('schriftfuehrer', 'edit'),
    ('kassier', 'view'),
    ('kassier', 'create'),
    ('kassier', 'edit')
) as communication_role_permissions(role_key, action)
on conflict do nothing;
create policy "communication viewers can read notification jobs"
  on public.notification_jobs
  for select
  to authenticated
  using (public.has_app_permission('kommunikation', 'view'));
create policy "communication creators can create notification jobs"
  on public.notification_jobs
  for insert
  to authenticated
  with check (public.has_app_permission('kommunikation', 'create'));
create policy "communication editors can update notification jobs"
  on public.notification_jobs
  for update
  to authenticated
  using (public.has_app_permission('kommunikation', 'edit'))
  with check (public.has_app_permission('kommunikation', 'edit'));
create policy "communication deleters can delete notification jobs"
  on public.notification_jobs
  for delete
  to authenticated
  using (public.has_app_permission('kommunikation', 'delete'));
create policy "communication viewers can read notification logs"
  on public.notification_logs
  for select
  to authenticated
  using (public.has_app_permission('kommunikation', 'view'));
create policy "communication deleters can delete notification logs"
  on public.notification_logs
  for delete
  to authenticated
  using (public.has_app_permission('kommunikation', 'delete'));
create policy "members can read own notification preferences"
  on public.notification_preferences
  for select
  to authenticated
  using (
    auth_user_id = auth.uid()
    or exists (
      select 1
      from public.members
      where members.id = notification_preferences.member_id
        and members.auth_user_id = auth.uid()
    )
  );
create policy "members can create own notification preferences"
  on public.notification_preferences
  for insert
  to authenticated
  with check (
    auth_user_id = auth.uid()
    or exists (
      select 1
      from public.members
      where members.id = notification_preferences.member_id
        and members.auth_user_id = auth.uid()
    )
  );
create policy "members can update own notification preferences"
  on public.notification_preferences
  for update
  to authenticated
  using (
    auth_user_id = auth.uid()
    or exists (
      select 1
      from public.members
      where members.id = notification_preferences.member_id
        and members.auth_user_id = auth.uid()
    )
  )
  with check (
    auth_user_id = auth.uid()
    or exists (
      select 1
      from public.members
      where members.id = notification_preferences.member_id
        and members.auth_user_id = auth.uid()
    )
  );
create policy "communication deleters can delete notification preferences"
  on public.notification_preferences
  for delete
  to authenticated
  using (public.has_app_permission('kommunikation', 'delete'));
create policy "communication viewers can read notification templates"
  on public.notification_templates
  for select
  to authenticated
  using (public.has_app_permission('kommunikation', 'view'));
create policy "communication creators can create notification templates"
  on public.notification_templates
  for insert
  to authenticated
  with check (public.has_app_permission('kommunikation', 'create'));
create policy "communication editors can update notification templates"
  on public.notification_templates
  for update
  to authenticated
  using (public.has_app_permission('kommunikation', 'edit'))
  with check (public.has_app_permission('kommunikation', 'edit'));
create policy "communication deleters can delete notification templates"
  on public.notification_templates
  for delete
  to authenticated
  using (public.has_app_permission('kommunikation', 'delete'));
create policy "members can read own in app notifications"
  on public.in_app_notifications
  for select
  to authenticated
  using (
    auth_user_id = auth.uid()
    or exists (
      select 1
      from public.members
      where members.id = in_app_notifications.member_id
        and members.auth_user_id = auth.uid()
    )
  );
create policy "members can update own in app notifications"
  on public.in_app_notifications
  for update
  to authenticated
  using (
    auth_user_id = auth.uid()
    or exists (
      select 1
      from public.members
      where members.id = in_app_notifications.member_id
        and members.auth_user_id = auth.uid()
    )
  )
  with check (
    auth_user_id = auth.uid()
    or exists (
      select 1
      from public.members
      where members.id = in_app_notifications.member_id
        and members.auth_user_id = auth.uid()
    )
  );
create policy "communication deleters can delete in app notifications"
  on public.in_app_notifications
  for delete
  to authenticated
  using (public.has_app_permission('kommunikation', 'delete'));
create policy "members can read own push subscriptions"
  on public.push_subscriptions
  for select
  to authenticated
  using (
    auth_user_id = auth.uid()
    or exists (
      select 1
      from public.members
      where members.id = push_subscriptions.member_id
        and members.auth_user_id = auth.uid()
    )
  );
create policy "members can create own push subscriptions"
  on public.push_subscriptions
  for insert
  to authenticated
  with check (
    auth_user_id = auth.uid()
    and (
      member_id is null
      or exists (
        select 1
        from public.members
        where members.id = push_subscriptions.member_id
          and members.auth_user_id = auth.uid()
      )
    )
  );
create policy "members can update own push subscriptions"
  on public.push_subscriptions
  for update
  to authenticated
  using (
    auth_user_id = auth.uid()
    or exists (
      select 1
      from public.members
      where members.id = push_subscriptions.member_id
        and members.auth_user_id = auth.uid()
    )
  )
  with check (
    auth_user_id = auth.uid()
    and (
      member_id is null
      or exists (
        select 1
        from public.members
        where members.id = push_subscriptions.member_id
          and members.auth_user_id = auth.uid()
      )
    )
  );
create policy "communication deleters can delete push subscriptions"
  on public.push_subscriptions
  for delete
  to authenticated
  using (public.has_app_permission('kommunikation', 'delete'));
