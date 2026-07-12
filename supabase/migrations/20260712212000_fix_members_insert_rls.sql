drop policy if exists "members insert requires create permission" on public.members;

create policy "members insert requires create permission"
  on public.members
  for insert
  to authenticated
  with check (public.has_app_permission('mitglieder', 'create'));
