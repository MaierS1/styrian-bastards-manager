alter table public.members enable row level security;

revoke all on table public.members from public;
revoke all on table public.members from anon;
grant select, insert, update, delete on table public.members to authenticated;

drop policy if exists "temporary_public_read_members" on public.members;

drop policy if exists "authenticated users can read own member profile" on public.members;
create policy "authenticated users can read own member profile"
  on public.members
  for select
  to authenticated
  using (auth_user_id = auth.uid());
