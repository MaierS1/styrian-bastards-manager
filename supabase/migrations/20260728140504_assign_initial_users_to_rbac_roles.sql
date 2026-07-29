-- Assign only the two RBAC user-role mappings approved after the read-only
-- dry-run on Staging. Legacy member fields and permission tables stay
-- unchanged; this migration only appends missing rows to public.user_roles.

insert into public.user_roles (auth_user_id, role_key)
select distinct
  m.auth_user_id,
  target_role.key
from public.members m
join auth.users au
  on au.id = m.auth_user_id
join public.roles target_role
  on target_role.key = 'super_admin'
where m.status = 'aktiv'
  and m.auth_user_id is not null
  and m.app_role = 'admin'
  and m.role = 'obmann'
on conflict (auth_user_id, role_key) do nothing;

insert into public.user_roles (auth_user_id, role_key)
select distinct
  m.auth_user_id,
  target_role.key
from public.members m
join auth.users au
  on au.id = m.auth_user_id
join public.roles target_role
  on target_role.key = 'mitglied'
where m.status = 'aktiv'
  and m.auth_user_id is not null
  and m.app_role = 'mitglied'
  and coalesce(m.role, 'keine') in ('mitglied', 'keine')
on conflict (auth_user_id, role_key) do nothing;
