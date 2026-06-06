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

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website text,
  note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint suppliers_name_not_blank check (length(trim(name)) > 0),
  constraint suppliers_website_not_blank check (website is null or length(trim(website)) > 0),
  constraint suppliers_note_not_blank check (note is null or length(trim(note)) > 0)
);

create unique index if not exists suppliers_name_uidx
  on public.suppliers (lower(name));

create index if not exists suppliers_is_active_idx
  on public.suppliers (is_active);

drop trigger if exists set_suppliers_updated_at on public.suppliers;
create trigger set_suppliers_updated_at
  before update on public.suppliers
  for each row
  execute function public.set_updated_at();

create table if not exists public.purchase_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  brand text,
  unit text,
  package_size numeric(12,3),
  note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint purchase_products_name_not_blank check (length(trim(name)) > 0),
  constraint purchase_products_category_not_blank check (category is null or length(trim(category)) > 0),
  constraint purchase_products_brand_not_blank check (brand is null or length(trim(brand)) > 0),
  constraint purchase_products_unit_not_blank check (unit is null or length(trim(unit)) > 0),
  constraint purchase_products_package_size_check check (package_size is null or package_size > 0),
  constraint purchase_products_note_not_blank check (note is null or length(trim(note)) > 0)
);

create index if not exists purchase_products_name_idx
  on public.purchase_products (lower(name));

create index if not exists purchase_products_category_idx
  on public.purchase_products (category);

create index if not exists purchase_products_is_active_idx
  on public.purchase_products (is_active);

drop trigger if exists set_purchase_products_updated_at on public.purchase_products;
create trigger set_purchase_products_updated_at
  before update on public.purchase_products
  for each row
  execute function public.set_updated_at();

create table if not exists public.purchase_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.purchase_products(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  price_net numeric(12,2),
  price_gross numeric(12,2),
  tax_rate numeric(5,2),
  unit_price numeric(12,4),
  currency text not null default 'EUR',
  valid_from date,
  valid_until date,
  is_offer boolean not null default false,
  offer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint purchase_prices_price_net_check check (price_net is null or price_net >= 0),
  constraint purchase_prices_price_gross_check check (price_gross is null or price_gross >= 0),
  constraint purchase_prices_tax_rate_check check (tax_rate is null or tax_rate >= 0),
  constraint purchase_prices_unit_price_check check (unit_price is null or unit_price >= 0),
  constraint purchase_prices_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint purchase_prices_valid_range_check check (
    valid_from is null or valid_until is null or valid_until >= valid_from
  ),
  constraint purchase_prices_offer_note_not_blank check (offer_note is null or length(trim(offer_note)) > 0),
  constraint purchase_prices_any_price_check check (
    price_net is not null or price_gross is not null or unit_price is not null
  )
);

create index if not exists purchase_prices_product_id_idx
  on public.purchase_prices (product_id);

create index if not exists purchase_prices_supplier_id_idx
  on public.purchase_prices (supplier_id);

create index if not exists purchase_prices_best_price_idx
  on public.purchase_prices (product_id, unit_price, price_gross);

drop trigger if exists set_purchase_prices_updated_at on public.purchase_prices;
create trigger set_purchase_prices_updated_at
  before update on public.purchase_prices
  for each row
  execute function public.set_updated_at();

create table if not exists public.purchase_lists (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_id uuid references public.events(id) on delete set null,
  status text not null default 'draft',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint purchase_lists_title_not_blank check (length(trim(title)) > 0),
  constraint purchase_lists_status_check check (status in ('draft', 'open', 'completed', 'cancelled')),
  constraint purchase_lists_note_not_blank check (note is null or length(trim(note)) > 0)
);

create index if not exists purchase_lists_status_idx
  on public.purchase_lists (status);

create index if not exists purchase_lists_event_id_idx
  on public.purchase_lists (event_id);

drop trigger if exists set_purchase_lists_updated_at on public.purchase_lists;
create trigger set_purchase_lists_updated_at
  before update on public.purchase_lists
  for each row
  execute function public.set_updated_at();

create table if not exists public.purchase_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.purchase_lists(id) on delete cascade,
  product_id uuid not null references public.purchase_products(id) on delete restrict,
  quantity numeric(12,3) not null default 1,
  preferred_supplier_id uuid references public.suppliers(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint purchase_list_items_quantity_check check (quantity > 0),
  constraint purchase_list_items_note_not_blank check (note is null or length(trim(note)) > 0)
);

create index if not exists purchase_list_items_list_id_idx
  on public.purchase_list_items (list_id);

create index if not exists purchase_list_items_product_id_idx
  on public.purchase_list_items (product_id);

create index if not exists purchase_list_items_preferred_supplier_id_idx
  on public.purchase_list_items (preferred_supplier_id);

drop trigger if exists set_purchase_list_items_updated_at on public.purchase_list_items;
create trigger set_purchase_list_items_updated_at
  before update on public.purchase_list_items
  for each row
  execute function public.set_updated_at();

alter table public.suppliers enable row level security;
alter table public.purchase_products enable row level security;
alter table public.purchase_prices enable row level security;
alter table public.purchase_lists enable row level security;
alter table public.purchase_list_items enable row level security;

