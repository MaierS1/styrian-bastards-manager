create table if not exists public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  order_date date not null default current_date,
  member_id uuid references public.members(id) on delete set null,
  cash_entry_id uuid unique references public.cash_entries(id) on delete set null,
  status text not null default 'new',
  payment_status text not null default 'open',
  payment_method text not null default 'bar',
  delivery_method text not null default 'pickup',
  currency char(3) not null default 'EUR',
  subtotal_cents integer not null default 0,
  discount_cents integer not null default 0,
  shipping_cost_cents integer not null default 0,
  total_cents integer not null default 0,
  buyer_name text,
  buyer_email text,
  buyer_phone text,
  notes text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint shop_orders_status_check check (
    status in ('new', 'processing', 'ready_for_pickup', 'shipped', 'completed', 'cancelled')
  ),
  constraint shop_orders_payment_status_check check (
    payment_status in ('open', 'partially_paid', 'paid', 'refunded', 'cancelled')
  ),
  constraint shop_orders_payment_method_check check (
    payment_method in ('bar', 'ueberweisung', 'vereinskonto', 'sonstiges')
  ),
  constraint shop_orders_delivery_method_check check (delivery_method in ('pickup', 'shipping', 'mixed')),
  constraint shop_orders_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint shop_orders_subtotal_cents_check check (subtotal_cents >= 0),
  constraint shop_orders_discount_cents_check check (discount_cents >= 0),
  constraint shop_orders_shipping_cost_cents_check check (shipping_cost_cents >= 0),
  constraint shop_orders_total_cents_check check (total_cents >= 0),
  constraint shop_orders_total_matches_check check (total_cents = subtotal_cents - discount_cents + shipping_cost_cents),
  constraint shop_orders_discount_not_above_subtotal_check check (discount_cents <= subtotal_cents),
  constraint shop_orders_buyer_name_not_blank check (buyer_name is null or length(trim(buyer_name)) > 0),
  constraint shop_orders_buyer_email_not_blank check (buyer_email is null or length(trim(buyer_email)) > 0),
  constraint shop_orders_buyer_phone_not_blank check (buyer_phone is null or length(trim(buyer_phone)) > 0)
);

create table if not exists public.shop_order_items (
  id uuid primary key default gen_random_uuid(),
  shop_order_id uuid not null references public.shop_orders(id) on delete cascade,
  merch_item_id uuid references public.merch_items(id) on delete restrict,
  merch_variant_id uuid references public.merch_variants(id) on delete restrict,
  item_name text not null,
  item_number text,
  variant_name text,
  sku text,
  size text,
  color text,
  quantity integer not null,
  unit_price_cents integer not null,
  member_price_cents integer,
  subtotal_cents integer not null,
  discount_cents integer not null default 0,
  total_cents integer not null,
  currency char(3) not null default 'EUR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint shop_order_items_item_name_not_blank check (length(trim(item_name)) > 0),
  constraint shop_order_items_quantity_check check (quantity > 0),
  constraint shop_order_items_unit_price_cents_check check (unit_price_cents >= 0),
  constraint shop_order_items_member_price_cents_check check (member_price_cents is null or member_price_cents >= 0),
  constraint shop_order_items_subtotal_cents_check check (subtotal_cents = quantity * unit_price_cents),
  constraint shop_order_items_discount_cents_check check (discount_cents >= 0),
  constraint shop_order_items_total_cents_check check (total_cents >= 0),
  constraint shop_order_items_total_matches_discount_check check (total_cents = subtotal_cents - discount_cents),
  constraint shop_order_items_discount_not_above_subtotal_check check (discount_cents <= subtotal_cents),
  constraint shop_order_items_currency_check check (currency ~ '^[A-Z]{3}$')
);

alter table if exists public.cash_entries
  add column if not exists shop_order_id uuid references public.shop_orders(id) on delete set null;

