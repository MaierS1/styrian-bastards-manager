create or replace function public.can_manage_events()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_user()
    or exists (
      select 1
      from public.members
      where auth_user_id = auth.uid()
        and app_role = 'checkin'
    );
$$;

revoke all on function public.can_manage_events() from public;
revoke all on function public.can_manage_events() from anon;
revoke all on function public.can_manage_events() from authenticated;
grant execute on function public.can_manage_events() to authenticated;
