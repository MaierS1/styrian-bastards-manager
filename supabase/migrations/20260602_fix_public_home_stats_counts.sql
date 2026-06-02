create or replace function public.get_public_home_stats()
returns table (
    active_members bigint,
    upcoming_events bigint,
    public_sponsors bigint,
    public_shop_items bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
    select count(*)
    into active_members
    from public.members
    where lower(status::text) in ('active', 'aktiv')
      and coalesce(is_test, false) = false;

    select count(*)
    into upcoming_events
    from public.events
    where events.is_public = true
      and events.public_status = 'published'
      and coalesce(nullif(trim(events.public_title), ''), nullif(trim(events.title), ''), events.name) is not null
      and coalesce(events.starts_at::date, events.event_date) >= current_date
      and events.status in ('geplant', 'laufend')
      and (
        events.public_published_at is null
        or events.public_published_at <= now()
      );

    select count(*)
    into public_sponsors
    from public.sponsors
    where sponsors.is_public = true
      and lower(sponsors.status::text) in ('active', 'published', 'public');

    select count(*)
    into public_shop_items
    from public.merch_items
    where merch_items.is_public = true
      and lower(merch_items.status::text) in ('active', 'available', 'published', 'public');

    return next;
end;
$$;

revoke all on function public.get_public_home_stats() from public;
grant execute on function public.get_public_home_stats() to anon, authenticated;
