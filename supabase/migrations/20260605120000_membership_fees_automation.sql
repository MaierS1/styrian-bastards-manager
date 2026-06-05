create or replace function public.is_admin_user()
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
      and app_role = 'admin'
  );
$$;

create or replace function public.get_membership_fee_amount_for_member_type(p_member_type text)
returns numeric
language sql
immutable
as $$
  select case
    when p_member_type = 'vollmitglied' then 70
    when p_member_type = 'foerdermitglied' then 40
    when p_member_type = 'probejahr' then 40
    else 0
  end;
$$;

create table if not exists public.membership_fee_periods (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  title text,
  due_date date,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint membership_fee_periods_year_check check (year >= 2000),
  constraint membership_fee_periods_title_not_blank check (title is null or length(trim(title)) > 0),
  constraint membership_fee_periods_status_check check (status in ('open', 'closed'))
);

create unique index if not exists membership_fee_periods_year_uidx
  on public.membership_fee_periods (year);

create index if not exists membership_fee_periods_status_idx
  on public.membership_fee_periods (status);

drop trigger if exists set_membership_fee_periods_updated_at on public.membership_fee_periods;

create trigger set_membership_fee_periods_updated_at
  before update on public.membership_fee_periods
  for each row
  execute function public.set_updated_at();

alter table public.membership_fee_periods enable row level security;

revoke all on table public.membership_fee_periods from public;
revoke all on table public.membership_fee_periods from anon;
grant select, insert, update, delete on table public.membership_fee_periods to authenticated;

drop policy if exists "authenticated users can read membership fee periods" on public.membership_fee_periods;
create policy "authenticated users can read membership fee periods"
  on public.membership_fee_periods
  for select
  to authenticated
  using (public.is_admin_user());

drop policy if exists "authenticated users can insert membership fee periods" on public.membership_fee_periods;
create policy "authenticated users can insert membership fee periods"
  on public.membership_fee_periods
  for insert
  to authenticated
  with check (public.is_admin_user());

drop policy if exists "authenticated users can update membership fee periods" on public.membership_fee_periods;
create policy "authenticated users can update membership fee periods"
  on public.membership_fee_periods
  for update
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "authenticated users can delete membership fee periods" on public.membership_fee_periods;
create policy "authenticated users can delete membership fee periods"
  on public.membership_fee_periods
  for delete
  to authenticated
  using (public.is_admin_user());

