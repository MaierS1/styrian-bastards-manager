drop policy if exists "event managers can update event registrations" on public.event_registrations;

create policy "event managers can update event registrations"
  on public.event_registrations
  for update
  to authenticated
  using (public.can_manage_events() or public.is_admin_user())
  with check (
    event_id is not null
    and exists (
      select 1
      from public.events
      where events.id = event_registrations.event_id
    )
    and (public.can_manage_events() or public.is_admin_user())
  );
