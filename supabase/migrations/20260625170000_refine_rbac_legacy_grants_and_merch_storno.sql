create or replace function public.legacy_app_role_to_rbac_role(p_app_role text)
returns text
language sql
stable
as $$
  select case coalesce(p_app_role, '')
    when 'admin' then 'super_admin'
    when 'cashier' then 'kassier'
    when 'members' then 'mitglied'
    when 'checkin' then 'mitglied'
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

update public.user_roles ur
set role_key = 'mitglied'
from public.members m
where ur.auth_user_id = m.auth_user_id
  and m.app_role in ('members', 'checkin', 'readonly')
  and ur.role_key <> 'mitglied';

update public.user_roles ur
set role_key = 'kassier'
from public.members m
where ur.auth_user_id = m.auth_user_id
  and m.app_role = 'cashier'
  and ur.role_key <> 'kassier';

insert into public.user_permissions (auth_user_id, permission_key, effect)
select distinct m.auth_user_id, perm.permission_key, 'allow'
from public.members m
join (
  select 'members'::text as app_role, permission_key
  from (
    values
      ('mitglieder.view'),
      ('mitglieder.create'),
      ('mitglieder.edit'),
      ('dokumente.view'),
      ('dokumente.create'),
      ('dokumente.edit'),
      ('events.view'),
      ('sponsoren.view'),
      ('sponsoren.create'),
      ('sponsoren.edit'),
      ('sponsoren.delete'),
      ('medien_presse.view'),
      ('medien_presse.create'),
      ('medien_presse.edit'),
      ('medien_presse.delete'),
      ('shop.view'),
      ('shop.create'),
      ('shop.edit'),
      ('shop.delete'),
      ('inventar.view'),
      ('inventar.create'),
      ('inventar.edit')
  ) as legacy_permissions(permission_key)

  union all

  select 'cashier'::text as app_role, permission_key
  from (
    values
      ('beitraege.view'),
      ('kassa.view'),
      ('kassa.create'),
      ('kassa.edit'),
      ('kassa.delete'),
      ('rechnungen.view'),
      ('rechnungen.create'),
      ('rechnungen.edit'),
      ('shop.view'),
      ('shop.create'),
      ('shop.edit'),
      ('einkauf.view'),
      ('einkauf.create'),
      ('einkauf.edit')
  ) as legacy_permissions(permission_key)

  union all

  select 'checkin'::text as app_role, permission_key
  from (
    values
      ('events.view'),
      ('events.create'),
      ('events.edit')
  ) as legacy_permissions(permission_key)

  union all

  select 'readonly'::text as app_role, permission_key
  from (
    values
      ('events.view'),
      ('dokumente.view')
  ) as legacy_permissions(permission_key)
) as perm
  on perm.app_role = m.app_role
where m.auth_user_id is not null
  and m.app_role in ('members', 'cashier', 'checkin', 'readonly')
on conflict (auth_user_id, permission_key) do update
set effect = excluded.effect,
    assigned_at = now();

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
  v_invoice public.invoices%rowtype;
  v_existing_cancellation_id uuid;
  v_cancellation_id uuid;
  v_cancellation_number text;
  v_cancelled_at timestamptz := now();
  v_restored_items integer := 0;
  v_restored_quantity integer := 0;
  v_reason text := nullif(trim(coalesce(p_cancellation_reason, '')), '');
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
    where public.merch_sale_items.merch_sale_id = p_merch_sale_id
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
    set
      is_cancelled = true,
      cancelled_at = v_cancelled_at,
      cancellation_reason = v_reason
    where id = v_sale.cash_entry_id;
  end if;

  if v_sale.invoice_id is not null then
    if not public.has_app_permission('rechnungen', 'delete') then
      raise exception 'only users with invoice delete permission can cancel merch sales with invoices';
    end if;

    select *
      into v_invoice
    from public.invoices
    where id = v_sale.invoice_id
    for update;

    if found and v_invoice.status <> 'storniert' then
      select id
        into v_existing_cancellation_id
      from public.invoices
      where original_invoice_id = v_invoice.id
        and invoice_type = 'storno'
      limit 1;

      if v_existing_cancellation_id is null then
        v_cancellation_number := public.get_next_cancellation_invoice_number(
          extract(year from coalesce(v_invoice.issue_date, current_date))::integer,
          coalesce(v_invoice.is_test, false)
        );

        insert into public.invoices (
          invoice_number,
          customer_id,
          customer_name,
          customer_email,
          customer_address,
          customer_street,
          customer_house_number,
          customer_address_addition,
          customer_postal_code,
          customer_city,
          customer_country,
          issue_date,
          due_date,
          status,
          invoice_type,
          original_invoice_id,
          notes,
          created_by,
          member_id,
          membership_fee_id,
          is_test
        )
        values (
          v_cancellation_number,
          v_invoice.customer_id,
          v_invoice.customer_name,
          v_invoice.customer_email,
          v_invoice.customer_address,
          v_invoice.customer_street,
          v_invoice.customer_house_number,
          v_invoice.customer_address_addition,
          v_invoice.customer_postal_code,
          v_invoice.customer_city,
          v_invoice.customer_country,
          current_date,
          current_date,
          'storniert',
          'storno',
          v_invoice.id,
          v_reason,
          auth.uid(),
          v_invoice.member_id,
          v_invoice.membership_fee_id,
          coalesce(v_invoice.is_test, false)
        )
        returning id into v_cancellation_id;

        insert into public.invoice_items (
          invoice_id,
          description,
          quantity,
          unit_price,
          total_price
        )
        select
          v_cancellation_id,
          'Storno: ' || coalesce(description, ''),
          quantity,
          -abs(unit_price),
          -abs(total_price)
        from public.invoice_items
        where invoice_id = v_invoice.id;
      else
        v_cancellation_id := v_existing_cancellation_id;
      end if;
    end if;
  end if;

  update public.merch_sales
  set
    status = 'cancelled',
    cancelled_at = v_cancelled_at,
    cancellation_reason = v_reason,
    updated_at = now()
  where id = p_merch_sale_id;

  merch_sale_id := p_merch_sale_id;
  cash_entry_id := v_sale.cash_entry_id;
  restored_items := v_restored_items;
  restored_quantity := v_restored_quantity;
  cancelled_at := v_cancelled_at;
  return next;
end;
$$;