create table if not exists public.membership_fee_items (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.membership_fee_periods(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  amount numeric(10,2) not null default 0,
  status text not null default 'open',
  due_date date,
  paid_at timestamptz,
  cash_entry_id uuid,
  reminder_sent_at timestamptz,
  notification_status text,
  notification_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint membership_fee_items_amount_check check (amount >= 0),
  constraint membership_fee_items_status_check check (status in ('open', 'reminded', 'paid', 'waived', 'cancelled')),
  constraint membership_fee_items_notification_status_check check (
    notification_status is null or notification_status in ('sent', 'error')
  ),
  constraint membership_fee_items_notification_error_not_blank check (
    notification_error is null or length(trim(notification_error)) > 0
  )
);

create unique index if not exists membership_fee_items_period_member_uidx
  on public.membership_fee_items (period_id, member_id);

create index if not exists membership_fee_items_period_idx
  on public.membership_fee_items (period_id);

create index if not exists membership_fee_items_member_idx
  on public.membership_fee_items (member_id);

create index if not exists membership_fee_items_status_idx
  on public.membership_fee_items (status);

create index if not exists membership_fee_items_cash_entry_idx
  on public.membership_fee_items (cash_entry_id);

drop trigger if exists set_membership_fee_items_updated_at on public.membership_fee_items;

create trigger set_membership_fee_items_updated_at
  before update on public.membership_fee_items
  for each row
  execute function public.set_updated_at();

alter table public.membership_fee_items enable row level security;

revoke all on table public.membership_fee_items from public;
revoke all on table public.membership_fee_items from anon;
grant select, insert, update, delete on table public.membership_fee_items to authenticated;

drop policy if exists "authenticated users can read membership fee items" on public.membership_fee_items;
create policy "authenticated users can read membership fee items"
  on public.membership_fee_items
  for select
  to authenticated
  using (public.is_admin_user());

drop policy if exists "authenticated users can insert membership fee items" on public.membership_fee_items;
create policy "authenticated users can insert membership fee items"
  on public.membership_fee_items
  for insert
  to authenticated
  with check (public.is_admin_user());

drop policy if exists "authenticated users can update membership fee items" on public.membership_fee_items;
create policy "authenticated users can update membership fee items"
  on public.membership_fee_items
  for update
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "authenticated users can delete membership fee items" on public.membership_fee_items;
create policy "authenticated users can delete membership fee items"
  on public.membership_fee_items
  for delete
  to authenticated
  using (public.is_admin_user());

alter table public.cash_entries
  add column if not exists membership_fee_item_id uuid references public.membership_fee_items(id) on delete set null;

create index if not exists cash_entries_membership_fee_item_id_idx
  on public.cash_entries (membership_fee_item_id);

create or replace function public.create_membership_fee_period_and_items(
  p_year integer,
  p_title text default null,
  p_due_date date default null
)
returns table (
  period_id uuid,
  year integer,
  created_count integer,
  skipped_count integer,
  total_active_count integer,
  period_created boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period public.membership_fee_periods%rowtype;
begin
  if not public.is_admin_user() then
    raise exception 'forbidden';
  end if;

  if p_year is null or p_year < 2000 then
    raise exception 'invalid year';
  end if;

  select *
    into v_period
  from public.membership_fee_periods
  where year = p_year
  limit 1;

  if not found then
    insert into public.membership_fee_periods (year, title, due_date, status)
    values (
      p_year,
      nullif(trim(coalesce(p_title, format('Mitgliedsbeiträge %s', p_year))), ''),
      p_due_date,
      'open'
    )
    returning * into v_period;

    period_created := true;
  else
    period_created := false;
  end if;

  select count(*)
    into total_active_count
  from public.members
  where status = 'aktiv'
    and coalesce(is_test, false) = false;

  insert into public.membership_fee_items (
    period_id,
    member_id,
    amount,
    status,
    due_date
  )
  select
    v_period.id,
    active_members.id,
    public.get_membership_fee_amount_for_member_type(active_members.member_type),
    case
      when public.get_membership_fee_amount_for_member_type(active_members.member_type) <= 0 then 'waived'
      else 'open'
    end,
    coalesce(p_due_date, v_period.due_date)
  from public.members as active_members
  where active_members.status = 'aktiv'
    and coalesce(active_members.is_test, false) = false
    and not exists (
      select 1
      from public.membership_fee_items existing
      where existing.period_id = v_period.id
        and existing.member_id = active_members.id
    );

  get diagnostics created_count = row_count;
  skipped_count := greatest(total_active_count - created_count, 0);

  period_id := v_period.id;
  year := p_year;
  return next;
end;
$$;

revoke all on function public.create_membership_fee_period_and_items(integer, text, date) from public;
grant execute on function public.create_membership_fee_period_and_items(integer, text, date) to authenticated;

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
  from public.membership_fee_items
  where id = p_fee_item_id
  for update;

  if not found then
    raise exception 'fee item not found';
  end if;

  select *
    into v_member
  from public.members
  where id = v_item.member_id;

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

  update public.membership_fee_items
    set
      status = 'paid',
      paid_at = v_paid_at,
      cash_entry_id = v_cash_entry_id
  where id = p_fee_item_id
  returning id, cash_entry_id, paid_at, status
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
  from public.membership_fee_items
  where id = p_fee_item_id
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

  update public.membership_fee_items
    set
      status = 'open',
      paid_at = null,
      cash_entry_id = null
  where id = p_fee_item_id
  returning id, cash_entry_id, status
  into fee_item_id, cash_entry_id, status;

  return next;
end;
$$;

revoke all on function public.reopen_membership_fee_item(uuid, boolean) from public;
grant execute on function public.reopen_membership_fee_item(uuid, boolean) to authenticated;
