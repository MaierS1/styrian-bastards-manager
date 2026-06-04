alter table public.events
  add column if not exists registration_enabled boolean not null default false,
  add column if not exists registration_deadline timestamptz,
  add column if not exists max_participants integer,
  add column if not exists allow_waitlist boolean not null default true,
  add column if not exists contact_name text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists meeting_point text,
  add column if not exists event_image_url text,
  add column if not exists internal_notes text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'events_max_participants_positive'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_max_participants_positive
      check (max_participants is null or max_participants > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'events_contact_name_not_blank'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_contact_name_not_blank
      check (contact_name is null or length(trim(contact_name)) > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'events_contact_email_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_contact_email_check
      check (contact_email is null or contact_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'events_contact_phone_not_blank'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_contact_phone_not_blank
      check (contact_phone is null or length(trim(contact_phone)) > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'events_event_image_url_not_blank'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_event_image_url_not_blank
      check (event_image_url is null or length(trim(event_image_url)) > 0);
  end if;
end;
$$;

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  member_status text not null default 'unknown',
  participant_count integer not null default 1,
  note text,
  status text not null default 'registered',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint event_registrations_full_name_not_blank check (length(trim(full_name)) > 0),
  constraint event_registrations_email_check check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint event_registrations_phone_not_blank check (phone is null or length(trim(phone)) > 0),
  constraint event_registrations_member_status_check check (member_status in ('member', 'guest', 'unknown')),
  constraint event_registrations_participant_count_check check (participant_count > 0),
  constraint event_registrations_status_check check (status in ('registered', 'waitlist', 'cancelled'))
);

create index if not exists event_registrations_event_id_idx
  on public.event_registrations (event_id);

create index if not exists event_registrations_event_status_idx
  on public.event_registrations (event_id, status);

drop trigger if exists set_event_registrations_updated_at on public.event_registrations;

create trigger set_event_registrations_updated_at
  before update on public.event_registrations
  for each row
  execute function public.set_updated_at();

alter table public.event_registrations enable row level security;

revoke all on table public.event_registrations from public;
revoke all on table public.event_registrations from anon;
grant select, insert, update, delete on table public.event_registrations to authenticated;

drop policy if exists "authenticated users can read event registrations" on public.event_registrations;
create policy "authenticated users can read event registrations"
  on public.event_registrations
  for select
  to authenticated
  using (true);

drop policy if exists "authenticated users can insert event registrations" on public.event_registrations;
create policy "authenticated users can insert event registrations"
  on public.event_registrations
  for insert
  to authenticated
  with check (true);

drop policy if exists "authenticated users can update event registrations" on public.event_registrations;
create policy "authenticated users can update event registrations"
  on public.event_registrations
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated users can delete event registrations" on public.event_registrations;
create policy "authenticated users can delete event registrations"
  on public.event_registrations
  for delete
  to authenticated
  using (true);

create or replace function public.create_public_event_registration(
  p_event_id uuid,
  p_full_name text,
  p_email text,
  p_phone text default null,
  p_member_status text default 'unknown',
  p_participant_count integer default 1,
  p_note text default null
)
returns table (
  registration_id uuid,
  registration_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_registered_count integer;
  v_status text;
begin
  if p_event_id is null then
    raise exception 'event_id is required';
  end if;

  if nullif(trim(coalesce(p_full_name, '')), '') is null then
    raise exception 'full_name is required';
  end if;

  if nullif(trim(coalesce(p_email, '')), '') is null then
    raise exception 'email is required';
  end if;

  if coalesce(p_member_status, 'unknown') not in ('member', 'guest', 'unknown') then
    raise exception 'invalid member_status: %', p_member_status;
  end if;

  if coalesce(p_participant_count, 1) <= 0 then
    raise exception 'participant_count must be greater than 0';
  end if;

  select *
    into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found then
    raise exception 'event not found';
  end if;

  if v_event.is_public is not true
    or v_event.public_status <> 'published'
    or v_event.status not in ('geplant', 'laufend')
    or coalesce(v_event.starts_at::date, v_event.event_date) < current_date
    or (v_event.public_published_at is not null and v_event.public_published_at > now())
  then
    raise exception 'event is not open for public registration';
  end if;

  if v_event.registration_enabled is not true then
    raise exception 'registration is disabled for this event';
  end if;

  if v_event.registration_deadline is not null and v_event.registration_deadline < now() then
    raise exception 'registration deadline has passed';
  end if;

  select coalesce(sum(participant_count), 0)
    into v_registered_count
  from public.event_registrations
  where event_id = p_event_id
    and status = 'registered';

  if v_event.max_participants is not null
    and v_registered_count + coalesce(p_participant_count, 1) > v_event.max_participants
  then
    if v_event.allow_waitlist is true then
      v_status := 'waitlist';
    else
      raise exception 'event is full';
    end if;
  else
    v_status := 'registered';
  end if;

  insert into public.event_registrations (
    event_id,
    full_name,
    email,
    phone,
    member_status,
    participant_count,
    note,
    status
  )
  values (
    p_event_id,
    trim(p_full_name),
    lower(trim(p_email)),
    nullif(trim(coalesce(p_phone, '')), ''),
    coalesce(p_member_status, 'unknown'),
    coalesce(p_participant_count, 1),
    nullif(trim(coalesce(p_note, '')), ''),
    v_status
  )
  returning id, status into registration_id, registration_status;

  return next;
end;
$$;

revoke all on function public.create_public_event_registration(uuid, text, text, text, text, integer, text) from public;
grant execute on function public.create_public_event_registration(uuid, text, text, text, text, integer, text) to anon;
grant execute on function public.create_public_event_registration(uuid, text, text, text, text, integer, text) to authenticated;

drop function if exists public.get_public_events();

create function public.get_public_events()
returns table (
  id uuid,
  title text,
  short_description text,
  description text,
  public_description_html text,
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
  public_sort_order integer,
  registration_enabled boolean,
  allow_waitlist boolean,
  event_image_url text,
  registered_count integer,
  waitlist_count integer,
  registration_status text
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
    events.public_description_html,
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
    events.public_sort_order,
    events.registration_enabled,
    events.allow_waitlist,
    coalesce(events.event_image_url, events.public_image_url) as event_image_url,
    coalesce(registration_counts.registered_count, 0)::integer as registered_count,
    coalesce(registration_counts.waitlist_count, 0)::integer as waitlist_count,
    case
      when events.registration_enabled is not true then 'disabled'
      when events.registration_deadline is not null and events.registration_deadline < now() then 'closed'
      when events.max_participants is not null
        and coalesce(registration_counts.registered_count, 0) >= events.max_participants
        and events.allow_waitlist is true then 'waitlist'
      when events.max_participants is not null
        and coalesce(registration_counts.registered_count, 0) >= events.max_participants then 'full'
      else 'open'
    end as registration_status
  from public.events
  left join lateral (
    select
      coalesce(sum(participant_count) filter (where status = 'registered'), 0) as registered_count,
      coalesce(sum(participant_count) filter (where status = 'waitlist'), 0) as waitlist_count
    from public.event_registrations
    where event_registrations.event_id = events.id
  ) registration_counts on true
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
