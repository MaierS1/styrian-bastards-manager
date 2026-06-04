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
  v_item record;
begin
  if not public.can_manage_merch_sales() then
    raise exception 'Keine Berechtigung zum Loeschen von Shop-Bestellungen.';
  end if;

  select *
    into v_order
  from public.shop_orders
  where id = p_shop_order_id
  for update;

  if not found then
    raise exception 'Shop-Bestellung nicht gefunden: %', p_shop_order_id;
  end if;

  if v_order.cash_entry_id is not null then
    raise exception 'Diese Shop-Bestellung hat bereits einen Kassa-Eintrag und kann nicht geloescht werden.';
  end if;

  if v_order.payment_status <> 'open' then
    raise exception 'Nur offene Shop-Bestellungen koennen geloescht werden.';
  end if;

  if v_order.status in ('shipped', 'completed', 'cancelled') then
    raise exception 'Versendete, abgeschlossene oder stornierte Shop-Bestellungen koennen nicht geloescht werden.';
  end if;

  for v_item in
    select
      shop_order_items.merch_variant_id,
      shop_order_items.quantity
    from public.shop_order_items
    where shop_order_items.shop_order_id = v_order.id
      and shop_order_items.merch_variant_id is not null
  loop
    update public.merch_variants
    set
      stock_quantity = coalesce(merch_variants.stock_quantity, 0) + v_item.quantity,
      status = case
        when merch_variants.status = 'sold_out'
          and coalesce(merch_variants.stock_quantity, 0) + v_item.quantity > 0
          then 'active'
        else merch_variants.status
      end,
      updated_at = now()
    where merch_variants.id = v_item.merch_variant_id;
  end loop;

  delete from public.shop_orders
  where shop_orders.id = v_order.id;

  shop_order_id := v_order.id;
  order_number := v_order.order_number;

  return next;
end;
$$;

revoke all on function public.delete_open_merch_order(uuid) from public;
grant execute on function public.delete_open_merch_order(uuid) to authenticated;
