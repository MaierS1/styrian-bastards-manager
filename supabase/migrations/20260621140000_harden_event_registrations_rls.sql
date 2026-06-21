drop policy if exists "authenticated users can read event registrations" on public.event_registrations;
create policy "members can read own event registrations"
  on public.event_registrations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.members
      where members.auth_user_id = auth.uid()
        and members.email = public.event_registrations.email
    )
  );

create policy "event managers can read event registrations"
  on public.event_registrations
  for select
  to authenticated
  using (public.can_manage_events() or public.is_admin_user());

drop policy if exists "authenticated users can insert event registrations" on public.event_registrations;
create policy "authenticated users can insert event registrations"
  on public.event_registrations
  for insert
  to authenticated
  with check (true);

drop policy if exists "authenticated users can update event registrations" on public.event_registrations;
create policy "event managers can update event registrations"
  on public.event_registrations
  for update
  to authenticated
  using (public.can_manage_events() or public.is_admin_user())
  with check (public.can_manage_events() or public.is_admin_user());

drop policy if exists "authenticated users can delete event registrations" on public.event_registrations;
create policy "admins can delete event registrations"
  on public.event_registrations
  for delete
  to authenticated
  using (public.is_admin_user());
