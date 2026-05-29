alter table public.shop_orders
  drop constraint if exists shop_orders_payment_method_check;

alter table public.shop_orders
  add constraint shop_orders_payment_method_check
  check (payment_method in ('bar', 'ueberweisung', 'vereinskonto', 'sonstiges', 'pending'));

create or replace function public.create_public_shop_order(
  p_merch_item_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text default null,
  p_quantity integer default 1,
  p_fulfillment_method text default 'pickup',
  p_shipping_address text default null,
  p_customer_note text default null
)
returns table (
  shop_order_id uuid,
  shop_order_item_id uuid,
  order_number text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.merch_items%rowtype;
  v_variant public.merch_variants%rowtype;
  v_order_id uuid;
  v_order_item_id uuid;
  v_order_number text;
  v_unit_price_cents integer;
  v_subtotal_cents integer;
  v_shipping_cost_cents integer := 0;
  v_total_cents integer;
  v_notes text;
begin
  if p_merch_item_id is null then
    raise exception 'merch_item_id is required';
  end if;

  if nullif(trim(coalesce(p_customer_name, '')), '') is null then
    raise exception 'customer_name is required';
  end if;

  if nullif(trim(coalesce(p_customer_email, '')), '') is null
    or trim(p_customer_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  then
    raise exception 'valid customer_email is required';
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'quantity must be at least 1';
  end if;

  if coalesce(p_fulfillment_method, '') not in ('pickup', 'shipping') then
    raise exception 'fulfillment_method must be pickup or shipping';
  end if;

  if p_fulfillment_method = 'shipping'
    and nullif(trim(coalesce(p_shipping_address, '')), '') is null
  then
    raise exception 'shipping_address is required for shipping';
  end if;

  select *
    into v_item
  from public.merch_items
  where id = p_merch_item_id
    and status = 'active'
    and is_public = true;

  if not found then
    raise exception 'public merch item not found or inactive';
  end if;

  if p_fulfillment_method = 'pickup' and v_item.pickup_available = false then
    raise exception 'pickup is not available for this item';
  end if;

  if p_fulfillment_method = 'shipping' and v_item.shipping_available = false then
    raise exception 'shipping is not available for this item';
  end if;

  select *
    into v_variant
  from public.merch_variants
  where merch_item_id = v_item.id
    and status = 'active'
    and is_public = true
    and stock_quantity >= p_quantity
  order by public_sort_order asc, sort_order asc, created_at asc
  for update
  limit 1;

  if not found then
    raise exception 'item is sold out or requested quantity is not available';
  end if;

  v_unit_price_cents := coalesce(v_variant.price_cents, v_item.base_price_cents, 0);
  v_subtotal_cents := p_quantity * v_unit_price_cents;
  v_shipping_cost_cents := case
    when p_fulfillment_method = 'shipping' then coalesce(v_item.shipping_cost_cents, 0)
    else 0
  end;
  v_total_cents := v_subtotal_cents + v_shipping_cost_cents;
  v_order_number := public.next_shop_order_number(current_date);
  v_notes := concat_ws(E'\n',
    nullif(trim(coalesce(p_customer_note, '')), ''),
    case
      when p_fulfillment_method = 'shipping'
      then 'Versandadresse: ' || trim(p_shipping_address)
      else null
    end,
    'Öffentliche Bestellanfrage über Homepage'
  );

  insert into public.shop_orders (
    order_number,
    order_date,
    status,
    payment_status,
    payment_method,
    delivery_method,
    currency,
    subtotal_cents,
    discount_cents,
    shipping_cost_cents,
    total_cents,
    buyer_name,
    buyer_email,
    buyer_phone,
    notes
  )
  values (
    v_order_number,
    current_date,
    'new',
    'open',
    'pending',
    p_fulfillment_method,
    'EUR',
    v_subtotal_cents,
    0,
    v_shipping_cost_cents,
    v_total_cents,
    trim(p_customer_name),
    lower(trim(p_customer_email)),
    nullif(trim(coalesce(p_customer_phone, '')), ''),
    v_notes
  )
  returning id into v_order_id;

  insert into public.shop_order_items (
    shop_order_id,
    merch_item_id,
    merch_variant_id,
    item_name,
    item_number,
    variant_name,
    sku,
    size,
    color,
    quantity,
    unit_price_cents,
    member_price_cents,
    subtotal_cents,
    discount_cents,
    total_cents,
    currency
  )
  values (
    v_order_id,
    v_item.id,
    v_variant.id,
    v_item.name,
    v_item.item_number,
    v_variant.variant_name,
    v_variant.sku,
    v_variant.size,
    v_variant.color,
    p_quantity,
    v_unit_price_cents,
    v_item.member_price_cents,
    v_subtotal_cents,
    0,
    v_subtotal_cents,
    'EUR'
  )
  returning id into v_order_item_id;

  update public.merch_variants
  set
    stock_quantity = stock_quantity - p_quantity,
    status = case when stock_quantity - p_quantity <= 0 then 'sold_out' else status end
  where id = v_variant.id;

  shop_order_id := v_order_id;
  shop_order_item_id := v_order_item_id;
  order_number := v_order_number;

  return next;
end;
$$;

revoke all on function public.create_public_shop_order(uuid, text, text, text, integer, text, text, text) from public;
grant execute on function public.create_public_shop_order(uuid, text, text, text, integer, text, text, text) to anon;
grant execute on function public.create_public_shop_order(uuid, text, text, text, integer, text, text, text) to authenticated;

revoke select, insert, update, delete on public.shop_orders from anon;
revoke select, insert, update, delete on public.shop_order_items from anon;
