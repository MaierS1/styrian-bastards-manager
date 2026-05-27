drop policy if exists "members_delete" on public.members;

drop policy if exists "board users can delete members" on public.members;
create policy "board users can delete members"
  on public.members
  for delete
  to authenticated
  using (public.is_board_member());
