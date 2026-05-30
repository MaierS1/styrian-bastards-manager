create or replace function public.delete_open_merch_order(
  p_shop_order_id uuid
)
returns table (
  shop_order_id uuid,
  order_number text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.shop_orders%rowtype;
begin
  if not public.can_manage_merch_sales() then
    raise exception 'Keine Berechtigung zum Löschen von Shop-Bestellungen.';
  end if;

  select *
    into v_order
  from public.shop_orders
  where id = p_shop_order_id
  for update;

  if not found then
    raise exception 'Shop-Bestellung nicht gefunden: %', p_shop_order_id;
  end if;

  if v_order.status <> 'new' or v_order.payment_status <> 'open' then
    raise exception 'Nur offene Shop-Bestellungen können gelöscht werden.';
  end if;

  if v_order.cash_entry_id is not null then
    raise exception 'Diese Shop-Bestellung hat bereits einen Kassa-Eintrag und kann nicht gelöscht werden.';
  end if;

  delete from public.shop_orders
  where id = v_order.id;

  shop_order_id := v_order.id;
  order_number := v_order.order_number;

  return next;
end;
$$;

revoke all on function public.delete_open_merch_order(uuid) from public;
grant execute on function public.delete_open_merch_order(uuid) to authenticated;
