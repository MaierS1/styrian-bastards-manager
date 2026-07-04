create table if not exists public.backup_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null default 'manual' check (job_type in ('manual', 'pre_restore')),
  status text not null default 'running' check (status in ('running', 'success', 'failed')),
  file_name text,
  storage_bucket text not null default 'backups',
  storage_path text,
  backup_version text,
  asset_manifest_version integer,
  tables_count integer,
  total_records integer,
  asset_count integer,
  file_size bigint,
  includes_asset_manifest boolean not null default false,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.restore_jobs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'running' check (status in ('running', 'success', 'failed', 'aborted')),
  backup_job_id uuid references public.backup_jobs(id) on delete set null,
  pre_restore_backup_job_id uuid references public.backup_jobs(id) on delete restrict,
  file_name text,
  restore_mode text not null default 'additive_only',
  preview jsonb not null default '{}'::jsonb,
  imported_summary jsonb not null default '[]'::jsonb,
  skipped_summary jsonb not null default '[]'::jsonb,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.backup_logs (
  id uuid primary key default gen_random_uuid(),
  backup_job_id uuid references public.backup_jobs(id) on delete cascade,
  restore_job_id uuid references public.restore_jobs(id) on delete cascade,
  level text not null default 'info' check (level in ('info', 'warning', 'error')),
  message text not null,
  details jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint backup_logs_has_job check (backup_job_id is not null or restore_job_id is not null)
);

create index if not exists backup_jobs_created_at_idx on public.backup_jobs (created_at desc);
create index if not exists backup_jobs_job_type_idx on public.backup_jobs (job_type);
create index if not exists restore_jobs_created_at_idx on public.restore_jobs (created_at desc);
create index if not exists backup_logs_backup_job_id_idx on public.backup_logs (backup_job_id);
create index if not exists backup_logs_restore_job_id_idx on public.backup_logs (restore_job_id);

alter table public.backup_jobs enable row level security;
alter table public.restore_jobs enable row level security;
alter table public.backup_logs enable row level security;

drop policy if exists "backup users can read backup jobs" on public.backup_jobs;
create policy "backup users can read backup jobs"
  on public.backup_jobs for select
  to authenticated
  using (public.has_app_permission('backup', 'view'));

drop policy if exists "backup users can create backup jobs" on public.backup_jobs;
create policy "backup users can create backup jobs"
  on public.backup_jobs for insert
  to authenticated
  with check (
    public.has_app_permission('backup', 'create')
    and created_by = auth.uid()
  );

drop policy if exists "backup users can update own backup jobs" on public.backup_jobs;
create policy "backup users can update own backup jobs"
  on public.backup_jobs for update
  to authenticated
  using (
    public.has_app_permission('backup', 'create')
    and created_by = auth.uid()
  )
  with check (
    public.has_app_permission('backup', 'create')
    and created_by = auth.uid()
  );

drop policy if exists "backup users can read restore jobs" on public.restore_jobs;
create policy "backup users can read restore jobs"
  on public.restore_jobs for select
  to authenticated
  using (public.has_app_permission('backup', 'view'));

drop policy if exists "backup users can create restore jobs" on public.restore_jobs;
create policy "backup users can create restore jobs"
  on public.restore_jobs for insert
  to authenticated
  with check (
    public.has_app_permission('backup', 'delete')
    and created_by = auth.uid()
    and restore_mode = 'additive_only'
    and pre_restore_backup_job_id is not null
  );

drop policy if exists "backup users can update own restore jobs" on public.restore_jobs;
create policy "backup users can update own restore jobs"
  on public.restore_jobs for update
  to authenticated
  using (
    public.has_app_permission('backup', 'delete')
    and created_by = auth.uid()
  )
  with check (
    public.has_app_permission('backup', 'delete')
    and created_by = auth.uid()
    and restore_mode = 'additive_only'
  );

drop policy if exists "backup users can read backup logs" on public.backup_logs;
create policy "backup users can read backup logs"
  on public.backup_logs for select
  to authenticated
  using (public.has_app_permission('backup', 'view'));

drop policy if exists "backup users can create backup logs" on public.backup_logs;
create policy "backup users can create backup logs"
  on public.backup_logs for insert
  to authenticated
  with check (
    (
      public.has_app_permission('backup', 'create')
      or public.has_app_permission('backup', 'delete')
    )
    and created_by = auth.uid()
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'backups',
  'backups',
  false,
  52428800,
  array['application/json', 'application/octet-stream']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "backup users can read backup files" on storage.objects;
create policy "backup users can read backup files"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'backups'
    and public.has_app_permission('backup', 'view')
  );

drop policy if exists "backup users can upload backup files" on storage.objects;
create policy "backup users can upload backup files"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'backups'
    and public.has_app_permission('backup', 'create')
    and (
      name like auth.uid()::text || '/manual/%'
      or name like auth.uid()::text || '/pre_restore/%'
    )
  );

drop policy if exists "backup users can update own backup files" on storage.objects;
create policy "backup users can update own backup files"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'backups'
    and public.has_app_permission('backup', 'create')
    and (
      name like auth.uid()::text || '/manual/%'
      or name like auth.uid()::text || '/pre_restore/%'
    )
  )
  with check (
    bucket_id = 'backups'
    and public.has_app_permission('backup', 'create')
    and (
      name like auth.uid()::text || '/manual/%'
      or name like auth.uid()::text || '/pre_restore/%'
    )
  );

drop policy if exists "backup admins can delete backup files" on storage.objects;
create policy "backup admins can delete backup files"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'backups'
    and public.has_app_permission('backup', 'delete')
  );
