create table if not exists public.purchase_product_favorites (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.purchase_products(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),

  constraint purchase_product_favorites_product_uidx unique (product_id),
  constraint purchase_product_favorites_note_not_blank check (note is null or length(trim(note)) > 0)
);

create table if not exists public.purchase_price_history (
  id uuid primary key default gen_random_uuid(),
  price_id uuid references public.purchase_prices(id) on delete set null,
  product_id uuid not null references public.purchase_products(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  old_price_net numeric(12,2),
  old_price_gross numeric(12,2),
  old_tax_rate numeric(5,2),
  old_unit_price numeric(12,4),
  old_currency text not null default 'EUR',
  old_valid_from date,
  old_valid_until date,
  old_is_offer boolean not null default false,
  old_offer_note text,
  changed_at timestamptz not null default now(),
  changed_by uuid default auth.uid(),

  constraint purchase_price_history_old_price_net_check check (old_price_net is null or old_price_net >= 0),
  constraint purchase_price_history_old_price_gross_check check (old_price_gross is null or old_price_gross >= 0),
  constraint purchase_price_history_old_unit_price_check check (old_unit_price is null or old_unit_price >= 0),
  constraint purchase_price_history_old_currency_check check (old_currency ~ '^[A-Z]{3}$')
);

create table if not exists public.purchase_supplier_ratings (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  price_rating integer,
  quality_rating integer,
  reliability_rating integer,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint purchase_supplier_ratings_supplier_uidx unique (supplier_id),
  constraint purchase_supplier_ratings_price_check check (price_rating is null or price_rating between 1 and 5),
  constraint purchase_supplier_ratings_quality_check check (quality_rating is null or quality_rating between 1 and 5),
  constraint purchase_supplier_ratings_reliability_check check (reliability_rating is null or reliability_rating between 1 and 5),
  constraint purchase_supplier_ratings_note_not_blank check (note is null or length(trim(note)) > 0)
);

alter table public.purchase_lists
  add column if not exists estimated_total_net numeric(12,2) not null default 0,
  add column if not exists estimated_total_gross numeric(12,2) not null default 0;

create index if not exists purchase_product_favorites_product_id_idx
  on public.purchase_product_favorites (product_id);

create index if not exists purchase_price_history_product_id_changed_at_idx
  on public.purchase_price_history (product_id, changed_at desc);

create index if not exists purchase_price_history_price_id_idx
  on public.purchase_price_history (price_id);

create index if not exists purchase_supplier_ratings_supplier_id_idx
  on public.purchase_supplier_ratings (supplier_id);

drop trigger if exists set_purchase_supplier_ratings_updated_at on public.purchase_supplier_ratings;
create trigger set_purchase_supplier_ratings_updated_at
  before update on public.purchase_supplier_ratings
  for each row
  execute function public.set_updated_at();

create or replace function public.record_purchase_price_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.price_net is distinct from new.price_net
    or old.price_gross is distinct from new.price_gross
    or old.tax_rate is distinct from new.tax_rate
    or old.unit_price is distinct from new.unit_price
    or old.currency is distinct from new.currency
    or old.valid_from is distinct from new.valid_from
    or old.valid_until is distinct from new.valid_until
    or old.is_offer is distinct from new.is_offer
    or old.offer_note is distinct from new.offer_note then
    insert into public.purchase_price_history (
      price_id,
      product_id,
      supplier_id,
      old_price_net,
      old_price_gross,
      old_tax_rate,
      old_unit_price,
      old_currency,
      old_valid_from,
      old_valid_until,
      old_is_offer,
      old_offer_note,
      changed_by
    )
    values (
      old.id,
      old.product_id,
      old.supplier_id,
      old.price_net,
      old.price_gross,
      old.tax_rate,
      old.unit_price,
      old.currency,
      old.valid_from,
      old.valid_until,
      old.is_offer,
      old.offer_note,
      auth.uid()
    );
  end if;

  return new;
end;
$$;

drop trigger if exists record_purchase_price_history_trigger on public.purchase_prices;
create trigger record_purchase_price_history_trigger
  before update on public.purchase_prices
  for each row
  execute function public.record_purchase_price_history();

alter table public.purchase_product_favorites enable row level security;
alter table public.purchase_price_history enable row level security;
alter table public.purchase_supplier_ratings enable row level security;

revoke all on table public.purchase_product_favorites from public;
revoke all on table public.purchase_product_favorites from anon;
revoke all on table public.purchase_price_history from public;
revoke all on table public.purchase_price_history from anon;
revoke all on table public.purchase_supplier_ratings from public;
revoke all on table public.purchase_supplier_ratings from anon;

grant select, insert, update, delete on table public.purchase_product_favorites to authenticated;
grant select, insert, update, delete on table public.purchase_price_history to authenticated;
grant select, insert, update, delete on table public.purchase_supplier_ratings to authenticated;

drop policy if exists "purchase managers can read product favorites" on public.purchase_product_favorites;
create policy "purchase managers can read product favorites"
  on public.purchase_product_favorites
  for select
  to authenticated
  using (public.is_purchase_manager_user());

drop policy if exists "purchase managers can insert product favorites" on public.purchase_product_favorites;
create policy "purchase managers can insert product favorites"
  on public.purchase_product_favorites
  for insert
  to authenticated
  with check (public.is_purchase_manager_user());

drop policy if exists "purchase managers can update product favorites" on public.purchase_product_favorites;
create policy "purchase managers can update product favorites"
  on public.purchase_product_favorites
  for update
  to authenticated
  using (public.is_purchase_manager_user())
  with check (public.is_purchase_manager_user());

drop policy if exists "purchase managers can delete product favorites" on public.purchase_product_favorites;
create policy "purchase managers can delete product favorites"
  on public.purchase_product_favorites
  for delete
  to authenticated
  using (public.is_purchase_manager_user());

drop policy if exists "purchase managers can read price history" on public.purchase_price_history;
create policy "purchase managers can read price history"
  on public.purchase_price_history
  for select
  to authenticated
  using (public.is_purchase_manager_user());

drop policy if exists "purchase managers can insert price history" on public.purchase_price_history;
create policy "purchase managers can insert price history"
  on public.purchase_price_history
  for insert
  to authenticated
  with check (public.is_purchase_manager_user());

drop policy if exists "purchase managers can update price history" on public.purchase_price_history;
create policy "purchase managers can update price history"
  on public.purchase_price_history
  for update
  to authenticated
  using (public.is_purchase_manager_user())
  with check (public.is_purchase_manager_user());

drop policy if exists "purchase managers can delete price history" on public.purchase_price_history;
create policy "purchase managers can delete price history"
  on public.purchase_price_history
  for delete
  to authenticated
  using (public.is_purchase_manager_user());

drop policy if exists "purchase managers can read supplier ratings" on public.purchase_supplier_ratings;
create policy "purchase managers can read supplier ratings"
  on public.purchase_supplier_ratings
  for select
  to authenticated
  using (public.is_purchase_manager_user());

drop policy if exists "purchase managers can insert supplier ratings" on public.purchase_supplier_ratings;
create policy "purchase managers can insert supplier ratings"
  on public.purchase_supplier_ratings
  for insert
  to authenticated
  with check (public.is_purchase_manager_user());

drop policy if exists "purchase managers can update supplier ratings" on public.purchase_supplier_ratings;
create policy "purchase managers can update supplier ratings"
  on public.purchase_supplier_ratings
  for update
  to authenticated
  using (public.is_purchase_manager_user())
  with check (public.is_purchase_manager_user());

drop policy if exists "purchase managers can delete supplier ratings" on public.purchase_supplier_ratings;
create policy "purchase managers can delete supplier ratings"
  on public.purchase_supplier_ratings
  for delete
  to authenticated
  using (public.is_purchase_manager_user());

create or replace function public.get_purchase_dashboard()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.is_purchase_manager_user() then
      jsonb_build_object('error', 'forbidden')
    else
      jsonb_build_object(
        'products_count', (select count(*) from public.purchase_products),
        'active_products_count', (select count(*) from public.purchase_products where is_active),
        'suppliers_count', (select count(*) from public.suppliers),
        'active_suppliers_count', (select count(*) from public.suppliers where is_active),
        'prices_count', (select count(*) from public.purchase_prices),
        'favorites_count', (select count(*) from public.purchase_product_favorites),
        'open_lists_count', (select count(*) from public.purchase_lists where status in ('draft', 'open')),
        'updated_at', now()
      )
  end;
$$;

create or replace function public.get_purchase_lists_for_board()
returns table (
  id uuid,
  title text,
  event_id uuid,
  event_name text,
  status text,
  note text,
  estimated_total_net numeric,
  estimated_total_gross numeric,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pl.id,
    pl.title,
    pl.event_id,
    e.name as event_name,
    pl.status,
    pl.note,
    pl.estimated_total_net,
    pl.estimated_total_gross,
    pl.created_at,
    pl.updated_at
  from public.purchase_lists pl
  left join public.events e on e.id = pl.event_id
  where public.is_purchase_manager_user()
  order by pl.created_at desc;
$$;

create or replace function public.get_purchase_price_comparison()
returns table (
  product_id uuid,
  product_name text,
  supplier_id uuid,
  supplier_name text,
  price_net numeric,
  price_gross numeric,
  unit_price numeric,
  currency text,
  is_offer boolean,
  offer_note text,
  is_best_price boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with ranked_prices as (
    select
      pp.product_id,
      p.name as product_name,
      pp.supplier_id,
      s.name as supplier_name,
      pp.price_net,
      pp.price_gross,
      pp.unit_price,
      pp.currency,
      pp.is_offer,
      pp.offer_note,
      row_number() over (
        partition by pp.product_id
        order by coalesce(pp.unit_price, pp.price_gross, pp.price_net) asc nulls last, pp.created_at desc
      ) = 1 as is_best_price
    from public.purchase_prices pp
    join public.purchase_products p on p.id = pp.product_id
    join public.suppliers s on s.id = pp.supplier_id
    where public.is_purchase_manager_user()
  )
  select * from ranked_prices
  order by product_name asc, is_best_price desc, coalesce(unit_price, price_gross, price_net) asc nulls last;
$$;

revoke all on function public.get_purchase_dashboard() from public;
revoke all on function public.get_purchase_lists_for_board() from public;
revoke all on function public.get_purchase_price_comparison() from public;

grant execute on function public.get_purchase_dashboard() to authenticated;
grant execute on function public.get_purchase_lists_for_board() to authenticated;
grant execute on function public.get_purchase_price_comparison() to authenticated;
