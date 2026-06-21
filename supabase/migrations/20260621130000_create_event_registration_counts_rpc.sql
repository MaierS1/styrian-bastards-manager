create or replace function public.get_event_registration_counts()
returns table (
  event_id uuid,
  registered_count integer,
  waitlist_count integer,
  cancelled_count integer,
  total_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    event_registrations.event_id,
    count(*) filter (where event_registrations.status = 'registered')::integer as registered_count,
    count(*) filter (where event_registrations.status = 'waitlist')::integer as waitlist_count,
    count(*) filter (where event_registrations.status = 'cancelled')::integer as cancelled_count,
    count(*)::integer as total_count
  from public.event_registrations
  group by event_registrations.event_id
  order by event_registrations.event_id;
$$;

revoke all on function public.get_event_registration_counts() from public;
revoke all on function public.get_event_registration_counts() from anon;
grant execute on function public.get_event_registration_counts() to authenticated;
