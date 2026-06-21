drop policy if exists "authenticated users can insert events" on public.events;
create policy "authenticated users can insert events"
  on public.events
  for insert
  to authenticated
  with check (public.can_manage_events());

drop policy if exists "authenticated users can update events" on public.events;
create policy "authenticated users can update events"
  on public.events
  for update
  to authenticated
  using (public.can_manage_events())
  with check (public.can_manage_events());

drop policy if exists "authenticated users can delete events" on public.events;
create policy "authenticated users can delete events"
  on public.events
  for delete
  to authenticated
  using (public.is_admin_user());
