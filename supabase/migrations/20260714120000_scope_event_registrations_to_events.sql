alter table public.event_registrations
  add column if not exists event_id uuid;

do $$
declare
  v_cornhole_event_id uuid;
  v_single_event_id uuid;
  v_unassigned_count integer;
  v_constraint record;
begin
  select events.id
    into v_cornhole_event_id
  from public.events
  where lower(
    concat_ws(
      ' ',
      events.name,
      events.title,
      events.public_title,
      events.short_description,
      events.description,
      events.public_description
    )
  ) like '%cornhole%'
  order by
    events.event_date desc nulls last,
    events.created_at desc nulls last
  limit 1;

  if v_cornhole_event_id is null then
    select only_event.id
      into v_single_event_id
    from public.events only_event
    where (select count(*) from public.events) = 1
    limit 1;
  end if;

  update public.event_registrations
  set event_id = coalesce(v_cornhole_event_id, v_single_event_id)
  where event_id is null
    and coalesce(v_cornhole_event_id, v_single_event_id) is not null;

  select count(*)::integer
    into v_unassigned_count
  from public.event_registrations
  where event_id is null;

  if v_unassigned_count > 0 then
    raise exception 'Cannot set event_registrations.event_id not null: % existing registration(s) could not be assigned to an event.', v_unassigned_count;
  end if;

  for v_constraint in
    select constraints.conname
    from pg_constraint constraints
    join pg_attribute attributes
      on attributes.attrelid = constraints.conrelid
      and attributes.attnum = any (constraints.conkey)
    where constraints.conrelid = 'public.event_registrations'::regclass
      and constraints.contype = 'f'
      and attributes.attname = 'event_id'
  loop
    execute format('alter table public.event_registrations drop constraint %I', v_constraint.conname);
  end loop;
end;
$$;

alter table public.event_registrations
  alter column event_id set not null,
  add constraint event_registrations_event_id_fkey
    foreign key (event_id)
    references public.events(id)
    on delete restrict;

create index if not exists event_registrations_event_id_idx
  on public.event_registrations (event_id);

create index if not exists event_registrations_event_status_idx
  on public.event_registrations (event_id, status);

drop policy if exists "authenticated users can insert event registrations" on public.event_registrations;
drop policy if exists "event managers can insert event registrations" on public.event_registrations;
create policy "event managers can insert event registrations"
  on public.event_registrations
  for insert
  to authenticated
  with check (
    event_id is not null
    and exists (
      select 1
      from public.events
      where events.id = event_registrations.event_id
    )
    and (public.can_manage_events() or public.is_admin_user())
  );

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
