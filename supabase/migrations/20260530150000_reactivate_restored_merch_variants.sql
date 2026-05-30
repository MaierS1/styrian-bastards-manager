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
as $$
declare
  v_sale public.merch_sales%rowtype;
  v_item record;
  v_cancelled_at timestamptz := now();
  v_restored_items integer := 0;
  v_restored_quantity integer := 0;
begin
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
    set
      stock_quantity = stock_quantity + v_item.quantity,
      status = case
        when stock_quantity + v_item.quantity > 0 then 'active'
        else 'sold_out'
      end
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
