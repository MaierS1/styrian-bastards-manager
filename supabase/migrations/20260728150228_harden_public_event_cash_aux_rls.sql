begin;

-- Event check-ins and cash month closings are operational internal records.
alter table public.event_checkins enable row level security;
alter table public.cash_month_closings enable row level security;

drop policy if exists "event users can read event checkins" on public.event_checkins;
drop policy if exists "event creators can create event checkins" on public.event_checkins;
drop policy if exists "event editors can update event checkins" on public.event_checkins;
drop policy if exists "event deleters can delete event checkins" on public.event_checkins;

drop policy if exists "cash users can read month closings" on public.cash_month_closings;
drop policy if exists "cash editors can create month closings" on public.cash_month_closings;
drop policy if exists "cash editors can update month closings" on public.cash_month_closings;
drop policy if exists "cash deleters can delete month closings" on public.cash_month_closings;

revoke all on table public.event_checkins from anon;
revoke all on table public.cash_month_closings from anon;

revoke all on table public.event_checkins from authenticated;
revoke all on table public.cash_month_closings from authenticated;

grant select, insert, update, delete on table public.event_checkins to authenticated;
grant select, insert, update, delete on table public.cash_month_closings to authenticated;

create policy "event users can read event checkins"
on public.event_checkins
for select
to authenticated
using (
  public.has_app_permission('events', 'view')
);

create policy "event creators can create event checkins"
on public.event_checkins
for insert
to authenticated
with check (
  public.has_app_permission('events', 'create')
  or public.has_app_permission('events', 'edit')
);

create policy "event editors can update event checkins"
on public.event_checkins
for update
to authenticated
using (
  public.has_app_permission('events', 'edit')
)
with check (
  public.has_app_permission('events', 'edit')
);

create policy "event deleters can delete event checkins"
on public.event_checkins
for delete
to authenticated
using (
  public.has_app_permission('events', 'delete')
);

create policy "cash users can read month closings"
on public.cash_month_closings
for select
to authenticated
using (
  public.has_app_permission('kassa', 'view')
);

create policy "cash editors can create month closings"
on public.cash_month_closings
for insert
to authenticated
with check (
  public.has_app_permission('kassa', 'edit')
);

create policy "cash editors can update month closings"
on public.cash_month_closings
for update
to authenticated
using (
  public.has_app_permission('kassa', 'edit')
)
with check (
  public.has_app_permission('kassa', 'edit')
);

create policy "cash deleters can delete month closings"
on public.cash_month_closings
for delete
to authenticated
using (
  public.has_app_permission('kassa', 'delete')
);

commit;