create index if not exists shop_orders_order_date_idx on public.shop_orders (order_date);
create index if not exists shop_orders_status_idx on public.shop_orders (status);
create index if not exists shop_orders_payment_status_idx on public.shop_orders (payment_status);
create index if not exists shop_orders_member_id_idx on public.shop_orders (member_id);
create index if not exists shop_orders_cash_entry_id_idx on public.shop_orders (cash_entry_id);
create index if not exists shop_order_items_shop_order_id_idx on public.shop_order_items (shop_order_id);
create index if not exists shop_order_items_merch_variant_id_idx on public.shop_order_items (merch_variant_id);
create index if not exists cash_entries_shop_order_id_idx on public.cash_entries (shop_order_id);

drop trigger if exists set_shop_orders_updated_at on public.shop_orders;
create trigger set_shop_orders_updated_at
  before update on public.shop_orders
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_shop_order_items_updated_at on public.shop_order_items;
create trigger set_shop_order_items_updated_at
  before update on public.shop_order_items
  for each row
  execute function public.set_updated_at();

alter table public.shop_orders enable row level security;
alter table public.shop_order_items enable row level security;

drop policy if exists "Shop orders are manageable by merch roles" on public.shop_orders;
create policy "Shop orders are manageable by merch roles"
  on public.shop_orders
  for all
  to authenticated
  using (public.can_manage_merch_sales())
  with check (public.can_manage_merch_sales());

drop policy if exists "Shop order items are manageable by merch roles" on public.shop_order_items;
create policy "Shop order items are manageable by merch roles"
  on public.shop_order_items
  for all
  to authenticated
  using (public.can_manage_merch_sales())
  with check (public.can_manage_merch_sales());

create or replace function public.next_shop_order_number(p_order_date date default current_date)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix text := 'SHOP-' || to_char(coalesce(p_order_date, current_date), 'YYYY') || '-';
  v_next integer;
begin
  select coalesce(max(nullif(regexp_replace(order_number, '^' || v_prefix, ''), '')::integer), 0) + 1
    into v_next
  from public.shop_orders
  where order_number ~ ('^' || v_prefix || '[0-9]+$');

  return v_prefix || lpad(v_next::text, 4, '0');
end;
$$;

