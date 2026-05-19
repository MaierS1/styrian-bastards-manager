create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_updated_at'
      and p.pronargs = 0
  ) then
    execute '
      create function public.set_updated_at()
      returns trigger
      language plpgsql
      as $function$
      begin
        new.updated_at = now();
        return new;
      end;
      $function$;
    ';
  end if;
end;
$$;

create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  email text,
  phone text,
  website text,
  logo_path text,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint sponsors_name_not_blank check (length(trim(name)) > 0),
  constraint sponsors_status_check check (status in ('active', 'inactive', 'prospect')),
  constraint sponsors_email_check check (email is null or email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint sponsors_logo_path_not_blank check (logo_path is null or length(trim(logo_path)) > 0),
  constraint sponsors_website_not_blank check (website is null or length(trim(website)) > 0)
);

create table if not exists public.sponsor_contracts (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  title text not null,
  category text not null default 'other',
  status text not null default 'draft',
  starts_on date not null,
  ends_on date,
  amount_cents integer not null default 0,
  currency char(3) not null default 'EUR',
  billing_cycle text not null default 'one_time',
  signed_on date,
  document_path text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint sponsor_contracts_title_not_blank check (length(trim(title)) > 0),
  constraint sponsor_contracts_category_not_blank check (length(trim(category)) > 0),
  constraint sponsor_contracts_status_check check (status in ('draft', 'active', 'expired', 'cancelled')),
  constraint sponsor_contracts_period_check check (ends_on is null or ends_on >= starts_on),
  constraint sponsor_contracts_amount_cents_check check (amount_cents >= 0),
  constraint sponsor_contracts_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint sponsor_contracts_billing_cycle_check check (
    billing_cycle in ('one_time', 'monthly', 'quarterly', 'yearly', 'custom')
  ),
  constraint sponsor_contracts_document_path_not_blank check (
    document_path is null or length(trim(document_path)) > 0
  )
);

create table if not exists public.merch_items (
  id uuid primary key default gen_random_uuid(),
  item_number text,
  name text not null,
  description text,
  category text not null default 'other',
  image_path text,
  status text not null default 'active',
  base_price_cents integer not null default 0,
  tax_rate numeric(5, 2) not null default 0,
  sku_prefix text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint merch_items_item_number_not_blank check (item_number is null or length(trim(item_number)) > 0),
  constraint merch_items_name_not_blank check (length(trim(name)) > 0),
  constraint merch_items_category_not_blank check (length(trim(category)) > 0),
  constraint merch_items_status_check check (status in ('active', 'inactive', 'archived')),
  constraint merch_items_base_price_cents_check check (base_price_cents >= 0),
  constraint merch_items_tax_rate_check check (tax_rate >= 0 and tax_rate <= 100),
  constraint merch_items_image_path_not_blank check (image_path is null or length(trim(image_path)) > 0),
  constraint merch_items_sku_prefix_not_blank check (sku_prefix is null or length(trim(sku_prefix)) > 0)
);

create table if not exists public.merch_variants (
  id uuid primary key default gen_random_uuid(),
  merch_item_id uuid not null references public.merch_items(id) on delete cascade,
  sku text,
  variant_name text,
  size text,
  color text,
  price_cents integer,
  stock_quantity integer not null default 0,
  reorder_level integer not null default 0,
  status text not null default 'active',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint merch_variants_sku_not_blank check (sku is null or length(trim(sku)) > 0),
  constraint merch_variants_variant_name_not_blank check (
    variant_name is null or length(trim(variant_name)) > 0
  ),
  constraint merch_variants_size_not_blank check (size is null or length(trim(size)) > 0),
  constraint merch_variants_color_not_blank check (color is null or length(trim(color)) > 0),
  constraint merch_variants_price_cents_check check (price_cents is null or price_cents >= 0),
  constraint merch_variants_stock_quantity_check check (stock_quantity >= 0),
  constraint merch_variants_reorder_level_check check (reorder_level >= 0),
  constraint merch_variants_status_check check (status in ('active', 'inactive', 'sold_out', 'archived')),
  constraint merch_variants_identity_check check (
    sku is not null
    or variant_name is not null
    or size is not null
    or color is not null
  )
);

create unique index if not exists sponsors_name_unique_idx
  on public.sponsors (lower(trim(name)));

create index if not exists sponsors_status_idx
  on public.sponsors (status);

create index if not exists sponsor_contracts_sponsor_id_idx
  on public.sponsor_contracts (sponsor_id);

create index if not exists sponsor_contracts_status_idx
  on public.sponsor_contracts (status);

create index if not exists sponsor_contracts_period_idx
  on public.sponsor_contracts (starts_on, ends_on);

create index if not exists sponsor_contracts_sponsor_status_idx
  on public.sponsor_contracts (sponsor_id, status);

create unique index if not exists merch_items_item_number_unique_idx
  on public.merch_items (lower(trim(item_number)))
  where item_number is not null;

create index if not exists merch_items_name_idx
  on public.merch_items (lower(trim(name)));

create index if not exists merch_items_category_idx
  on public.merch_items (category);

create index if not exists merch_items_status_idx
  on public.merch_items (status);

create index if not exists merch_variants_merch_item_id_idx
  on public.merch_variants (merch_item_id);

create unique index if not exists merch_variants_sku_unique_idx
  on public.merch_variants (lower(trim(sku)))
  where sku is not null;

create index if not exists merch_variants_status_idx
  on public.merch_variants (status);

create index if not exists merch_variants_stock_idx
  on public.merch_variants (stock_quantity);

drop trigger if exists set_sponsors_updated_at on public.sponsors;

create trigger set_sponsors_updated_at
  before update on public.sponsors
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_sponsor_contracts_updated_at on public.sponsor_contracts;

create trigger set_sponsor_contracts_updated_at
  before update on public.sponsor_contracts
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_merch_items_updated_at on public.merch_items;

create trigger set_merch_items_updated_at
  before update on public.merch_items
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_merch_variants_updated_at on public.merch_variants;

create trigger set_merch_variants_updated_at
  before update on public.merch_variants
  for each row
  execute function public.set_updated_at();
