create table if not exists public.merch_sales (
  id uuid primary key default gen_random_uuid(),
  sale_date date not null default current_date,
  member_id uuid references public.members(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  cash_entry_id uuid unique references public.cash_entries(id) on delete set null,
  status text not null default 'draft',
  payment_method text not null default 'bar',
  currency char(3) not null default 'EUR',
  subtotal_cents integer not null default 0,
  discount_cents integer not null default 0,
  total_cents integer not null default 0,
  buyer_name text,
  notes text,
  cancellation_reason text,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint merch_sales_status_check check (status in ('draft', 'completed', 'cancelled', 'returned')),
  constraint merch_sales_payment_method_check check (
    payment_method in ('bar', 'karte', 'ueberweisung', 'ebanking', 'sonstiges')
  ),
  constraint merch_sales_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint merch_sales_subtotal_cents_check check (subtotal_cents >= 0),
  constraint merch_sales_discount_cents_check check (discount_cents >= 0),
  constraint merch_sales_total_cents_check check (total_cents >= 0),
  constraint merch_sales_total_matches_discount_check check (total_cents = subtotal_cents - discount_cents),
  constraint merch_sales_discount_not_above_subtotal_check check (discount_cents <= subtotal_cents),
  constraint merch_sales_buyer_name_not_blank check (buyer_name is null or length(trim(buyer_name)) > 0),
  constraint merch_sales_cancelled_fields_check check (
    status not in ('cancelled', 'returned')
    or cancelled_at is not null
  )
);

create table if not exists public.merch_sale_items (
  id uuid primary key default gen_random_uuid(),
  merch_sale_id uuid not null references public.merch_sales(id) on delete cascade,
  merch_variant_id uuid not null references public.merch_variants(id) on delete restrict,
  quantity integer not null,
  unit_price_cents integer not null,
  subtotal_cents integer not null,
  discount_cents integer not null default 0,
  total_cents integer not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint merch_sale_items_quantity_check check (quantity > 0),
  constraint merch_sale_items_unit_price_cents_check check (unit_price_cents >= 0),
  constraint merch_sale_items_subtotal_cents_check check (subtotal_cents = quantity * unit_price_cents),
  constraint merch_sale_items_discount_cents_check check (discount_cents >= 0),
  constraint merch_sale_items_total_cents_check check (total_cents >= 0),
  constraint merch_sale_items_total_matches_discount_check check (total_cents = subtotal_cents - discount_cents),
  constraint merch_sale_items_discount_not_above_subtotal_check check (discount_cents <= subtotal_cents)
);

create index if not exists merch_sales_sale_date_idx
  on public.merch_sales (sale_date);

create index if not exists merch_sales_member_id_idx
  on public.merch_sales (member_id);

create index if not exists merch_sales_event_id_idx
  on public.merch_sales (event_id);

create index if not exists merch_sales_status_idx
  on public.merch_sales (status);

create index if not exists merch_sales_payment_method_idx
  on public.merch_sales (payment_method);

create index if not exists merch_sales_cash_entry_id_idx
  on public.merch_sales (cash_entry_id);

create index if not exists merch_sale_items_merch_sale_id_idx
  on public.merch_sale_items (merch_sale_id);

create index if not exists merch_sale_items_merch_variant_id_idx
  on public.merch_sale_items (merch_variant_id);

create index if not exists merch_sale_items_sale_variant_idx
  on public.merch_sale_items (merch_sale_id, merch_variant_id);

drop trigger if exists set_merch_sales_updated_at on public.merch_sales;

create trigger set_merch_sales_updated_at
  before update on public.merch_sales
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_merch_sale_items_updated_at on public.merch_sale_items;

create trigger set_merch_sale_items_updated_at
  before update on public.merch_sale_items
  for each row
  execute function public.set_updated_at();
