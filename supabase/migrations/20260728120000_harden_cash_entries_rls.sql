alter table public.cash_entries enable row level security;

revoke all on table public.cash_entries from anon;
revoke all on table public.cash_entries from authenticated;

grant select, insert, update, delete on table public.cash_entries to authenticated;

drop policy if exists "cash users can read cash entries" on public.cash_entries;
create policy "cash users can read cash entries"
  on public.cash_entries
  for select
  to authenticated
  using (
    public.has_app_permission('kassa', 'view')
  );

drop policy if exists "cash editors can create cash entries" on public.cash_entries;
create policy "cash editors can create cash entries"
  on public.cash_entries
  for insert
  to authenticated
  with check (
    public.has_app_permission('kassa', 'create')
    or public.has_app_permission('kassa', 'edit')
  );

drop policy if exists "cash editors can update cash entries" on public.cash_entries;
create policy "cash editors can update cash entries"
  on public.cash_entries
  for update
  to authenticated
  using (
    public.has_app_permission('kassa', 'edit')
  )
  with check (
    public.has_app_permission('kassa', 'edit')
  );

drop policy if exists "cash deleters can delete cash entries" on public.cash_entries;
create policy "cash deleters can delete cash entries"
  on public.cash_entries
  for delete
  to authenticated
  using (
    public.has_app_permission('kassa', 'delete')
  );
