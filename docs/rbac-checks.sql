-- RBAC smoke checks after migration
-- Replace the email filter with a known user if needed.

-- 1) Which auth users have which RBAC roles?
select
  m.id as member_id,
  m.first_name,
  m.last_name,
  m.email,
  m.app_role as legacy_app_role,
  ur.role_key as rbac_role
from public.members m
left join public.user_roles ur
  on ur.auth_user_id = m.auth_user_id
order by m.last_name, m.first_name, ur.role_key;

-- 2) Which permissions are granted per user?
select
  m.email,
  ur.role_key,
  up.permission_key,
  up.effect
from public.members m
left join public.user_roles ur
  on ur.auth_user_id = m.auth_user_id
left join public.user_permissions up
  on up.auth_user_id = m.auth_user_id
order by m.email, ur.role_key, up.permission_key;

-- 3) Effective permissions for the current session.
-- Run this while logged in as the target account.
select
  auth.uid() as current_auth_user_id,
  public.has_app_permission('mitglieder', 'view') as mitglieder_view,
  public.has_app_permission('beitraege', 'edit') as beitraege_edit,
  public.has_app_permission('kassa', 'edit') as kassa_edit,
  public.has_app_permission('rechnungen', 'delete') as rechnungen_delete,
  public.has_app_permission('dokumente', 'edit') as dokumente_edit,
  public.has_app_permission('events', 'edit') as events_edit,
  public.has_app_permission('shop', 'edit') as shop_edit,
  public.has_app_permission('systemeinstellungen', 'edit') as systemeinstellungen_edit;

-- 4) Effective permissions for a specific member by email.
-- This shows the persisted grants and role-derived permissions in the tables.
with target_member as (
  select auth_user_id
  from public.members
  where email = 'admin@example.com'
  limit 1
)
select
  p.module,
  p.action,
  case
    when exists (
      select 1
      from public.user_permissions up
      where up.auth_user_id = tm.auth_user_id
        and up.permission_key = p.key
        and up.effect = 'allow'
    ) then 'allow'
    else 'none'
  end as effect,
  case
    when exists (
      select 1
      from public.user_permissions up
      where up.auth_user_id = tm.auth_user_id
        and up.permission_key = p.key
    ) then 'user_permissions'
    when exists (
      select 1
      from public.user_roles ur
      join public.role_permissions rp
        on rp.role_key = ur.role_key
      where ur.auth_user_id = tm.auth_user_id
        and rp.permission_key = p.key
    ) then 'role_permissions'
    else 'none'
  end as source
from target_member tm
join public.permissions p on true
order by p.module, p.action;

-- 5) Legacy role mapping check.
select
  app_role,
  public.legacy_app_role_to_rbac_role(app_role) as mapped_rbac_role
from (
  values
    ('admin'),
    ('members'),
    ('cashier'),
    ('checkin'),
    ('readonly')
) as legacy(app_role);
