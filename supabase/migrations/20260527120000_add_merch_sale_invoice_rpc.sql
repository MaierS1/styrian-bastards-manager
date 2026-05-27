alter table public.merch_sales
  add column if not exists invoice_id uuid unique references public.invoices(id) on delete set null;

create index if not exists merch_sales_invoice_id_idx
  on public.merch_sales (invoice_id);

create unique index if not exists invoices_invoice_number_unique_idx
  on public.invoices (invoice_number);

create or replace function public.get_next_invoice_number(
  p_year integer default extract(year from current_date)::integer,
  p_is_test boolean default false
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer := coalesce(p_year, extract(year from current_date)::integer);
  v_prefix text;
  v_max_number integer;
begin
  perform pg_advisory_xact_lock(871260, (v_year * 10) + case when coalesce(p_is_test, false) then 1 else 0 end);

  v_prefix := case
    when coalesce(p_is_test, false) then 'TEST-SB-' || v_year::text || '-'
    else 'SB-' || v_year::text || '-'
  end;

  select coalesce(
    max(nullif(regexp_replace(invoice_number, '^' || v_prefix, ''), '')::integer),
    0
  )
    into v_max_number
  from public.invoices
  where invoice_number ~ ('^' || v_prefix || '[0-9]+$');

  return v_prefix || lpad((v_max_number + 1)::text, 4, '0');
end;
$$;

revoke all on function public.get_next_invoice_number(integer, boolean) from public;
revoke all on function public.get_next_invoice_number(integer, boolean) from anon;
grant execute on function public.get_next_invoice_number(integer, boolean) to authenticated;

create or replace function public.get_next_cancellation_invoice_number(
  p_year integer default extract(year from current_date)::integer,
  p_is_test boolean default false
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer := coalesce(p_year, extract(year from current_date)::integer);
  v_base_prefix text;
  v_prefix text;
  v_max_number integer;
begin
  perform pg_advisory_xact_lock(871261, (v_year * 10) + case when coalesce(p_is_test, false) then 1 else 0 end);

  v_base_prefix := case
    when coalesce(p_is_test, false) then 'TEST-SB-' || v_year::text || '-'
    else 'SB-' || v_year::text || '-'
  end;
  v_prefix := 'STORNO-' || v_base_prefix;

  select coalesce(
    max(nullif(regexp_replace(invoice_number, '^' || v_prefix, ''), '')::integer),
    0
  )
    into v_max_number
  from public.invoices
  where invoice_number ~ ('^' || v_prefix || '[0-9]+$');

  return v_prefix || lpad((v_max_number + 1)::text, 4, '0');
end;
$$;

revoke all on function public.get_next_cancellation_invoice_number(integer, boolean) from public;
revoke all on function public.get_next_cancellation_invoice_number(integer, boolean) from anon;
grant execute on function public.get_next_cancellation_invoice_number(integer, boolean) to authenticated;

create or replace function public.create_merch_sale_with_invoice(
  p_merch_variant_id uuid,
  p_quantity integer,
  p_unit_price_cents integer,
  p_discount_cents integer default 0,
  p_sale_date date default current_date,
  p_payment_method text default 'bar',
  p_member_id uuid default null,
  p_event_id uuid default null,
  p_buyer_name text default null,
  p_buyer_email text default null,
  p_customer_id uuid default null,
  p_customer_street text default null,
  p_customer_house_number text default null,
  p_customer_address_addition text default null,
  p_customer_postal_code text default null,
  p_customer_city text default null,
  p_customer_country text default 'Oesterreich',
  p_notes text default null,
  p_create_cash_entry boolean default true,
  p_receipt_number text default null,
  p_create_invoice boolean default true,
  p_invoice_is_test boolean default false,
  p_invoice_status text default 'bezahlt',
  p_invoice_due_date date default null,
  p_invoice_notes text default null
)
returns table (
  merch_sale_id uuid,
  merch_sale_item_id uuid,
  invoice_id uuid,
  invoice_number text,
  cash_entry_id uuid,
  remaining_stock integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_variant public.merch_variants%rowtype;
  v_merch_item public.merch_items%rowtype;
  v_member public.members%rowtype;
  v_invoice_customer public.invoice_customers%rowtype;
  v_sale_id uuid;
  v_sale_item_id uuid;
  v_invoice_id uuid;
  v_invoice_number text;
  v_cash_entry_id uuid;
  v_sale_date date := coalesce(p_sale_date, current_date);
  v_subtotal_cents integer;
  v_total_cents integer;
  v_customer_name text;
  v_customer_email text;
  v_customer_street text;
  v_customer_house_number text;
  v_customer_address_addition text;
  v_customer_postal_code text;
  v_customer_city text;
  v_customer_country text;
  v_customer_address text;
  v_invoice_total numeric;
  v_item_description text;
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

  if coalesce(p_invoice_status, '') not in ('offen', 'bezahlt') then
    raise exception 'invalid invoice status: %', p_invoice_status;
  end if;

  if coalesce(p_create_cash_entry, true) and p_invoice_status = 'offen' then
    raise exception 'cash entry cannot be created for an open invoice';
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

  select *
    into v_merch_item
  from public.merch_items
  where id = v_variant.merch_item_id;

  if not found then
    raise exception 'merch_item not found for merch_variant %', p_merch_variant_id;
  end if;

  if p_member_id is not null then
    select *
      into v_member
    from public.members
    where id = p_member_id;
  end if;

  if p_customer_id is not null then
    select *
      into v_invoice_customer
    from public.invoice_customers
    where id = p_customer_id;

    if not found then
      raise exception 'invoice_customer not found: %', p_customer_id;
    end if;
  end if;

  v_subtotal_cents := p_quantity * p_unit_price_cents;

  if p_discount_cents > v_subtotal_cents then
    raise exception 'discount_cents must not exceed subtotal_cents';
  end if;

  v_total_cents := v_subtotal_cents - p_discount_cents;
  v_invoice_total := v_total_cents::numeric / 100;

  v_customer_name := nullif(trim(coalesce(
    nullif(trim(coalesce(p_buyer_name, '')), ''),
    v_invoice_customer.name,
    trim(coalesce(v_member.first_name, '') || ' ' || coalesce(v_member.last_name, ''))
  )), '');
  v_customer_email := nullif(trim(coalesce(nullif(trim(coalesce(p_buyer_email, '')), ''), v_invoice_customer.email, v_member.email)), '');
  v_customer_street := nullif(trim(coalesce(nullif(trim(coalesce(p_customer_street, '')), ''), v_invoice_customer.street, v_member.street)), '');
  v_customer_house_number := nullif(trim(coalesce(nullif(trim(coalesce(p_customer_house_number, '')), ''), v_invoice_customer.house_number)), '');
  v_customer_address_addition := nullif(trim(coalesce(nullif(trim(coalesce(p_customer_address_addition, '')), ''), v_invoice_customer.address_addition)), '');
  v_customer_postal_code := nullif(trim(coalesce(nullif(trim(coalesce(p_customer_postal_code, '')), ''), v_invoice_customer.postal_code, v_member.postal_code)), '');
  v_customer_city := nullif(trim(coalesce(nullif(trim(coalesce(p_customer_city, '')), ''), v_invoice_customer.city, v_member.city)), '');
  v_customer_country := nullif(trim(coalesce(nullif(trim(coalesce(p_customer_country, '')), ''), v_invoice_customer.country, 'Oesterreich')), '');
  v_customer_address := nullif(
    array_to_string(
      array_remove(array[
        v_customer_street,
        nullif(trim(coalesce(v_customer_postal_code, '') || ' ' || coalesce(v_customer_city, '')), ''),
        v_customer_country
      ], null),
      ', '
    ),
    ''
  );

  if coalesce(p_create_invoice, true) and v_customer_name is null then
    raise exception 'buyer_name or member_id with member name is required when creating an invoice';
  end if;

  v_item_description := trim(
    v_merch_item.name ||
    coalesce(' - ' || nullif(trim(array_to_string(array_remove(array[
      v_variant.variant_name,
      v_variant.size,
      v_variant.color,
      v_variant.sku
    ], null), ' / ')), ''), '')
  );

  if coalesce(p_create_invoice, true) then
    v_invoice_number := public.get_next_invoice_number(extract(year from v_sale_date)::integer, coalesce(p_invoice_is_test, false));

    insert into public.invoices (
      invoice_number,
      customer_id,
      customer_name,
      customer_email,
      customer_address,
      customer_street,
      customer_house_number,
      customer_address_addition,
      customer_postal_code,
      customer_city,
      customer_country,
      issue_date,
      due_date,
      total_amount,
      status,
      paid_at,
      is_test,
      invoice_type,
      notes,
      created_by,
      member_id
    )
    values (
      v_invoice_number,
      p_customer_id,
      v_customer_name,
      v_customer_email,
      v_customer_address,
      v_customer_street,
      v_customer_house_number,
      v_customer_address_addition,
      v_customer_postal_code,
      v_customer_city,
      coalesce(v_customer_country, 'Oesterreich'),
      v_sale_date,
      p_invoice_due_date,
      v_invoice_total,
      p_invoice_status,
      case when p_invoice_status = 'bezahlt' then v_sale_date else null end,
      coalesce(p_invoice_is_test, false),
      'rechnung',
      nullif(trim(coalesce(p_invoice_notes, p_notes, '')), ''),
      auth.uid(),
      p_member_id
    )
    returning id into v_invoice_id;

    insert into public.invoice_items (
      invoice_id,
      description,
      quantity,
      unit_price,
      total_price
    )
    values (
      v_invoice_id,
      v_item_description,
      p_quantity,
      p_unit_price_cents::numeric / 100,
      v_invoice_total
    );
  end if;

  if coalesce(p_create_cash_entry, true) then
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
      invoice_id,
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
      v_invoice_total,
      case
        when v_invoice_number is not null then 'Rechnung bezahlt: ' || v_invoice_number || ' - ' || v_customer_name
        else coalesce(nullif(trim(p_notes), ''), 'Fanartikel-Verkauf')
      end,
      null,
      v_invoice_id,
      p_member_id
    )
    returning id into v_cash_entry_id;
  end if;

  insert into public.merch_sales (
    sale_date,
    member_id,
    event_id,
    cash_entry_id,
    invoice_id,
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
    v_invoice_id,
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
  invoice_id := v_invoice_id;
  invoice_number := v_invoice_number;
  cash_entry_id := v_cash_entry_id;

  return next;
end;
$$;

revoke all on function public.create_merch_sale_with_invoice(
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
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  text,
  boolean,
  boolean,
  text,
  date,
  text
) from public;
revoke all on function public.create_merch_sale_with_invoice(
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
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  text,
  boolean,
  boolean,
  text,
  date,
  text
) from anon;
grant execute on function public.create_merch_sale_with_invoice(
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
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  text,
  boolean,
  boolean,
  text,
  date,
  text
) to authenticated;

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
  v_invoice public.invoices%rowtype;
  v_existing_cancellation_id uuid;
  v_cancellation_id uuid;
  v_cancellation_number text;
  v_cancelled_at timestamptz := now();
  v_restored_items integer := 0;
  v_restored_quantity integer := 0;
  v_reason text := nullif(trim(coalesce(p_cancellation_reason, '')), '');
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
    where public.merch_sale_items.merch_sale_id = p_merch_sale_id
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
    set
      is_cancelled = true,
      cancelled_at = v_cancelled_at,
      cancellation_reason = v_reason
    where id = v_sale.cash_entry_id;
  end if;

  if v_sale.invoice_id is not null then
    if not exists (
      select 1
      from public.members
      where members.auth_user_id = auth.uid()
        and members.app_role = 'admin'
    ) then
      raise exception 'only admins can cancel merch sales with invoices';
    end if;

    select *
      into v_invoice
    from public.invoices
    where id = v_sale.invoice_id
    for update;

    if found and v_invoice.status <> 'storniert' then
      select id
        into v_existing_cancellation_id
      from public.invoices
      where original_invoice_id = v_invoice.id
        and invoice_type = 'storno'
      limit 1;

      if v_existing_cancellation_id is null then
        v_cancellation_number := public.get_next_cancellation_invoice_number(
          extract(year from coalesce(v_invoice.issue_date, current_date))::integer,
          coalesce(v_invoice.is_test, false)
        );

        insert into public.invoices (
          invoice_number,
          customer_id,
          customer_name,
          customer_email,
          customer_address,
          customer_street,
          customer_house_number,
          customer_address_addition,
          customer_postal_code,
          customer_city,
          customer_country,
          issue_date,
          due_date,
          total_amount,
          status,
          is_test,
          invoice_type,
          original_invoice_id,
          cancellation_reason,
          notes,
          created_by,
          member_id,
          membership_fee_id
        )
        values (
          v_cancellation_number,
          v_invoice.customer_id,
          v_invoice.customer_name,
          v_invoice.customer_email,
          v_invoice.customer_address,
          v_invoice.customer_street,
          v_invoice.customer_house_number,
          v_invoice.customer_address_addition,
          v_invoice.customer_postal_code,
          v_invoice.customer_city,
          v_invoice.customer_country,
          current_date,
          null,
          -abs(coalesce(v_invoice.total_amount, 0)),
          'storniert',
          coalesce(v_invoice.is_test, false),
          'storno',
          v_invoice.id,
          v_reason,
          'Stornorechnung zu ' || v_invoice.invoice_number,
          auth.uid(),
          v_invoice.member_id,
          v_invoice.membership_fee_id
        )
        returning id into v_cancellation_id;

        insert into public.invoice_items (
          invoice_id,
          description,
          quantity,
          unit_price,
          total_price
        )
        select
          v_cancellation_id,
          'Storno: ' || coalesce(description, ''),
          quantity,
          -abs(unit_price),
          -abs(total_price)
        from public.invoice_items
        where invoice_id = v_invoice.id;
      end if;

      update public.invoices
      set
        status = 'storniert',
        cancelled_at = v_cancelled_at,
        cancellation_reason = v_reason
      where id = v_invoice.id;
    end if;
  end if;

  update public.merch_sales
  set
    status = 'cancelled',
    cancellation_reason = v_reason,
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

revoke all on function public.cancel_merch_sale(uuid, text) from public;
revoke all on function public.cancel_merch_sale(uuid, text) from anon;
grant execute on function public.cancel_merch_sale(uuid, text) to authenticated;
