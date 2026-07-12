drop policy if exists "members managers can read members" on public.members;

create policy "members managers can read members"
  on public.members
  for select
  to authenticated
  using (public.has_app_permission('mitglieder', 'view'));

drop policy if exists "members update requires edit permission" on public.members;

create policy "members update requires edit permission"
  on public.members
  for update
  to authenticated
  using (public.has_app_permission('mitglieder', 'edit'))
  with check (public.has_app_permission('mitglieder', 'edit'));
