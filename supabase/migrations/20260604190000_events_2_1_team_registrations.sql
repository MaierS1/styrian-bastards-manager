alter table public.event_registrations
  add column if not exists team_name text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'event_registrations_team_name_not_blank'
      and conrelid = 'public.event_registrations'::regclass
  ) then
    alter table public.event_registrations
      add constraint event_registrations_team_name_not_blank
      check (team_name is null or length(trim(team_name)) > 0);
  end if;
end;
$$;

create or replace function public.create_public_event_registration(
  p_event_id uuid,
  p_full_name text,
  p_email text,
  p_phone text default null,
  p_member_status text default 'unknown',
  p_participant_count integer default 1,
  p_note text default null,
  p_team_name text default null
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
  v_registered_team_count integer;
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

  select count(*)::integer
    into v_registered_team_count
  from public.event_registrations
  where event_id = p_event_id
    and status = 'registered';

  if v_event.max_participants is not null
    and v_registered_team_count + 1 > v_event.max_participants
  then
    if v_event.allow_waitlist is true then
      v_status := 'waitlist';
    else
      raise exception 'event is full';
    end if;
  else
    v_status := 'registered';
  end if;

  perform set_config('app.event_registration_source', 'public', true);

  insert into public.event_registrations (
    event_id,
    full_name,
    email,
    phone,
    member_status,
    participant_count,
    note,
    team_name,
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
    nullif(trim(coalesce(p_team_name, '')), ''),
    v_status
  )
  returning id, status into registration_id, registration_status;

  return next;
end;
$$;

revoke all on function public.create_public_event_registration(uuid, text, text, text, text, integer, text, text) from public;
grant execute on function public.create_public_event_registration(uuid, text, text, text, text, integer, text, text) to anon;
grant execute on function public.create_public_event_registration(uuid, text, text, text, text, integer, text, text) to authenticated;

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
  contact_name text,
  contact_email text,
  contact_phone text,
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
    events.contact_name,
    events.contact_email,
    events.contact_phone,
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
      count(*) filter (where status = 'registered') as registered_count,
      count(*) filter (where status = 'waitlist') as waitlist_count
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
