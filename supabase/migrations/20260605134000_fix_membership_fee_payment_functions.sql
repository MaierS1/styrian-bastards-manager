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

  v_paid_at := coalesce(p_paid_at::timestamptz, now());
  v_payment_method := coalesce(nullif(trim(p_payment_method), ''), 'bar');

  if p_create_cash_entry then
    select *
      into v_member
    from public.members m
    where m.id = v_item.member_id;

    insert into public.cash_entries (
      entry_date,
      type,
      category,
      amount,
      description,
      member_id,
      membership_fee_item_id,
      payment_method,
      created_by
    )
    values (
      v_paid_at::date,
      'einnahme',
      'mitgliedsbeitrag',
      v_item.amount,
      concat('Mitgliedsbeitrag ', coalesce(v_member.first_name, ''), ' ', coalesce(v_member.last_name, '')),
      v_item.member_id,
      v_item.id,
      v_payment_method,
      null
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

  if p_cancel_cash_entry and v_cash_entry_id is not null then
    update public.cash_entries
      set
        is_cancelled = true,
        cancelled_at = now(),
        cancellation_reason = coalesce(nullif(cancellation_reason, ''), 'Mitgliedsbeitrag zurÃ¼ckgesetzt')
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