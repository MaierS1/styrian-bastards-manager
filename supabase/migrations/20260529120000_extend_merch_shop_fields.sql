alter table public.merch_items
  add column if not exists short_description text,
  add column if not exists purchase_price_cents integer,
  add column if not exists member_price_cents integer,
  add column if not exists storage_location text,
  add column if not exists is_preorder boolean not null default false,
  add column if not exists is_limited boolean not null default false,
  add column if not exists is_bestseller boolean not null default false,
  add column if not exists is_new boolean not null default false,
  add column if not exists is_clearance boolean not null default false,
  add column if not exists pickup_available boolean not null default true,
  add column if not exists shipping_available boolean not null default false,
  add column if not exists shipping_cost_cents integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'merch_items_short_description_not_blank'
      and conrelid = 'public.merch_items'::regclass
  ) then
    alter table public.merch_items
      add constraint merch_items_short_description_not_blank
      check (short_description is null or length(trim(short_description)) > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'merch_items_purchase_price_cents_check'
      and conrelid = 'public.merch_items'::regclass
  ) then
    alter table public.merch_items
      add constraint merch_items_purchase_price_cents_check
      check (purchase_price_cents is null or purchase_price_cents >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'merch_items_member_price_cents_check'
      and conrelid = 'public.merch_items'::regclass
  ) then
    alter table public.merch_items
      add constraint merch_items_member_price_cents_check
      check (member_price_cents is null or member_price_cents >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'merch_items_storage_location_not_blank'
      and conrelid = 'public.merch_items'::regclass
  ) then
    alter table public.merch_items
      add constraint merch_items_storage_location_not_blank
      check (storage_location is null or length(trim(storage_location)) > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'merch_items_shipping_cost_cents_check'
      and conrelid = 'public.merch_items'::regclass
  ) then
    alter table public.merch_items
      add constraint merch_items_shipping_cost_cents_check
      check (shipping_cost_cents >= 0);
  end if;
end;
$$;

create index if not exists merch_items_shop_badges_idx
  on public.merch_items (is_public, is_new, is_bestseller, is_preorder, is_limited)
  where is_public = true;
