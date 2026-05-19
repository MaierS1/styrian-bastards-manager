create or replace function public.create_merch_sale(
  p_merch_variant_id uuid,
  p_quantity integer,
  p_unit_price_cents integer,
  p_discount_cents integer default 0,
  p_sale_date date default current_date,
  p_payment_method text default 'bar',
  p_member_id uuid default null,
  p_event_id uuid default null,
  p_buyer_name text default null,
  p_notes text default null,
  p_create_cash_entry boolean default true,
  p_receipt_number text default null
)
returns table (
  merch_sale_id uuid,
  merch_sale_item_id uuid,
  cash_entry_id uuid,
  remaining_stock integer
)
language plpgsql
as $$
declare
  v_variant public.merch_variants%rowtype;
  v_sale_id uuid;
  v_sale_item_id uuid;
  v_cash_entry_id uuid;
  v_sale_date date := coalesce(p_sale_date, current_date);
  v_merch_item_id uuid;
  v_subtotal_cents integer;
  v_total_cents integer;
begin
  if p_merch_variant_id is null then
    raise exception 'merch_variant_id is required';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be greater than 0';
  end if;

  if p_unit_price_cents is null or p_unit_price_cents < 0 then
    raise exception 'unit_price_cents must be greater than or equal to 0';
  end if;

  if p_discount_cents is null or p_discount_cents < 0 then
    raise exception 'discount_cents must be greater than or equal to 0';
  end if;

  if coalesce(p_payment_method, '') not in ('bar', 'karte', 'ueberweisung', 'ebanking', 'sonstiges') then
    raise exception 'invalid payment_method: %', p_payment_method;
  end if;

  select *
    into v_variant
  from public.merch_variants
  where id = p_merch_variant_id
  for update;

  if not found then
    raise exception 'merch_variant not found: %', p_merch_variant_id;
  end if;

  if v_variant.stock_quantity < p_quantity then
    raise exception 'not enough stock for merch_variant %, available %, requested %',
      p_merch_variant_id,
      v_variant.stock_quantity,
      p_quantity;
  end if;

  v_merch_item_id := v_variant.merch_item_id;

  if v_merch_item_id is null then
    raise exception 'merch_variant % is not linked to a merch_item', p_merch_variant_id;
  end if;

  v_subtotal_cents := p_quantity * p_unit_price_cents;

  if p_discount_cents > v_subtotal_cents then
    raise exception 'discount_cents must not exceed subtotal_cents';
  end if;

  v_total_cents := v_subtotal_cents - p_discount_cents;

  if p_create_cash_entry then
    insert into public.cash_entries (
      entry_date,
      entry_year,
      receipt_number,
      is_cancelled,
      type,
      category,
      event_id,
      payment_method,
      is_opening,
      amount,
      description,
      receipt_url,
      member_id
    )
    values (
      v_sale_date,
      extract(year from v_sale_date)::integer,
      nullif(trim(coalesce(p_receipt_number, '')), ''),
      false,
      'einnahme',
      'fanartikel',
      p_event_id,
      p_payment_method,
      false,
      v_total_cents::numeric / 100,
      coalesce(nullif(trim(p_notes), ''), 'Fanartikel-Verkauf'),
      null,
      p_member_id
    )
    returning id into v_cash_entry_id;
  end if;

  insert into public.merch_sales (
    sale_date,
    member_id,
    event_id,
    cash_entry_id,
    status,
    payment_method,
    currency,
    subtotal_cents,
    discount_cents,
    total_cents,
    buyer_name,
    notes
  )
  values (
    v_sale_date,
    p_member_id,
    p_event_id,
    v_cash_entry_id,
    'completed',
    p_payment_method,
    'EUR',
    v_subtotal_cents,
    p_discount_cents,
    v_total_cents,
    nullif(trim(coalesce(p_buyer_name, '')), ''),
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning id into v_sale_id;

  insert into public.merch_sale_items (
    merch_sale_id,
    merch_variant_id,
    quantity,
    unit_price_cents,
    subtotal_cents,
    discount_cents,
    total_cents,
    notes
  )
  values (
    v_sale_id,
    p_merch_variant_id,
    p_quantity,
    p_unit_price_cents,
    v_subtotal_cents,
    p_discount_cents,
    v_total_cents,
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning id into v_sale_item_id;

  update public.merch_variants
  set stock_quantity = stock_quantity - p_quantity
  where id = p_merch_variant_id
  returning stock_quantity into remaining_stock;

  merch_sale_id := v_sale_id;
  merch_sale_item_id := v_sale_item_id;
  cash_entry_id := v_cash_entry_id;

  return next;
end;
$$;
