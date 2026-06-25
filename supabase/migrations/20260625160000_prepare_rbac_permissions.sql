create table if not exists public.roles (
  key text primary key,
  label text not null,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.permissions (
  key text primary key,
  module text not null,
  action text not null check (action in ('view', 'create', 'edit', 'delete')),
  label text not null,
  created_at timestamptz not null default now(),
  unique (module, action)
);

create table if not exists public.role_permissions (
  role_key text not null references public.roles(key) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_key, permission_key)
);

create table if not exists public.user_roles (
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  role_key text not null references public.roles(key) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references auth.users(id),
  primary key (auth_user_id, role_key)
);

create table if not exists public.user_permissions (
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  effect text not null default 'allow' check (effect in ('allow', 'deny')),
  assigned_at timestamptz not null default now(),
  assigned_by uuid references auth.users(id),
  primary key (auth_user_id, permission_key)
);

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_permissions enable row level security;

insert into public.roles (key, label, description) values
  ('super_admin', 'Vollzugriff', 'Vollzugriff auf alle App-Module und Systemfunktionen.'),
  ('administrator', 'Verwaltung', 'Verwaltung mit breitem Modulzugriff.'),
  ('vorstand', 'Vorstand', 'Vorstandsarbeit ohne Systemvollzugriff.'),
  ('kassier', 'Finanzen', 'Kassa, Beitraege, Rechnungen und finanznahe Module.'),
  ('schriftfuehrer', 'Schriftfuehrung', 'Mitglieder, Dokumente, Events und Kommunikation.'),
  ('rechnungspruefer', 'Finanzpruefung', 'Lesender Zugriff auf Finanzbereiche.'),
  ('mitglied', 'Mitgliederbereich', 'Basiszugriff fuer Mitglieder.')
on conflict (key) do update set
  label = excluded.label,
  description = excluded.description;

insert into public.permissions (key, module, action, label)
select module || '.' || action, module, action, label
from (
  values
    ('mitglieder', 'Mitgliederverwaltung'),
    ('beitraege', 'Beitraege'),
    ('kassa', 'Kassa'),
    ('rechnungen', 'Rechnungen'),
    ('dokumente', 'Dokumente'),
    ('events', 'Events'),
    ('shop', 'Shop & Fanartikel'),
    ('sponsoren', 'Sponsoren'),
    ('medien_presse', 'Medien & Presse'),
    ('homepage', 'Homepage-Freigaben'),
    ('inventar', 'Inventar'),
    ('einkauf', 'Einkauf & Preisvergleich'),
    ('backup', 'Backup'),
    ('systemeinstellungen', 'Systemeinstellungen')
) as modules(module, label)
cross join (values ('view'), ('create'), ('edit'), ('delete')) as actions(action)
on conflict (key) do update set
  module = excluded.module,
  action = excluded.action,
  label = excluded.label;

insert into public.role_permissions (role_key, permission_key)
select 'super_admin', key from public.permissions
on conflict do nothing;

insert into public.role_permissions (role_key, permission_key)
select 'administrator', key from public.permissions
on conflict do nothing;

insert into public.role_permissions (role_key, permission_key)
select 'vorstand', module || '.' || action
from (values
  ('mitglieder', 'view'), ('mitglieder', 'create'), ('mitglieder', 'edit'),
  ('beitraege', 'view'), ('kassa', 'view'), ('rechnungen', 'view'),
  ('dokumente', 'view'), ('dokumente', 'create'), ('dokumente', 'edit'),
  ('events', 'view'), ('events', 'create'), ('events', 'edit'), ('events', 'delete'),
  ('shop', 'view'),
  ('sponsoren', 'view'), ('sponsoren', 'create'), ('sponsoren', 'edit'),
  ('medien_presse', 'view'), ('medien_presse', 'create'), ('medien_presse', 'edit'),
  ('homepage', 'view'), ('homepage', 'create'), ('homepage', 'edit'),
  ('inventar', 'view'), ('inventar', 'create'), ('inventar', 'edit'),
  ('einkauf', 'view'), ('einkauf', 'create'), ('einkauf', 'edit')
) as grants(module, action)
on conflict do nothing;

