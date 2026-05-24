alter table public.events
  add column if not exists is_public boolean not null default false,
  add column if not exists public_title text,
  add column if not exists public_description text,
  add column if not exists public_sort_order integer not null default 0,
  add column if not exists public_published_at timestamptz,
  add column if not exists public_image_path text,
  add column if not exists public_registration_url text,
  add column if not exists public_external_url text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_public_title_not_blank'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_public_title_not_blank
      check (public_title is null or length(trim(public_title)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_public_description_not_blank'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_public_description_not_blank
      check (public_description is null or length(trim(public_description)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_public_sort_order_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_public_sort_order_check
      check (public_sort_order >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_public_image_path_not_blank'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_public_image_path_not_blank
      check (public_image_path is null or length(trim(public_image_path)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_public_registration_url_not_blank'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_public_registration_url_not_blank
      check (public_registration_url is null or length(trim(public_registration_url)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_public_external_url_not_blank'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_public_external_url_not_blank
      check (public_external_url is null or length(trim(public_external_url)) > 0);
  end if;
end;
$$;

create index if not exists events_public_listing_idx
  on public.events (
    is_public,
    event_date,
    public_sort_order,
    lower(public_title)
  )
  where is_public = true;

create or replace function public.get_public_events()
returns table (
  id uuid,
  title text,
  event_date date,
  location text,
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

alter table public.events enable row level security;

revoke all on table public.events from public;
revoke all on table public.events from anon;
grant select, insert, update, delete on table public.events to authenticated;

drop policy if exists "authenticated users can read events" on public.events;
create policy "authenticated users can read events"
  on public.events
  for select
  to authenticated
  using (true);

drop policy if exists "authenticated users can insert events" on public.events;
create policy "authenticated users can insert events"
  on public.events
  for insert
  to authenticated
  with check (true);

drop policy if exists "authenticated users can update events" on public.events;
create policy "authenticated users can update events"
  on public.events
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated users can delete events" on public.events;
create policy "authenticated users can delete events"
  on public.events
  for delete
  to authenticated
  using (true);
