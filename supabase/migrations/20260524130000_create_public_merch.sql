alter table public.merch_items
  add column if not exists is_public boolean not null default false,
  add column if not exists public_sort_order integer not null default 0,
  add column if not exists public_title text,
  add column if not exists public_description text,
  add column if not exists public_image_alt text,
  add column if not exists public_cta_label text,
  add column if not exists public_cta_url text;

alter table public.merch_variants
  add column if not exists is_public boolean not null default false,
  add column if not exists public_sort_order integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'merch_items_public_sort_order_check'
      and conrelid = 'public.merch_items'::regclass
  ) then
    alter table public.merch_items
      add constraint merch_items_public_sort_order_check
      check (public_sort_order >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'merch_items_public_title_not_blank'
      and conrelid = 'public.merch_items'::regclass
  ) then
    alter table public.merch_items
      add constraint merch_items_public_title_not_blank
      check (public_title is null or length(trim(public_title)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'merch_items_public_description_not_blank'
      and conrelid = 'public.merch_items'::regclass
  ) then
    alter table public.merch_items
      add constraint merch_items_public_description_not_blank
      check (public_description is null or length(trim(public_description)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'merch_items_public_image_alt_not_blank'
      and conrelid = 'public.merch_items'::regclass
  ) then
    alter table public.merch_items
      add constraint merch_items_public_image_alt_not_blank
      check (public_image_alt is null or length(trim(public_image_alt)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'merch_items_public_cta_label_not_blank'
      and conrelid = 'public.merch_items'::regclass
  ) then
    alter table public.merch_items
      add constraint merch_items_public_cta_label_not_blank
      check (public_cta_label is null or length(trim(public_cta_label)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'merch_items_public_cta_url_not_blank'
      and conrelid = 'public.merch_items'::regclass
  ) then
    alter table public.merch_items
      add constraint merch_items_public_cta_url_not_blank
      check (public_cta_url is null or length(trim(public_cta_url)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'merch_variants_public_sort_order_check'
      and conrelid = 'public.merch_variants'::regclass
  ) then
    alter table public.merch_variants
      add constraint merch_variants_public_sort_order_check
      check (public_sort_order >= 0);
  end if;
end;
$$;

create index if not exists merch_items_public_listing_idx
  on public.merch_items (
    is_public,
    status,
    public_sort_order,
    lower(coalesce(public_title, name))
  )
  where is_public = true;

create index if not exists merch_variants_public_listing_idx
  on public.merch_variants (
    merch_item_id,
    is_public,
    status,
    public_sort_order,
    lower(coalesce(variant_name, size, color))
  )
  where is_public = true;

create or replace function public.get_public_merch_items()
returns table (
  id uuid,
  title text,
  category text,
  image_path text,
  image_alt text,
  public_description text,
  public_cta_label text,
  public_cta_url text,
  display_price_cents integer,
  variants jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    merch_items.id,
    coalesce(nullif(trim(merch_items.public_title), ''), merch_items.name) as title,
    merch_items.category,
    merch_items.image_path,
    coalesce(
      nullif(trim(merch_items.public_image_alt), ''),
      nullif(trim(merch_items.public_title), ''),
      merch_items.name
    ) as image_alt,
    merch_items.public_description,
    merch_items.public_cta_label,
    merch_items.public_cta_url,
    coalesce(public_prices.lowest_price_cents, merch_items.base_price_cents) as display_price_cents,
    coalesce(public_variants.variants, '[]'::jsonb) as variants
  from public.merch_items
  left join lateral (
    select coalesce(
      min(coalesce(merch_variants.price_cents, merch_items.base_price_cents))
        filter (where merch_variants.status = 'active'),
      min(coalesce(merch_variants.price_cents, merch_items.base_price_cents))
        filter (where merch_variants.status = 'sold_out')
    ) as lowest_price_cents
    from public.merch_variants
    where merch_variants.merch_item_id = merch_items.id
      and merch_variants.is_public = true
      and merch_variants.status in ('active', 'sold_out')
  ) public_prices on true
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'id', public_variant_rows.id,
        'name', public_variant_rows.variant_name,
        'size', public_variant_rows.size,
        'color', public_variant_rows.color,
        'display_price_cents', public_variant_rows.display_price_cents,
        'availability', public_variant_rows.availability
      )
      order by
        public_variant_rows.public_sort_order asc,
        public_variant_rows.label_sort asc
    ) as variants
    from (
      select
        merch_variants.id,
        merch_variants.variant_name,
        merch_variants.size,
        merch_variants.color,
        coalesce(merch_variants.price_cents, merch_items.base_price_cents) as display_price_cents,
        case
          when merch_variants.status = 'sold_out' then 'sold_out'
          else 'available'
        end as availability,
        merch_variants.public_sort_order,
        lower(coalesce(merch_variants.variant_name, merch_variants.size, merch_variants.color, '')) as label_sort
      from public.merch_variants
      where merch_variants.merch_item_id = merch_items.id
        and merch_variants.is_public = true
        and merch_variants.status in ('active', 'sold_out')
    ) public_variant_rows
  ) public_variants on true
  where merch_items.is_public = true
    and merch_items.status = 'active'
  order by
    merch_items.public_sort_order asc,
    lower(coalesce(merch_items.public_title, merch_items.name)) asc;
$$;

revoke all on function public.get_public_merch_items() from public;
grant execute on function public.get_public_merch_items() to anon;
grant execute on function public.get_public_merch_items() to authenticated;

create or replace function public.can_manage_merch()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where members.auth_user_id = auth.uid()
      and members.app_role in ('admin', 'members')
  );
$$;

revoke all on function public.can_manage_merch() from public;
grant execute on function public.can_manage_merch() to authenticated;

create or replace function public.can_manage_merch_sales()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where members.auth_user_id = auth.uid()
      and members.app_role in ('admin', 'members', 'cashier')
  );
$$;

revoke all on function public.can_manage_merch_sales() from public;
grant execute on function public.can_manage_merch_sales() to authenticated;

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
security definer
set search_path = public
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
  if not public.can_manage_merch_sales() then
    raise exception 'permission denied for merch sale';
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
security definer
set search_path = public
as $$
declare
  v_sale public.merch_sales%rowtype;
  v_item record;
  v_cancelled_at timestamptz := now();
  v_restored_items integer := 0;
  v_restored_quantity integer := 0;
begin
  if not public.can_manage_merch_sales() then
    raise exception 'permission denied for merch sale';
  end if;

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
    set stock_quantity = stock_quantity + v_item.quantity
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

revoke all on function public.create_merch_sale(
  uuid,
  integer,
  integer,
  integer,
  date,
  text,
  uuid,
  uuid,
  text,
  text,
  boolean,
  text
) from public;
revoke all on function public.create_merch_sale(
  uuid,
  integer,
  integer,
  integer,
  date,
  text,
  uuid,
  uuid,
  text,
  text,
  boolean,
  text
) from anon;
grant execute on function public.create_merch_sale(
  uuid,
  integer,
  integer,
  integer,
  date,
  text,
  uuid,
  uuid,
  text,
  text,
  boolean,
  text
) to authenticated;

revoke all on function public.cancel_merch_sale(uuid, text) from public;
revoke all on function public.cancel_merch_sale(uuid, text) from anon;
grant execute on function public.cancel_merch_sale(uuid, text) to authenticated;

alter table public.merch_items enable row level security;
alter table public.merch_variants enable row level security;
alter table public.merch_sales enable row level security;
alter table public.merch_sale_items enable row level security;

revoke all on table public.merch_items from public;
revoke all on table public.merch_items from anon;
grant select, insert, update, delete on table public.merch_items to authenticated;

revoke all on table public.merch_variants from public;
revoke all on table public.merch_variants from anon;
grant select, insert, update, delete on table public.merch_variants to authenticated;

revoke all on table public.merch_sales from public;
revoke all on table public.merch_sales from anon;
revoke insert, update, delete on table public.merch_sales from authenticated;
grant select on table public.merch_sales to authenticated;

revoke all on table public.merch_sale_items from public;
revoke all on table public.merch_sale_items from anon;
revoke insert, update, delete on table public.merch_sale_items from authenticated;
grant select on table public.merch_sale_items to authenticated;

drop policy if exists "authenticated users can read merch items" on public.merch_items;
create policy "authenticated users can read merch items"
  on public.merch_items
  for select
  to authenticated
  using (true);

drop policy if exists "authenticated users can insert merch items" on public.merch_items;
create policy "authenticated users can insert merch items"
  on public.merch_items
  for insert
  to authenticated
  with check (public.can_manage_merch());

drop policy if exists "authenticated users can update merch items" on public.merch_items;
create policy "authenticated users can update merch items"
  on public.merch_items
  for update
  to authenticated
  using (public.can_manage_merch())
  with check (public.can_manage_merch());

drop policy if exists "authenticated users can delete merch items" on public.merch_items;
create policy "authenticated users can delete merch items"
  on public.merch_items
  for delete
  to authenticated
  using (public.can_manage_merch());

drop policy if exists "authenticated users can read merch variants" on public.merch_variants;
create policy "authenticated users can read merch variants"
  on public.merch_variants
  for select
  to authenticated
  using (true);

drop policy if exists "authenticated users can insert merch variants" on public.merch_variants;
create policy "authenticated users can insert merch variants"
  on public.merch_variants
  for insert
  to authenticated
  with check (public.can_manage_merch());

drop policy if exists "authenticated users can update merch variants" on public.merch_variants;
create policy "authenticated users can update merch variants"
  on public.merch_variants
  for update
  to authenticated
  using (public.can_manage_merch())
  with check (public.can_manage_merch());

drop policy if exists "authenticated users can delete merch variants" on public.merch_variants;
create policy "authenticated users can delete merch variants"
  on public.merch_variants
  for delete
  to authenticated
  using (public.can_manage_merch());

drop policy if exists "authenticated users can read merch sales" on public.merch_sales;
create policy "authenticated users can read merch sales"
  on public.merch_sales
  for select
  to authenticated
  using (true);

drop policy if exists "authenticated users can read merch sale items" on public.merch_sale_items;
create policy "authenticated users can read merch sale items"
  on public.merch_sale_items
  for select
  to authenticated
  using (true);