insert into public.role_permissions (role_key, permission_key)
select 'kassier', module || '.' || action
from (values
  ('mitglieder', 'view'),
  ('beitraege', 'view'), ('beitraege', 'create'), ('beitraege', 'edit'),
  ('kassa', 'view'), ('kassa', 'create'), ('kassa', 'edit'), ('kassa', 'delete'),
  ('rechnungen', 'view'), ('rechnungen', 'create'), ('rechnungen', 'edit'),
  ('shop', 'view'), ('shop', 'create'), ('shop', 'edit'),
  ('einkauf', 'view'), ('einkauf', 'create'), ('einkauf', 'edit')
) as grants(module, action)
on conflict do nothing;

insert into public.role_permissions (role_key, permission_key)
select 'schriftfuehrer', module || '.' || action
from (values
  ('mitglieder', 'view'), ('mitglieder', 'create'), ('mitglieder', 'edit'),
  ('dokumente', 'view'), ('dokumente', 'create'), ('dokumente', 'edit'),
  ('events', 'view'), ('events', 'create'), ('events', 'edit'),
  ('sponsoren', 'view'), ('sponsoren', 'create'), ('sponsoren', 'edit'),
  ('medien_presse', 'view'), ('medien_presse', 'create'), ('medien_presse', 'edit'),
  ('homepage', 'view'), ('homepage', 'create'), ('homepage', 'edit'),
  ('inventar', 'view'), ('inventar', 'create'), ('inventar', 'edit')
) as grants(module, action)
on conflict do nothing;

insert into public.role_permissions (role_key, permission_key)
select 'rechnungspruefer', module || '.' || action
from (values
  ('beitraege', 'view'),
  ('kassa', 'view'),
  ('rechnungen', 'view')
) as grants(module, action)
on conflict do nothing;

insert into public.role_permissions (role_key, permission_key)
select 'mitglied', module || '.' || action
from (values
  ('events', 'view'),
  ('dokumente', 'view')
) as grants(module, action)
on conflict do nothing;

create or replace function public.legacy_app_role_to_rbac_role(p_app_role text)
returns text
language sql
stable
as $$
  select case coalesce(p_app_role, '')
    when 'admin' then 'super_admin'
    when 'cashier' then 'kassier'
    when 'members' then 'schriftfuehrer'
    when 'checkin' then 'vorstand'
    when 'readonly' then 'mitglied'
    when 'super_admin' then 'super_admin'
    when 'administrator' then 'administrator'
    when 'vorstand' then 'vorstand'
    when 'kassier' then 'kassier'
    when 'schriftfuehrer' then 'schriftfuehrer'
    when 'rechnungspruefer' then 'rechnungspruefer'
    when 'mitglied' then 'mitglied'
    else 'mitglied'
  end
$$;

insert into public.user_roles (auth_user_id, role_key)
select distinct auth_user_id, public.legacy_app_role_to_rbac_role(app_role)
from public.members
where auth_user_id is not null
on conflict do nothing;

create or replace function public.has_app_permission(p_module text, p_action text default 'view')
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with requested_permission as (
    select key
    from public.permissions
    where module = p_module
      and action = p_action
  ),
  caller as (
    select auth.uid() as uid
  )
  select coalesce((
    select false
    from caller, requested_permission rp
    where exists (
      select 1
      from public.user_permissions up
      where up.auth_user_id = caller.uid
        and up.permission_key = rp.key
        and up.effect = 'deny'
    )
    limit 1
  ), (
    select true
    from caller, requested_permission rp
    where exists (
      select 1
      from public.user_permissions up
      where up.auth_user_id = caller.uid
        and up.permission_key = rp.key
        and up.effect = 'allow'
    )
    or exists (
      select 1
      from public.user_roles ur
      join public.role_permissions rperm on rperm.role_key = ur.role_key
      where ur.auth_user_id = caller.uid
        and rperm.permission_key = rp.key
    )
    or exists (
      select 1
      from public.members m
      join public.role_permissions rperm
        on rperm.role_key = public.legacy_app_role_to_rbac_role(m.app_role)
      where m.auth_user_id = caller.uid
        and rperm.permission_key = rp.key
    )
    limit 1
  ), false);
$$;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_app_permission('systemeinstellungen', 'edit')
    or exists (
      select 1
      from public.members
      where auth_user_id = auth.uid()
        and app_role in ('admin', 'super_admin', 'administrator')
    )
$$;

create or replace function public.can_manage_events()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_app_permission('events', 'edit')
$$;

