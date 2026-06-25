-- Emergency rollback for the RBAC migrations:
--   20260625160000_prepare_rbac_permissions.sql
--   20260625170000_refine_rbac_legacy_grants_and_merch_storno.sql
--
-- Goal:
--   Restore the legacy app_role-driven behavior for the current app code
--   without deleting production data.
--
-- Safety:
--   - RBAC tables remain in place by default.
--   - No tables are dropped in this migration.
--   - Hard drops are documented in the commented emergency block below.
--
-- Reset scope:
--   - public.legacy_app_role_to_rbac_role(text)
--   - public.has_app_permission(text, text)
--   - public.is_admin_user()
--   - public.can_manage_events()
--   - public.can_manage_members()
--   - public.can_manage_cash()
--   - public.can_manage_sponsors()
--   - public.can_manage_media()
--   - public.can_manage_merch()
--   - public.can_manage_merch_sales()
--   - public.is_purchase_manager_user()
--   - public.can_manage_virtual_bastard_knowledge()
--   - public.cancel_merch_sale(uuid, text)

create or replace function public.legacy_app_role_to_rbac_role(p_app_role text)
returns text
language sql
stable
as $$
  select case coalesce(p_app_role, '')
    when 'admin' then 'admin'
    when 'cashier' then 'cashier'
    when 'members' then 'members'
    when 'checkin' then 'checkin'
    when 'readonly' then 'readonly'
    else coalesce(nullif(trim(p_app_role), ''), 'readonly')
  end
$$;

create or replace function public.has_app_permission(p_module text, p_action text default 'view')
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with current_member as (
    select m.app_role, m.role
    from public.members m
    where m.auth_user_id = auth.uid()
    limit 1
  )
  select coalesce((
    select case
      when cm.app_role = 'admin' then true
      when p_module in ('systemeinstellungen', 'backup') then cm.app_role = 'admin'
      when p_module = 'mitglieder' then
        case
          when p_action = 'view' then cm.app_role in ('admin', 'members', 'readonly')
            or cm.role in ('obmann', 'obmann_stv', 'schriftfuehrer', 'schriftfuehrer_stv', 'vorstandsmitglied')
          else cm.app_role in ('admin', 'members')
            or cm.role in ('obmann', 'obmann_stv', 'schriftfuehrer', 'schriftfuehrer_stv', 'vorstandsmitglied')
        end
      when p_module in ('beitraege', 'kassa', 'rechnungen') then
        case
          when p_action = 'view' then cm.app_role in ('admin', 'cashier', 'readonly')
            or cm.role in ('kassier', 'kassier_stv', 'rechnungspruefer', 'vorstandsmitglied')
          else cm.app_role in ('admin', 'cashier')
            or cm.role in ('kassier', 'kassier_stv')
        end
      when p_module = 'events' then
        case
          when p_action = 'view' then cm.app_role in ('admin', 'members', 'checkin', 'readonly')
            or cm.role in ('obmann', 'obmann_stv', 'schriftfuehrer', 'schriftfuehrer_stv', 'vorstandsmitglied')
          else cm.app_role in ('admin', 'checkin', 'members')
            or cm.role in ('obmann', 'obmann_stv', 'schriftfuehrer', 'schriftfuehrer_stv', 'vorstandsmitglied')
        end
      when p_module in ('dokumente', 'sponsoren', 'medien_presse', 'shop', 'inventar', 'homepage') then
        case
          when p_action = 'view' then cm.app_role in ('admin', 'members', 'cashier', 'checkin', 'readonly')
            or cm.role in (
              'obmann',
              'obmann_stv',
              'schriftfuehrer',
              'schriftfuehrer_stv',
              'kassier',
              'kassier_stv',
              'vorstandsmitglied'
            )
          else cm.app_role in ('admin', 'members')
            or cm.role in (
              'obmann',
              'obmann_stv',
              'schriftfuehrer',
              'schriftfuehrer_stv',
              'kassier',
              'kassier_stv',
              'vorstandsmitglied'
            )
        end
      when p_module = 'einkauf' then
        case
          when p_action = 'view' then cm.app_role in ('admin', 'cashier', 'readonly')
            or cm.role in (
              'obmann',
              'obmann_stv',
              'schriftfuehrer',
              'schriftfuehrer_stv',
              'kassier',
              'kassier_stv',
              'vorstandsmitglied'
            )
          else cm.app_role in ('admin', 'cashier')
            or cm.role in (
              'obmann',
              'obmann_stv',
              'schriftfuehrer',
              'schriftfuehrer_stv',
              'kassier',
              'kassier_stv',
              'vorstandsmitglied'
            )
        end
      else false
    end
    from current_member cm
  ), false);
$$;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where auth_user_id = auth.uid()
      and app_role = 'admin'
  )
$$;

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

create or replace function public.can_manage_members()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where auth_user_id = auth.uid()
      and app_role in ('admin', 'members')
  );
$$;

create or replace function public.can_manage_cash()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where auth_user_id = auth.uid()
      and app_role in ('admin', 'cashier')
  );
