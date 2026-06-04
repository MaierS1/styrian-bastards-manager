create extension if not exists pg_net with schema extensions;

alter table public.event_registrations
  add column if not exists checked_in_at timestamptz,
  add column if not exists checkin_status text not null default 'not_checked_in';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'event_registrations_checkin_status_check'
      and conrelid = 'public.event_registrations'::regclass
  ) then
    alter table public.event_registrations
      add constraint event_registrations_checkin_status_check
      check (checkin_status in ('not_checked_in', 'checked_in', 'no_show'));
  end if;
end;
$$;

create index if not exists event_registrations_event_checkin_status_idx
  on public.event_registrations (event_id, checkin_status);

create or replace function public.notify_event_registration_async()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_notification_type text;
begin
  if coalesce(current_setting('app.event_registration_source', true), '') <> 'public' then
    return new;
  end if;

  if new.status = 'registered' then
    v_notification_type := 'registration_confirmation';
  elsif new.status = 'waitlist' then
    v_notification_type := 'waitlist_confirmation';
  else
    return new;
  end if;

  update public.event_registrations
    set notification_status = 'pending',
        notification_error = null
  where id = new.id
    and confirmation_sent_at is null;

  perform net.http_post(
    url := 'https://ekaxdyysefmypkainhij.supabase.co/functions/v1/event-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'source', 'public_registration',
      'type', v_notification_type,
      'registration_id', new.id
    )
  );

  return new;
exception
  when others then
    update public.event_registrations
      set notification_status = 'error',
          notification_error = left(sqlerrm, 500)
    where id = new.id;
    return new;
end;
$$;

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

  perform set_config('app.event_registration_source', 'public', true);

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

drop trigger if exists notify_public_event_registration_after_insert on public.event_registrations;

create trigger notify_public_event_registration_after_insert
  after insert on public.event_registrations
  for each row
  when (new.status in ('registered', 'waitlist'))
  execute function public.notify_event_registration_async();
