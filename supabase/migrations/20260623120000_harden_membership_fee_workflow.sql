create or replace function public.mark_membership_fee_item_paid(
  p_fee_item_id uuid,
  p_paid_at date default current_date,
  p_payment_method text default 'bar',
  p_create_cash_entry boolean default true
)
returns table (
  fee_item_id uuid,
  cash_entry_id uuid,
  paid_at timestamptz,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.membership_fee_items%rowtype;
  v_member public.members%rowtype;
  v_cash_entry_id uuid;
  v_paid_at timestamptz;
  v_payment_method text;
begin
  if not public.is_admin_user() then
    raise exception 'forbidden';
  end if;

  if p_fee_item_id is null then
    raise exception 'fee item id is required';
  end if;

  select *
    into v_item
  from public.membership_fee_items item
  where item.id = p_fee_item_id
  for update;

  if not found then
    raise exception 'fee item not found';
  end if;

  if coalesce(v_item.amount, 0) <= 0 then
    raise exception 'only fee items with an amount can be marked paid';
  end if;

  if v_item.status = 'paid' then
    fee_item_id := v_item.id;
    cash_entry_id := v_item.cash_entry_id;
    paid_at := v_item.paid_at;
    status := v_item.status;
    return next;
    return;
  end if;

  select *
    into v_member
  from public.members m
  where m.id = v_item.member_id;

  v_paid_at := coalesce(p_paid_at, current_date)::timestamptz;
  v_payment_method := case
    when p_payment_method in ('bar', 'ebanking') then p_payment_method
    else 'bar'
  end;

  if v_item.cash_entry_id is null then
    select id
      into v_cash_entry_id
    from public.cash_entries
    where membership_fee_item_id = p_fee_item_id
      and is_cancelled = false
    order by created_at desc
    limit 1;
  else
    v_cash_entry_id := v_item.cash_entry_id;
  end if;

  if p_create_cash_entry and v_cash_entry_id is null then
    insert into public.cash_entries (
      entry_date,
      entry_year,
      is_cancelled,
      type,
      category,
      amount,
      description,
      payment_method,
      is_test,
      member_id,
      membership_fee_item_id
    )
    values (
      (v_paid_at at time zone 'UTC')::date,
      extract(year from v_paid_at)::integer,
      false,
      'einnahme',
      'mitgliedsbeitrag',
      abs(coalesce(v_item.amount, 0)),
      concat(
        'Mitgliedsbeitrag ',
        extract(year from coalesce(v_item.due_date, (v_paid_at at time zone 'UTC')::date))::integer,
        ' - ',
        coalesce(nullif(trim(concat(coalesce(v_member.first_name, ''), ' ', coalesce(v_member.last_name, ''))), ''), 'Mitglied')
      ),
      v_payment_method,
      coalesce(v_member.is_test, false),
      v_item.member_id,
      p_fee_item_id
    )
    returning id into v_cash_entry_id;
  end if;

  update public.membership_fee_items item
    set
      status = 'paid',
      paid_at = v_paid_at,
      cash_entry_id = v_cash_entry_id
  where item.id = p_fee_item_id
  returning item.id, item.cash_entry_id, item.paid_at, item.status
  into fee_item_id, cash_entry_id, paid_at, status;

  return next;
end;
$$;

revoke all on function public.mark_membership_fee_item_paid(uuid, date, text, boolean) from public;
grant execute on function public.mark_membership_fee_item_paid(uuid, date, text, boolean) to authenticated;

create or replace function public.reopen_membership_fee_item(
  p_fee_item_id uuid,
  p_cancel_cash_entry boolean default true
)
returns table (
  fee_item_id uuid,
  cash_entry_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.membership_fee_items%rowtype;
  v_cash_entry_id uuid;
begin
  if not public.is_admin_user() then
    raise exception 'forbidden';
  end if;

  if p_fee_item_id is null then
    raise exception 'fee item id is required';
  end if;

  select *
    into v_item
  from public.membership_fee_items item
  where item.id = p_fee_item_id
  for update;

  if not found then
    raise exception 'fee item not found';
  end if;

  v_cash_entry_id := v_item.cash_entry_id;

  if v_cash_entry_id is null then
    select id
      into v_cash_entry_id
    from public.cash_entries
    where membership_fee_item_id = p_fee_item_id
      and is_cancelled = false
    order by created_at desc
    limit 1;
  end if;

  if p_cancel_cash_entry and v_cash_entry_id is not null then
    update public.cash_entries
      set
        is_cancelled = true,
        cancelled_at = coalesce(cancelled_at, now()),
        cancellation_reason = coalesce(
          nullif(trim(cancellation_reason), ''),
          'Beitrag wieder offen gesetzt'
        ),
        membership_fee_item_id = membership_fee_item_id
    where id = v_cash_entry_id;
  end if;

  update public.membership_fee_items item
    set
      status = 'open',
      paid_at = null,
      cash_entry_id = null
  where item.id = p_fee_item_id
  returning item.id, item.cash_entry_id, item.status
  into fee_item_id, cash_entry_id, status;

  return next;
end;
$$;

revoke all on function public.reopen_membership_fee_item(uuid, boolean) from public;
grant execute on function public.reopen_membership_fee_item(uuid, boolean) to authenticated;
