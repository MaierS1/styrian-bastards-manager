-- Align legacy members.app_role with the RBAC role set.
-- app_role is kept as a compatibility fallback for existing policies/functions,
-- while new user permissions should be assigned through user_roles/user_permissions.

update public.members
set app_role = 'mitglied'
where app_role is null;

do $$
declare
  invalid_roles text;
begin
  select string_agg(distinct app_role, ', ' order by app_role)
    into invalid_roles
  from public.members
  where app_role not in (
    'super_admin',
    'administrator',
    'vorstand',
    'kassier',
    'schriftfuehrer',
    'rechnungspruefer',
    'mitglied',
    'admin',
    'members',
    'cashier',
    'checkin',
    'readonly'
  );

  if invalid_roles is not null then
    raise exception 'Cannot replace members_app_role_check: unexpected members.app_role value(s): %', invalid_roles;
  end if;
end $$;

alter table public.members
  alter column app_role set default 'mitglied';

alter table public.members
  alter column app_role set not null;

alter table public.members
  drop constraint if exists members_app_role_check;

alter table public.members
  add constraint members_app_role_check
  check (app_role in (
    'super_admin',
    'administrator',
    'vorstand',
    'kassier',
    'schriftfuehrer',
    'rechnungspruefer',
    'mitglied',
    'admin',
    'members',
    'cashier',
    'checkin',
    'readonly'
  ))
  not valid;

alter table public.members
  validate constraint members_app_role_check;