create or replace function public.can_manage_members()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_app_permission('mitglieder', 'edit')
$$;

create or replace function public.can_manage_cash()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_app_permission('kassa', 'edit')
$$;

create or replace function public.can_manage_sponsors()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_app_permission('sponsoren', 'edit')
$$;

create or replace function public.can_manage_media()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_app_permission('medien_presse', 'edit')
$$;

create or replace function public.can_manage_merch()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_app_permission('shop', 'edit')
$$;

create or replace function public.can_manage_merch_sales()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_app_permission('shop', 'edit')
    or public.has_app_permission('kassa', 'edit')
$$;

create or replace function public.is_purchase_manager_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_app_permission('einkauf', 'edit')
    or exists (
      select 1
      from public.members
      where auth_user_id = auth.uid()
        and role in (
          'obmann',
          'obmann_stv',
          'schriftfuehrer',
          'schriftfuehrer_stv',
          'kassier',
          'kassier_stv',
          'vorstandsmitglied'
        )
    )
$$;

create or replace function public.can_manage_virtual_bastard_knowledge()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_app_permission('homepage', 'edit')
    or exists (
      select 1
      from public.members
      where auth_user_id = auth.uid()
        and role in (
          'obmann',
          'obmann_stv',
          'schriftfuehrer',
          'schriftfuehrer_stv',
          'kassier',
          'kassier_stv',
          'vorstandsmitglied'
        )
    )
$$;

drop policy if exists "authenticated users can read roles" on public.roles;
create policy "authenticated users can read roles"
  on public.roles for select
  to authenticated
  using (true);

drop policy if exists "authenticated users can read permissions" on public.permissions;
create policy "authenticated users can read permissions"
  on public.permissions for select
  to authenticated
  using (true);

drop policy if exists "admins can manage roles" on public.roles;
create policy "admins can manage roles"
  on public.roles for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "admins can manage permissions" on public.permissions;
create policy "admins can manage permissions"
  on public.permissions for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "admins can manage role permissions" on public.role_permissions;
create policy "admins can manage role permissions"
  on public.role_permissions for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "users can read own roles" on public.user_roles;
create policy "users can read own roles"
  on public.user_roles for select
  to authenticated
  using (auth_user_id = auth.uid() or public.is_admin_user());

drop policy if exists "admins can manage user roles" on public.user_roles;
create policy "admins can manage user roles"
  on public.user_roles for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "users can read own permission overrides" on public.user_permissions;
create policy "users can read own permission overrides"
  on public.user_permissions for select
  to authenticated
  using (auth_user_id = auth.uid() or public.is_admin_user());

drop policy if exists "admins can manage user permission overrides" on public.user_permissions;
create policy "admins can manage user permission overrides"
  on public.user_permissions for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

revoke all on function public.has_app_permission(text, text) from public;
revoke all on function public.has_app_permission(text, text) from anon;
grant execute on function public.has_app_permission(text, text) to authenticated;

revoke all on function public.can_manage_members() from public;
revoke all on function public.can_manage_members() from anon;
grant execute on function public.can_manage_members() to authenticated;

revoke all on function public.can_manage_cash() from public;
revoke all on function public.can_manage_cash() from anon;
grant execute on function public.can_manage_cash() to authenticated;

revoke all on function public.can_manage_sponsors() from public;
revoke all on function public.can_manage_sponsors() from anon;
grant execute on function public.can_manage_sponsors() to authenticated;

revoke all on function public.can_manage_media() from public;
revoke all on function public.can_manage_media() from anon;
grant execute on function public.can_manage_media() to authenticated;

revoke all on function public.can_manage_merch() from public;
revoke all on function public.can_manage_merch() from anon;
grant execute on function public.can_manage_merch() to authenticated;

revoke all on function public.can_manage_merch_sales() from public;
revoke all on function public.can_manage_merch_sales() from anon;
grant execute on function public.can_manage_merch_sales() to authenticated;

revoke all on function public.is_purchase_manager_user() from public;
revoke all on function public.is_purchase_manager_user() from anon;
grant execute on function public.is_purchase_manager_user() to authenticated;

revoke all on function public.can_manage_virtual_bastard_knowledge() from public;
revoke all on function public.can_manage_virtual_bastard_knowledge() from anon;
grant execute on function public.can_manage_virtual_bastard_knowledge() to authenticated;
