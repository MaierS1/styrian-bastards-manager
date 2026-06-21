drop policy if exists "members can read own event registrations" on public.event_registrations;
create policy "members can read own event registrations"
  on public.event_registrations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.members
      where members.auth_user_id = auth.uid()
        and lower(trim(members.email)) = lower(trim(public.event_registrations.email))
    )
  );
