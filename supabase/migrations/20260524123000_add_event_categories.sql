alter table public.events
  add column if not exists event_category text not null default 'event';

update public.events
set event_category = 'event'
where event_category is null
   or length(trim(event_category)) = 0;

alter table public.events
  alter column event_category set default 'event',
  alter column event_category set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_event_category_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_event_category_check
      check (
        event_category in (
          'event',
          'heimspiel',
          'turnier',
          'fanfahrt',
          'treffen',
          'sitzung',
          'sonstiges'
        )
      );
  end if;
end;
$$;

create index if not exists events_category_idx
  on public.events (event_category, event_date);

drop function if exists public.get_public_events();

create function public.get_public_events()
returns table (
  id uuid,
  title text,
  event_date date,
  location text,
  event_category text,
  public_description text,
  public_image_path text,
  public_registration_url text,
  public_external_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    events.id,
    events.public_title as title,
    events.event_date,
    events.location,
    events.event_category,
    events.public_description,
    events.public_image_path,
    events.public_registration_url,
    events.public_external_url
  from public.events
  where events.is_public = true
    and events.public_title is not null
    and length(trim(events.public_title)) > 0
    and events.event_date >= current_date
    and events.status in ('geplant', 'laufend')
    and (
      events.public_published_at is null
      or events.public_published_at <= now()
    )
  order by
    events.event_date asc,
    events.public_sort_order asc,
    lower(events.public_title) asc;
$$;

revoke all on function public.get_public_events() from public;
grant execute on function public.get_public_events() to anon;
grant execute on function public.get_public_events() to authenticated;
