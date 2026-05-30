alter table public.events
  add column if not exists title text,
  add column if not exists short_description text,
  add column if not exists description text,
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists meeting_point text,
  add column if not exists contact_person text,
  add column if not exists registration_deadline timestamptz,
  add column if not exists max_participants integer,
  add column if not exists public_status text not null default 'draft',
  add column if not exists public_image_url text;

update public.events
set
  title = coalesce(nullif(trim(title), ''), nullif(trim(name), '')),
  public_status = case
    when is_public = true and public_status = 'draft' then 'published'
    when public_status in ('draft', 'published', 'hidden') then public_status
    else 'draft'
  end
where title is null
   or length(trim(title)) = 0
   or public_status is null
   or public_status not in ('draft', 'published', 'hidden');

alter table public.events
  alter column event_category set default 'treffen';

do $$
begin
  alter table public.events
    drop constraint if exists events_event_category_check;

  alter table public.events
    add constraint events_event_category_check
    check (
      event_category in (
        'treffen',
        'fanfahrt',
        'cornhole',
        'vereinsveranstaltung',
        'sonstiges',
        'event',
        'heimspiel',
        'turnier',
        'sitzung'
      )
    );

  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_public_status_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_public_status_check
      check (public_status in ('draft', 'published', 'hidden'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_title_not_blank'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_title_not_blank
      check (title is null or length(trim(title)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_short_description_not_blank'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_short_description_not_blank
      check (short_description is null or length(trim(short_description)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_description_not_blank'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_description_not_blank
      check (description is null or length(trim(description)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_meeting_point_not_blank'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_meeting_point_not_blank
      check (meeting_point is null or length(trim(meeting_point)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_contact_person_not_blank'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_contact_person_not_blank
      check (contact_person is null or length(trim(contact_person)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_max_participants_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_max_participants_check
      check (max_participants is null or max_participants > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_public_image_url_not_blank'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_public_image_url_not_blank
      check (public_image_url is null or length(trim(public_image_url)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_ends_at_after_starts_at'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_ends_at_after_starts_at
      check (starts_at is null or ends_at is null or ends_at >= starts_at);
  end if;
end;
$$;

create index if not exists events_public_sync_listing_idx
  on public.events (
    is_public,
    public_status,
    starts_at,
    event_date,
    public_sort_order,
    lower(coalesce(public_title, title, name))
  )
  where is_public = true
    and public_status = 'published';

drop function if exists public.get_public_events();

create function public.get_public_events()
returns table (
  id uuid,
  title text,
  short_description text,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  event_date date,
  location text,
  meeting_point text,
  event_category text,
  contact_person text,
  registration_deadline timestamptz,
  max_participants integer,
  public_image_path text,
  public_image_url text,
  public_registration_url text,
  public_external_url text,
  public_sort_order integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    events.id,
    coalesce(nullif(trim(events.public_title), ''), nullif(trim(events.title), ''), events.name) as title,
    events.short_description,
    coalesce(events.description, events.public_description) as description,
    events.starts_at,
    events.ends_at,
    events.event_date,
    events.location,
    events.meeting_point,
    events.event_category,
    events.contact_person,
    events.registration_deadline,
    events.max_participants,
    events.public_image_path,
    events.public_image_url,
    events.public_registration_url,
    events.public_external_url,
    events.public_sort_order
  from public.events
  where events.is_public = true
    and events.public_status = 'published'
    and coalesce(nullif(trim(events.public_title), ''), nullif(trim(events.title), ''), events.name) is not null
    and coalesce(events.starts_at::date, events.event_date) >= current_date
    and events.status in ('geplant', 'laufend')
    and (
      events.public_published_at is null
      or events.public_published_at <= now()
    )
  order by
    coalesce(events.starts_at, events.event_date::timestamptz) asc,
    events.public_sort_order asc,
    lower(coalesce(events.public_title, events.title, events.name)) asc;
$$;

revoke all on function public.get_public_events() from public;
grant execute on function public.get_public_events() to anon;
grant execute on function public.get_public_events() to authenticated;

alter table public.events enable row level security;

revoke all on table public.events from public;
revoke all on table public.events from anon;
grant select, insert, update, delete on table public.events to authenticated;
