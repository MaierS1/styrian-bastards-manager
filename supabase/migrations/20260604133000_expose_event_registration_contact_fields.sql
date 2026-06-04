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
