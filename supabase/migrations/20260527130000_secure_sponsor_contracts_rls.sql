alter table public.sponsor_contracts enable row level security;

revoke all on table public.sponsor_contracts from public;
revoke all on table public.sponsor_contracts from anon;
grant select, insert, update, delete on table public.sponsor_contracts to authenticated;

drop policy if exists "authenticated users can read sponsor contracts" on public.sponsor_contracts;
create policy "authenticated users can read sponsor contracts"
  on public.sponsor_contracts
  for select
  to authenticated
  using (true);

drop policy if exists "authenticated users can insert sponsor contracts" on public.sponsor_contracts;
create policy "authenticated users can insert sponsor contracts"
  on public.sponsor_contracts
  for insert
  to authenticated
  with check (public.can_manage_sponsors());

drop policy if exists "authenticated users can update sponsor contracts" on public.sponsor_contracts;
create policy "authenticated users can update sponsor contracts"
  on public.sponsor_contracts
  for update
  to authenticated
  using (public.can_manage_sponsors())
  with check (public.can_manage_sponsors());

drop policy if exists "authenticated users can delete sponsor contracts" on public.sponsor_contracts;
create policy "authenticated users can delete sponsor contracts"
  on public.sponsor_contracts
  for delete
  to authenticated
  using (public.can_manage_sponsors());