create or replace function public.create_shop_order(
  p_merch_variant_id uuid,
  p_quantity integer,
  p_unit_price_cents integer,
  p_discount_cents integer default 0,
  p_shipping_cost_cents integer default 0,
  p_order_date date default current_date,
  p_status text default 'new',
  p_payment_status text default 'open',
  p_payment_method text default 'bar',
  p_delivery_method text default 'pickup',
  p_member_id uuid default null,
  p_buyer_name text default null,
  p_buyer_email text default null,
  p_buyer_phone text default null,
  p_notes text default null,
  p_internal_notes text default null,
  p_receipt_number text default null
)
returns table (
  shop_order_id uuid,
  shop_order_item_id uuid,
  order_number text,
  cash_entry_id uuid,
  remaining_stock integer,
  is_below_reorder_level boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_variant public.merch_variants%rowtype;
  v_item public.merch_items%rowtype;
  v_order_id uuid;
  v_order_item_id uuid;
  v_cash_entry_id uuid;
  v_order_number text;
  v_order_date date := coalesce(p_order_date, current_date);
  v_subtotal_cents integer;
  v_item_total_cents integer;
  v_total_cents integer;
begin
  if not public.can_manage_merch_sales() then
    raise exception 'permission denied for shop order';
  end if;

  if p_merch_variant_id is null then
    raise exception 'merch_variant_id is required';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be greater than 0';
  end if;

  if p_unit_price_cents is null or p_unit_price_cents < 0 then
    raise exception 'unit_price_cents must be greater than or equal to 0';
  end if;

  if coalesce(p_discount_cents, 0) < 0 or coalesce(p_shipping_cost_cents, 0) < 0 then
    raise exception 'discount and shipping must be greater than or equal to 0';
  end if;

  if coalesce(p_status, '') not in ('new', 'processing', 'ready_for_pickup', 'shipped', 'completed', 'cancelled') then
    raise exception 'invalid status: %', p_status;
  end if;

  if coalesce(p_payment_status, '') not in ('open', 'partially_paid', 'paid', 'refunded', 'cancelled') then
    raise exception 'invalid payment_status: %', p_payment_status;
  end if;

  if coalesce(p_payment_method, '') not in ('bar', 'ueberweisung', 'vereinskonto', 'sonstiges') then
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

  select *
    into v_item
  from public.merch_items
  where id = v_variant.merch_item_id;

  if not found then
    raise exception 'merch_item not found for merch_variant %', p_merch_variant_id;
  end if;

  if v_variant.stock_quantity < p_quantity then
    raise exception 'not enough stock for merch_variant %, available %, requested %',
      p_merch_variant_id,
      v_variant.stock_quantity,
      p_quantity;
  end if;

  v_subtotal_cents := p_quantity * p_unit_price_cents;

  if p_discount_cents > v_subtotal_cents then
    raise exception 'discount_cents must not exceed subtotal_cents';
  end if;

  v_item_total_cents := v_subtotal_cents - p_discount_cents;
  v_total_cents := v_item_total_cents + coalesce(p_shipping_cost_cents, 0);
  v_order_number := public.next_shop_order_number(v_order_date);

  insert into public.shop_orders (
    order_number,
    order_date,
    member_id,
    status,
    payment_status,
    payment_method,
    delivery_method,
    subtotal_cents,
    discount_cents,
    shipping_cost_cents,
    total_cents,
    buyer_name,
    buyer_email,
    buyer_phone,
    notes,
    internal_notes
  )
  values (
    v_order_number,
    v_order_date,
    p_member_id,
    p_status,
    p_payment_status,
    p_payment_method,
    p_delivery_method,
    v_subtotal_cents,
    p_discount_cents,
    coalesce(p_shipping_cost_cents, 0),
    v_total_cents,
    nullif(trim(coalesce(p_buyer_name, '')), ''),
    nullif(trim(coalesce(p_buyer_email, '')), ''),
    nullif(trim(coalesce(p_buyer_phone, '')), ''),
    nullif(trim(coalesce(p_notes, '')), ''),
    nullif(trim(coalesce(p_internal_notes, '')), '')
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
    total_cents
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
    p_unit_price_cents,
    v_item.member_price_cents,
    v_subtotal_cents,
    p_discount_cents,
    v_item_total_cents
  )
  returning id into v_order_item_id;

  update public.merch_variants
  set
    stock_quantity = stock_quantity - p_quantity,
    status = case when stock_quantity - p_quantity <= 0 then 'sold_out' else status end
  where id = p_merch_variant_id
  returning stock_quantity into remaining_stock;

  if p_payment_status = 'paid' then
    insert into public.cash_entries (
      entry_date,
      entry_year,
      receipt_number,
      is_cancelled,
      type,
      category,
      payment_method,
      is_opening,
      amount,
      description,
      receipt_url,
      member_id,
      shop_order_id
    )
    values (
      v_order_date,
      extract(year from v_order_date)::integer,
      nullif(trim(coalesce(p_receipt_number, '')), ''),
      false,
      'einnahme',
      'fanartikel',
      p_payment_method,
      false,
      v_total_cents::numeric / 100,
      'Shop-Bestellung ' || v_order_number,
      null,
      p_member_id,
      v_order_id
    )
    returning id into v_cash_entry_id;

    update public.shop_orders
    set cash_entry_id = v_cash_entry_id
    where id = v_order_id;
  end if;

  shop_order_id := v_order_id;
  shop_order_item_id := v_order_item_id;
  order_number := v_order_number;
  cash_entry_id := v_cash_entry_id;
  is_below_reorder_level := remaining_stock <= coalesce(v_variant.reorder_level, 0);

  return next;
end;
$$;

create or replace function public.update_shop_order(
  p_shop_order_id uuid,
  p_status text,
  p_payment_status text,
  p_payment_method text,
  p_delivery_method text,
  p_member_id uuid default null,
  p_buyer_name text default null,
  p_buyer_email text default null,
  p_buyer_phone text default null,
  p_notes text default null,
  p_internal_notes text default null,
  p_receipt_number text default null
)
returns table (
  shop_order_id uuid,
  order_number text,
  cash_entry_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.shop_orders%rowtype;
  v_cash_entry_id uuid;
begin
  if not public.can_manage_merch_sales() then
    raise exception 'permission denied for shop order';
  end if;

  select *
    into v_order
  from public.shop_orders
  where id = p_shop_order_id
  for update;

  if not found then
    raise exception 'shop_order not found: %', p_shop_order_id;
  end if;

  if coalesce(p_status, '') not in ('new', 'processing', 'ready_for_pickup', 'shipped', 'completed', 'cancelled') then
    raise exception 'invalid status: %', p_status;
  end if;

  if coalesce(p_payment_status, '') not in ('open', 'partially_paid', 'paid', 'refunded', 'cancelled') then
    raise exception 'invalid payment_status: %', p_payment_status;
  end if;

  if coalesce(p_payment_method, '') not in ('bar', 'ueberweisung', 'vereinskonto', 'sonstiges') then
    raise exception 'invalid payment_method: %', p_payment_method;
  end if;

  v_cash_entry_id := v_order.cash_entry_id;

  if p_payment_status = 'paid' and v_cash_entry_id is null then
    insert into public.cash_entries (
      entry_date,
      entry_year,
      receipt_number,
      is_cancelled,
      type,
      category,
      payment_method,
      is_opening,
      amount,
      description,
      receipt_url,
      member_id,
      shop_order_id
    )
    values (
      v_order.order_date,
      extract(year from v_order.order_date)::integer,
      nullif(trim(coalesce(p_receipt_number, '')), ''),
      false,
      'einnahme',
      'fanartikel',
      p_payment_method,
      false,
      v_order.total_cents::numeric / 100,
      'Shop-Bestellung ' || v_order.order_number,
      null,
      p_member_id,
      v_order.id
    )
    returning id into v_cash_entry_id;
  end if;

  update public.shop_orders
  set
    status = p_status,
    payment_status = p_payment_status,
    payment_method = p_payment_method,
    delivery_method = p_delivery_method,
    member_id = p_member_id,
    buyer_name = nullif(trim(coalesce(p_buyer_name, '')), ''),
    buyer_email = nullif(trim(coalesce(p_buyer_email, '')), ''),
    buyer_phone = nullif(trim(coalesce(p_buyer_phone, '')), ''),
    notes = nullif(trim(coalesce(p_notes, '')), ''),
    internal_notes = nullif(trim(coalesce(p_internal_notes, '')), ''),
    cash_entry_id = v_cash_entry_id
  where id = v_order.id;

  shop_order_id := v_order.id;
  order_number := v_order.order_number;
  cash_entry_id := v_cash_entry_id;

  return next;
end;
$$;

revoke all on function public.next_shop_order_number(date) from public;
grant execute on function public.next_shop_order_number(date) to authenticated;

revoke all on function public.create_shop_order(uuid, integer, integer, integer, integer, date, text, text, text, text, uuid, text, text, text, text, text, text) from public;
grant execute on function public.create_shop_order(uuid, integer, integer, integer, integer, date, text, text, text, text, uuid, text, text, text, text, text, text) to authenticated;

revoke all on function public.update_shop_order(uuid, text, text, text, text, uuid, text, text, text, text, text, text) from public;
grant execute on function public.update_shop_order(uuid, text, text, text, text, uuid, text, text, text, text, text, text) to authenticated;
