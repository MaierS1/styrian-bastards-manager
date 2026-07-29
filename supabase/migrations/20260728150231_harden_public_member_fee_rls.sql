begin;

-- Legacy membership_fees and member change requests contain member-related
-- financial or profile-change data and must not be directly public.
alter table public.membership_fees enable row level security;
alter table public.member_change_requests enable row level security;

drop policy if exists "fee users can read legacy membership fees" on public.membership_fees;
drop policy if exists "fee creators can create legacy membership fees" on public.membership_fees;
drop policy if exists "fee editors can update legacy membership fees" on public.membership_fees;
drop policy if exists "fee deleters can delete legacy membership fees" on public.membership_fees;

drop policy if exists "members can read own change requests" on public.member_change_requests;
drop policy if exists "members can create own change requests" on public.member_change_requests;
drop policy if exists "member managers can read change requests" on public.member_change_requests;
drop policy if exists "member managers can update change requests" on public.member_change_requests;
drop policy if exists "member managers can delete change requests" on public.member_change_requests;

revoke all on table public.membership_fees from anon;
revoke all on table public.member_change_requests from anon;

revoke all on table public.membership_fees from authenticated;
revoke all on table public.member_change_requests from authenticated;

grant select, insert, update, delete on table public.membership_fees to authenticated;
grant select, insert, update, delete on table public.member_change_requests to authenticated;

create policy "fee users can read legacy membership fees"
on public.membership_fees
for select
to authenticated
using (
  public.has_app_permission('beitraege', 'view')
  or public.has_app_permission('kassa', 'view')
  or exists (
    select 1
    from public.members m
    where m.id = membership_fees.member_id
      and m.auth_user_id = auth.uid()
  )
);

create policy "fee creators can create legacy membership fees"
on public.membership_fees
for insert
to authenticated
with check (
  public.has_app_permission('beitraege', 'create')
);

create policy "fee editors can update legacy membership fees"
on public.membership_fees
for update
to authenticated
using (
  public.has_app_permission('beitraege', 'edit')
  or public.has_app_permission('kassa', 'edit')
)
with check (
  public.has_app_permission('beitraege', 'edit')
  or public.has_app_permission('kassa', 'edit')
);

create policy "fee deleters can delete legacy membership fees"
on public.membership_fees
for delete
to authenticated
using (
  public.has_app_permission('beitraege', 'delete')
);

create policy "members can read own change requests"
on public.member_change_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.members m
    where m.id = member_change_requests.member_id
      and m.auth_user_id = auth.uid()
  )
);

create policy "member managers can read change requests"
on public.member_change_requests
for select
to authenticated
using (
  public.has_app_permission('mitglieder', 'view')
);

create policy "members can create own change requests"
on public.member_change_requests
for insert
to authenticated
with check (
  requested_by = auth.uid()
  and exists (
    select 1
    from public.members m
    where m.id = member_change_requests.member_id
      and m.auth_user_id = auth.uid()
  )
);

create policy "member managers can update change requests"
on public.member_change_requests
for update
to authenticated
using (
  public.has_app_permission('mitglieder', 'edit')
)
with check (
  public.has_app_permission('mitglieder', 'edit')
);

create policy "member managers can delete change requests"
on public.member_change_requests
for delete
to authenticated
using (
  public.has_app_permission('mitglieder', 'delete')
);

commit;