revoke all on table public.suppliers from public;
revoke all on table public.suppliers from anon;
revoke all on table public.purchase_products from public;
revoke all on table public.purchase_products from anon;
revoke all on table public.purchase_prices from public;
revoke all on table public.purchase_prices from anon;
revoke all on table public.purchase_lists from public;
revoke all on table public.purchase_lists from anon;
revoke all on table public.purchase_list_items from public;
revoke all on table public.purchase_list_items from anon;

grant select, insert, update, delete on table public.suppliers to authenticated;
grant select, insert, update, delete on table public.purchase_products to authenticated;
grant select, insert, update, delete on table public.purchase_prices to authenticated;
grant select, insert, update, delete on table public.purchase_lists to authenticated;
grant select, insert, update, delete on table public.purchase_list_items to authenticated;

revoke all on function public.is_purchase_manager_user() from public;
grant execute on function public.is_purchase_manager_user() to authenticated;

drop policy if exists "purchase managers can read suppliers" on public.suppliers;
create policy "purchase managers can read suppliers"
  on public.suppliers
  for select
  to authenticated
  using (public.is_purchase_manager_user());

drop policy if exists "purchase managers can insert suppliers" on public.suppliers;
create policy "purchase managers can insert suppliers"
  on public.suppliers
  for insert
  to authenticated
  with check (public.is_purchase_manager_user());

drop policy if exists "purchase managers can update suppliers" on public.suppliers;
create policy "purchase managers can update suppliers"
  on public.suppliers
  for update
  to authenticated
  using (public.is_purchase_manager_user())
  with check (public.is_purchase_manager_user());

drop policy if exists "purchase managers can delete suppliers" on public.suppliers;
create policy "purchase managers can delete suppliers"
  on public.suppliers
  for delete
  to authenticated
  using (public.is_purchase_manager_user());

drop policy if exists "purchase managers can read purchase products" on public.purchase_products;
create policy "purchase managers can read purchase products"
  on public.purchase_products
  for select
  to authenticated
  using (public.is_purchase_manager_user());

drop policy if exists "purchase managers can insert purchase products" on public.purchase_products;
create policy "purchase managers can insert purchase products"
  on public.purchase_products
  for insert
  to authenticated
  with check (public.is_purchase_manager_user());

drop policy if exists "purchase managers can update purchase products" on public.purchase_products;
create policy "purchase managers can update purchase products"
  on public.purchase_products
  for update
  to authenticated
  using (public.is_purchase_manager_user())
  with check (public.is_purchase_manager_user());

drop policy if exists "purchase managers can delete purchase products" on public.purchase_products;
create policy "purchase managers can delete purchase products"
  on public.purchase_products
  for delete
  to authenticated
  using (public.is_purchase_manager_user());

drop policy if exists "purchase managers can read purchase prices" on public.purchase_prices;
create policy "purchase managers can read purchase prices"
  on public.purchase_prices
  for select
  to authenticated
  using (public.is_purchase_manager_user());

drop policy if exists "purchase managers can insert purchase prices" on public.purchase_prices;
create policy "purchase managers can insert purchase prices"
  on public.purchase_prices
  for insert
  to authenticated
  with check (public.is_purchase_manager_user());

drop policy if exists "purchase managers can update purchase prices" on public.purchase_prices;
create policy "purchase managers can update purchase prices"
  on public.purchase_prices
  for update
  to authenticated
  using (public.is_purchase_manager_user())
  with check (public.is_purchase_manager_user());

drop policy if exists "purchase managers can delete purchase prices" on public.purchase_prices;
create policy "purchase managers can delete purchase prices"
  on public.purchase_prices
  for delete
  to authenticated
  using (public.is_purchase_manager_user());

drop policy if exists "purchase managers can read purchase lists" on public.purchase_lists;
create policy "purchase managers can read purchase lists"
  on public.purchase_lists
  for select
  to authenticated
  using (public.is_purchase_manager_user());

drop policy if exists "purchase managers can insert purchase lists" on public.purchase_lists;
create policy "purchase managers can insert purchase lists"
  on public.purchase_lists
  for insert
  to authenticated
  with check (public.is_purchase_manager_user());

drop policy if exists "purchase managers can update purchase lists" on public.purchase_lists;
create policy "purchase managers can update purchase lists"
  on public.purchase_lists
  for update
  to authenticated
  using (public.is_purchase_manager_user())
  with check (public.is_purchase_manager_user());

drop policy if exists "purchase managers can delete purchase lists" on public.purchase_lists;
create policy "purchase managers can delete purchase lists"
  on public.purchase_lists
  for delete
  to authenticated
  using (public.is_purchase_manager_user());

drop policy if exists "purchase managers can read purchase list items" on public.purchase_list_items;
create policy "purchase managers can read purchase list items"
  on public.purchase_list_items
  for select
  to authenticated
  using (public.is_purchase_manager_user());

drop policy if exists "purchase managers can insert purchase list items" on public.purchase_list_items;
create policy "purchase managers can insert purchase list items"
  on public.purchase_list_items
  for insert
  to authenticated
  with check (public.is_purchase_manager_user());

drop policy if exists "purchase managers can update purchase list items" on public.purchase_list_items;
create policy "purchase managers can update purchase list items"
  on public.purchase_list_items
  for update
  to authenticated
  using (public.is_purchase_manager_user())
  with check (public.is_purchase_manager_user());

drop policy if exists "purchase managers can delete purchase list items" on public.purchase_list_items;
create policy "purchase managers can delete purchase list items"
  on public.purchase_list_items
  for delete
  to authenticated
  using (public.is_purchase_manager_user());
