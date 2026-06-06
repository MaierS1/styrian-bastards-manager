create table if not exists public.purchase_search_results (
  id uuid primary key default gen_random_uuid(),
  search_query text not null,
  supplier_name text not null,
  product_name text not null,
  price_net numeric(12,2),
  price_gross numeric(12,2),
  unit_price numeric(12,4),
  unit text,
  package_size numeric(12,3),
  offer_valid_from date,
  offer_valid_until date,
  source_url text not null,
  source_type text not null default 'public_offer',
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint purchase_search_results_search_query_not_blank check (length(trim(search_query)) > 0),
  constraint purchase_search_results_supplier_name_not_blank check (length(trim(supplier_name)) > 0),
  constraint purchase_search_results_product_name_not_blank check (length(trim(product_name)) > 0),
  constraint purchase_search_results_source_url_not_blank check (length(trim(source_url)) > 0),
  constraint purchase_search_results_source_type_not_blank check (length(trim(source_type)) > 0),
  constraint purchase_search_results_price_net_check check (price_net is null or price_net >= 0),
  constraint purchase_search_results_price_gross_check check (price_gross is null or price_gross >= 0),
  constraint purchase_search_results_unit_price_check check (unit_price is null or unit_price >= 0),
  constraint purchase_search_results_package_size_check check (package_size is null or package_size > 0),
  constraint purchase_search_results_unit_not_blank check (unit is null or length(trim(unit)) > 0)
);

create index if not exists purchase_search_results_query_created_idx
  on public.purchase_search_results (search_query, created_at desc);

create index if not exists purchase_search_results_created_at_idx
  on public.purchase_search_results (created_at desc);

create index if not exists purchase_search_results_supplier_name_idx
  on public.purchase_search_results (lower(supplier_name));

create index if not exists purchase_search_results_product_name_idx
  on public.purchase_search_results (lower(product_name));

create index if not exists purchase_search_results_source_type_idx
  on public.purchase_search_results (source_type);

alter table public.purchase_search_results enable row level security;

revoke all on table public.purchase_search_results from public;
revoke all on table public.purchase_search_results from anon;

grant select, insert, update, delete on table public.purchase_search_results to authenticated;

drop policy if exists "purchase managers can read search results" on public.purchase_search_results;
create policy "purchase managers can read search results"
  on public.purchase_search_results
  for select
  to authenticated
  using (public.is_purchase_manager_user());

drop policy if exists "purchase managers can insert search results" on public.purchase_search_results;
create policy "purchase managers can insert search results"
  on public.purchase_search_results
  for insert
  to authenticated
  with check (public.is_purchase_manager_user());

drop policy if exists "purchase managers can update search results" on public.purchase_search_results;
create policy "purchase managers can update search results"
  on public.purchase_search_results
  for update
  to authenticated
  using (public.is_purchase_manager_user())
  with check (public.is_purchase_manager_user());

drop policy if exists "purchase managers can delete search results" on public.purchase_search_results;
create policy "purchase managers can delete search results"
  on public.purchase_search_results
  for delete
  to authenticated
  using (public.is_purchase_manager_user());
