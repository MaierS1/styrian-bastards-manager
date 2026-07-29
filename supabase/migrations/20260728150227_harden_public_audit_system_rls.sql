begin;

-- Audit logs are security-sensitive. Existing frontend audit inserts are
-- preserved only for the current authenticated user; service_role remains
-- unchanged for Edge Functions.
alter table public.audit_logs enable row level security;

drop policy if exists "system users can read audit logs" on public.audit_logs;
drop policy if exists "system users can create audit logs" on public.audit_logs;

revoke all on table public.audit_logs from anon;
revoke all on table public.audit_logs from authenticated;

grant select, insert on table public.audit_logs to authenticated;

create policy "system users can read audit logs"
on public.audit_logs
for select
to authenticated
using (
  public.has_app_permission('systemeinstellungen', 'view')
);

create policy "system users can create audit logs"
on public.audit_logs
for insert
to authenticated
with check (
  user_id = auth.uid()
  or public.has_app_permission('systemeinstellungen', 'create')
  or public.has_app_permission('systemeinstellungen', 'edit')
);

commit;