$$;

create or replace function public.can_manage_sponsors()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where members.auth_user_id = auth.uid()
      and members.app_role in ('admin', 'members')
  );
$$;

create or replace function public.can_manage_media()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where members.auth_user_id = auth.uid()
      and members.app_role in ('admin', 'members')
  );
$$;

create or replace function public.can_manage_merch()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where members.auth_user_id = auth.uid()
      and members.app_role in ('admin', 'members')
  );
$$;

create or replace function public.can_manage_merch_sales()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where members.auth_user_id = auth.uid()
      and members.app_role in ('admin', 'members', 'cashier')
  );
$$;

create or replace function public.is_purchase_manager_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where auth_user_id = auth.uid()
      and (
        app_role in ('admin', 'cashier')
        or role in (
          'obmann',
          'obmann_stv',
          'schriftfuehrer',
          'schriftfuehrer_stv',
          'kassier',
          'kassier_stv'
        )
      )
  );
$$;

create or replace function public.can_manage_virtual_bastard_knowledge()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where auth_user_id = auth.uid()
      and (
        app_role = 'admin'
        or role in ('obmann', 'obmann_stv', 'schriftfuehrer', 'schriftfuehrer_stv', 'kassier', 'kassier_stv')
      )
  );
$$;

create or replace function public.cancel_merch_sale(
  p_merch_sale_id uuid,
  p_cancellation_reason text default null
)
returns table (
  merch_sale_id uuid,
  cash_entry_id uuid,
  restored_items integer,
  restored_quantity integer,
  cancelled_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.merch_sales%rowtype;
  v_item record;
  v_cancelled_at timestamptz := now();
  v_restored_items integer := 0;
  v_restored_quantity integer := 0;
begin
  if not public.can_manage_merch_sales() then
    raise exception 'permission denied for merch sale';
  end if;

  if p_merch_sale_id is null then
    raise exception 'merch_sale_id is required';
  end if;

  select *
    into v_sale
  from public.merch_sales
  where id = p_merch_sale_id
  for update;

  if not found then
    raise exception 'merch_sale not found: %', p_merch_sale_id;
  end if;

  if v_sale.status = 'cancelled' then
    raise exception 'merch_sale % is already cancelled', p_merch_sale_id;
  end if;

  if v_sale.status <> 'completed' then
    raise exception 'merch_sale % cannot be cancelled from status %',
      p_merch_sale_id,
      v_sale.status;
  end if;

  for v_item in
    select merch_variant_id, quantity
    from public.merch_sale_items
    where merch_sale_id = p_merch_sale_id
  loop
    update public.merch_variants
    set stock_quantity = stock_quantity + v_item.quantity
    where id = v_item.merch_variant_id;

    if not found then
      raise exception 'merch_variant not found while cancelling merch_sale %: %',
        p_merch_sale_id,
        v_item.merch_variant_id;
    end if;

    v_restored_items := v_restored_items + 1;
    v_restored_quantity := v_restored_quantity + v_item.quantity;
  end loop;

  if v_restored_items = 0 then
    raise exception 'merch_sale % has no sale items', p_merch_sale_id;
  end if;

  if v_sale.cash_entry_id is not null then
    update public.cash_entries
    set is_cancelled = true
    where id = v_sale.cash_entry_id;
  end if;

  update public.merch_sales
  set
    status = 'cancelled',
    cancellation_reason = nullif(trim(coalesce(p_cancellation_reason, '')), ''),
    cancelled_at = v_cancelled_at
  where id = p_merch_sale_id;

  merch_sale_id := v_sale.id;
  cash_entry_id := v_sale.cash_entry_id;
  restored_items := v_restored_items;
  restored_quantity := v_restored_quantity;
  cancelled_at := v_cancelled_at;

  return next;
end;
$$;

revoke all on function public.has_app_permission(text, text) from public;
revoke all on function public.has_app_permission(text, text) from anon;
grant execute on function public.has_app_permission(text, text) to authenticated;

revoke all on function public.legacy_app_role_to_rbac_role(text) from public;
revoke all on function public.legacy_app_role_to_rbac_role(text) from anon;
grant execute on function public.legacy_app_role_to_rbac_role(text) to authenticated;

revoke all on function public.is_admin_user() from public;
revoke all on function public.is_admin_user() from anon;
grant execute on function public.is_admin_user() to authenticated;

revoke all on function public.can_manage_events() from public;
revoke all on function public.can_manage_events() from anon;
grant execute on function public.can_manage_events() to authenticated;

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

-- Emergency only, after verified backup and only if the app has already been
-- switched back off the RBAC helpers:
--   drop table if exists public.user_permissions cascade;
--   drop table if exists public.user_roles cascade;
--   drop table if exists public.role_permissions cascade;
--   drop table if exists public.permissions cascade;
--   drop table if exists public.roles cascade;
--
-- Do not run the block above during a normal rollback. It removes audit data and
-- can break any remaining code that still expects the RBAC tables to exist.
