create table if not exists public.financing_liabilities (
  id uuid primary key default gen_random_uuid(),
  creditor_member_id uuid references public.members(id) on delete set null,
  creditor_name text not null,
  description text not null,
  original_amount numeric(12,2) not null,
  financed_at date not null default current_date,
  due_date date,
  category text not null default 'sonstiges',
  status text not null default 'open',
  internal_note text,
  linked_cash_entry_id uuid references public.cash_entries(id) on delete set null,
  receipt_url text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_by_member_id uuid references public.members(id) on delete set null,
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id) on delete set null,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financing_liabilities_amount_positive check (original_amount > 0),
  constraint financing_liabilities_creditor_name_required check (length(trim(creditor_name)) > 0),
  constraint financing_liabilities_description_required check (length(trim(description)) > 0),
  constraint financing_liabilities_category_required check (length(trim(category)) > 0),
  constraint financing_liabilities_status_check check (status in ('open', 'partially_paid', 'paid', 'cancelled')),
  constraint financing_liabilities_cancelled_fields_check check (
    (status <> 'cancelled' and cancelled_at is null)
    or (status = 'cancelled' and cancelled_at is not null)
  )
);

create table if not exists public.financing_liability_repayments (
  id uuid primary key default gen_random_uuid(),
  liability_id uuid not null references public.financing_liabilities(id) on delete restrict,
  amount numeric(12,2) not null,
  paid_at date not null default current_date,
  note text,
  cash_entry_id uuid not null unique references public.cash_entries(id) on delete restrict,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id) on delete set null,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  constraint financing_liability_repayments_amount_positive check (amount > 0),
  constraint financing_liability_repayments_cancel_reason_check check (
    cancelled_at is null
    or length(trim(coalesce(cancellation_reason, ''))) > 0
  )
);

alter table public.cash_entries
  add column if not exists financing_liability_id uuid references public.financing_liabilities(id) on delete set null;

alter table public.cash_entries
  add column if not exists financing_liability_repayment_id uuid references public.financing_liability_repayments(id) on delete set null;

create index if not exists financing_liabilities_creditor_member_id_idx
  on public.financing_liabilities (creditor_member_id);
create index if not exists financing_liabilities_status_idx
  on public.financing_liabilities (status);
create index if not exists financing_liabilities_financed_at_idx
  on public.financing_liabilities (financed_at desc);
create index if not exists financing_liabilities_due_date_open_idx
  on public.financing_liabilities (due_date)
  where status in ('open', 'partially_paid');
create index if not exists financing_liability_repayments_liability_id_idx
  on public.financing_liability_repayments (liability_id);
create index if not exists financing_liability_repayments_paid_at_idx
  on public.financing_liability_repayments (paid_at desc);
create index if not exists cash_entries_financing_liability_id_idx
  on public.cash_entries (financing_liability_id);
create unique index if not exists cash_entries_financing_liability_repayment_id_uidx
  on public.cash_entries (financing_liability_repayment_id)
  where financing_liability_repayment_id is not null;

drop trigger if exists set_financing_liabilities_updated_at on public.financing_liabilities;
create trigger set_financing_liabilities_updated_at
  before update on public.financing_liabilities
  for each row
  execute function public.set_updated_at();

create or replace function public.guard_financing_liability_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'cancelled' then
      new.status := 'open';
      new.cancelled_at := null;
      new.cancelled_by := null;
      new.cancellation_reason := null;
    end if;

    return new;
  end if;

  if current_setting('app.financing_liability_status_refresh', true) = 'on' then
    return new;
  end if;

  if old.status = 'cancelled' then
    new.status := 'cancelled';
    new.cancelled_at := old.cancelled_at;
    new.cancelled_by := old.cancelled_by;
    new.cancellation_reason := old.cancellation_reason;
    return new;
  end if;

  if new.status = 'cancelled' and new.cancelled_at is not null then
    return new;
  end if;

  new.status := old.status;
  new.cancelled_at := old.cancelled_at;
  new.cancelled_by := old.cancelled_by;
  new.cancellation_reason := old.cancellation_reason;
  return new;
end;
$$;

drop trigger if exists guard_financing_liability_status_trigger on public.financing_liabilities;
create trigger guard_financing_liability_status_trigger
  before insert or update on public.financing_liabilities
  for each row
  execute function public.guard_financing_liability_status();

create or replace function public.refresh_financing_liability_status(p_liability_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_original_amount numeric(12,2);
  v_repaid_amount numeric(12,2);
  v_status text;
begin
  select original_amount
    into v_original_amount
  from public.financing_liabilities
  where id = p_liability_id
    and status <> 'cancelled'
  for update;

  if not found then
    return;
  end if;

  select coalesce(sum(amount), 0)::numeric(12,2)
    into v_repaid_amount
  from public.financing_liability_repayments
  where liability_id = p_liability_id
    and cancelled_at is null;

  if v_repaid_amount <= 0 then
    v_status := 'open';
  elsif v_repaid_amount < v_original_amount then
    v_status := 'partially_paid';
  else
    v_status := 'paid';
  end if;

  perform set_config('app.financing_liability_status_refresh', 'on', true);

  update public.financing_liabilities
  set status = v_status
  where id = p_liability_id;
end;
$$;

create or replace function public.refresh_financing_liability_status_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_financing_liability_status(coalesce(new.liability_id, old.liability_id));
  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists refresh_financing_liability_status_after_repayment on public.financing_liability_repayments;
create trigger refresh_financing_liability_status_after_repayment
  after insert or update on public.financing_liability_repayments
  for each row
  execute function public.refresh_financing_liability_status_trigger();

create or replace view public.financing_liability_balances
with (security_invoker = true)
as
select
  liability.*,
  coalesce(repayments.repaid_amount, 0)::numeric(12,2) as repaid_amount,
  greatest(liability.original_amount - coalesce(repayments.repaid_amount, 0), 0)::numeric(12,2) as open_amount,
  case
    when liability.status = 'cancelled' then 'cancelled'
    when coalesce(repayments.repaid_amount, 0) <= 0 then 'open'
    when coalesce(repayments.repaid_amount, 0) < liability.original_amount then 'partially_paid'
    else 'paid'
  end as computed_status
from public.financing_liabilities liability
left join (
  select liability_id, sum(amount)::numeric(12,2) as repaid_amount
  from public.financing_liability_repayments
  where cancelled_at is null
  group by liability_id
) repayments on repayments.liability_id = liability.id;

create or replace function public.create_financing_liability_repayment(
  p_liability_id uuid,
  p_amount numeric,
  p_paid_at date default current_date,
  p_payment_method text default 'bar',
  p_description text default null,
  p_note text default null
)
returns table (
  repayment_id uuid,
  cash_entry_id uuid,
  liability_status text,
  open_amount numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_liability public.financing_liabilities%rowtype;
  v_paid_amount numeric(12,2);
  v_open_amount numeric(12,2);
  v_repayment_id uuid;
  v_cash_entry_id uuid;
  v_description text;
  v_payment_method text;
begin
  if not public.has_app_permission('vorfinanzierungen', 'edit') then
    raise exception 'forbidden';
  end if;

  if p_liability_id is null then
    raise exception 'liability id is required';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'amount must be greater than zero';
  end if;

  select *
    into v_liability
  from public.financing_liabilities
  where id = p_liability_id
  for update;

  if not found then
    raise exception 'liability not found';
  end if;

  if v_liability.status = 'cancelled' then
    raise exception 'cancelled liabilities cannot receive repayments';
  end if;

  select coalesce(sum(amount), 0)::numeric(12,2)
    into v_paid_amount
  from public.financing_liability_repayments
  where liability_id = p_liability_id
    and cancelled_at is null;

  v_open_amount := greatest(v_liability.original_amount - v_paid_amount, 0)::numeric(12,2);

  if v_open_amount <= 0 or v_liability.status = 'paid' then
    raise exception 'paid liabilities cannot receive repayments';
  end if;

  if round(p_amount, 2) > v_open_amount then
    raise exception 'repayment exceeds open amount';
  end if;

  v_payment_method := case
    when p_payment_method in ('bar', 'ebanking', 'ueberweisung', 'vereinskonto', 'sonstiges') then p_payment_method
    else 'bar'
  end;
  v_description := coalesce(nullif(trim(p_description), ''), 'Rueckzahlung Vorfinanzierung: ' || v_liability.description);

  insert into public.cash_entries (
    entry_date,
    entry_year,
    is_cancelled,
    type,
    category,
    amount,
    description,
    payment_method,
    is_opening,
    is_test,
    member_id,
    financing_liability_id
  )
  values (
    coalesce(p_paid_at, current_date),
    extract(year from coalesce(p_paid_at, current_date))::integer,
    false,
    'ausgabe',
    'vorfinanzierung',
    round(p_amount, 2),
    v_description,
    v_payment_method,
    false,
    false,
    v_liability.creditor_member_id,
    p_liability_id
  )
  returning id into v_cash_entry_id;

  insert into public.financing_liability_repayments (
    liability_id,
    amount,
    paid_at,
    note,
    cash_entry_id,
    created_by
  )
  values (
    p_liability_id,
    round(p_amount, 2),
    coalesce(p_paid_at, current_date),
    nullif(trim(coalesce(p_note, '')), ''),
    v_cash_entry_id,
    auth.uid()
  )
  returning id into v_repayment_id;

  update public.cash_entries
  set financing_liability_repayment_id = v_repayment_id
  where id = v_cash_entry_id;

  perform public.refresh_financing_liability_status(p_liability_id);

  select status
    into liability_status
  from public.financing_liabilities
  where id = p_liability_id;

  open_amount := greatest(v_liability.original_amount - v_paid_amount - round(p_amount, 2), 0)::numeric(12,2);
  repayment_id := v_repayment_id;
  cash_entry_id := v_cash_entry_id;
  return next;
end;
$$;

create or replace function public.cancel_financing_liability(
  p_liability_id uuid,
  p_cancellation_reason text
)
returns table (
  liability_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_repayment_count integer;
begin
  if not public.has_app_permission('vorfinanzierungen', 'delete') then
    raise exception 'forbidden';
  end if;

  if length(trim(coalesce(p_cancellation_reason, ''))) = 0 then
    raise exception 'cancellation reason is required';
  end if;

  select count(*)::integer
    into v_repayment_count
  from public.financing_liability_repayments
  where liability_id = p_liability_id
    and cancelled_at is null;

  if v_repayment_count > 0 then
    raise exception 'liabilities with active repayments cannot be cancelled';
  end if;

  update public.financing_liabilities
  set
    status = 'cancelled',
    cancelled_at = now(),
    cancelled_by = auth.uid(),
    cancellation_reason = trim(p_cancellation_reason)
  where id = p_liability_id
    and status <> 'cancelled'
  returning id, financing_liabilities.status
  into liability_id, status;

  if liability_id is null then
    raise exception 'liability not found';
  end if;

  return next;
end;
$$;

create or replace function public.cancel_financing_liability_repayment(
  p_repayment_id uuid,
  p_cancellation_reason text
)
returns table (
  repayment_id uuid,
  cash_entry_id uuid,
  liability_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_repayment public.financing_liability_repayments%rowtype;
  v_reason text;
begin
  if not public.has_app_permission('vorfinanzierungen', 'delete') then
    raise exception 'forbidden';
  end if;

  v_reason := trim(coalesce(p_cancellation_reason, ''));
  if length(v_reason) = 0 then
    raise exception 'cancellation reason is required';
  end if;

  select *
    into v_repayment
  from public.financing_liability_repayments
  where id = p_repayment_id
  for update;

  if not found then
    raise exception 'repayment not found';
  end if;

  if v_repayment.cancelled_at is not null then
    repayment_id := v_repayment.id;
    cash_entry_id := v_repayment.cash_entry_id;
    select status into liability_status from public.financing_liabilities where id = v_repayment.liability_id;
    return next;
    return;
  end if;

  update public.financing_liability_repayments
  set
    cancelled_at = now(),
    cancelled_by = auth.uid(),
    cancellation_reason = v_reason
  where id = v_repayment.id;

  update public.cash_entries
  set
    is_cancelled = true,
    cancelled_at = coalesce(cancelled_at, now()),
    cancellation_reason = coalesce(nullif(trim(cancellation_reason), ''), 'Rueckzahlung Vorfinanzierung storniert: ' || v_reason)
  where id = v_repayment.cash_entry_id;

  perform public.refresh_financing_liability_status(v_repayment.liability_id);

  repayment_id := v_repayment.id;
  cash_entry_id := v_repayment.cash_entry_id;
  select status into liability_status from public.financing_liabilities where id = v_repayment.liability_id;
  return next;
end;
$$;

alter table public.financing_liabilities enable row level security;
alter table public.financing_liability_repayments enable row level security;

revoke all on table public.financing_liabilities from public;
revoke all on table public.financing_liabilities from anon;
grant select, insert, update on table public.financing_liabilities to authenticated;

revoke all on table public.financing_liability_repayments from public;
revoke all on table public.financing_liability_repayments from anon;
grant select on table public.financing_liability_repayments to authenticated;

revoke all on table public.financing_liability_balances from public;
revoke all on table public.financing_liability_balances from anon;
grant select on table public.financing_liability_balances to authenticated;

insert into public.permissions (key, module, action, label)
select 'vorfinanzierungen.' || action, 'vorfinanzierungen', action, 'Vorfinanzierungen & Verbindlichkeiten'
from (values ('view'), ('create'), ('edit'), ('delete')) as actions(action)
on conflict (key) do update set
  module = excluded.module,
  action = excluded.action,
  label = excluded.label;

insert into public.role_permissions (role_key, permission_key)
select 'super_admin', key
from public.permissions
where module = 'vorfinanzierungen'
on conflict do nothing;

insert into public.role_permissions (role_key, permission_key)
select 'administrator', key
from public.permissions
where module = 'vorfinanzierungen'
on conflict do nothing;

insert into public.role_permissions (role_key, permission_key)
select 'kassier', 'vorfinanzierungen.' || action
from (values ('view'), ('create'), ('edit'), ('delete')) as actions(action)
on conflict do nothing;

insert into public.role_permissions (role_key, permission_key)
select 'vorstand', 'vorfinanzierungen.' || action
from (values ('view'), ('create')) as actions(action)
on conflict do nothing;

insert into public.role_permissions (role_key, permission_key)
select 'schriftfuehrer', 'vorfinanzierungen.view'
on conflict do nothing;

insert into public.role_permissions (role_key, permission_key)
select 'rechnungspruefer', 'vorfinanzierungen.view'
on conflict do nothing;

drop policy if exists "financing liabilities readable by finance roles" on public.financing_liabilities;
create policy "financing liabilities readable by finance roles"
  on public.financing_liabilities for select
  to authenticated
  using (public.has_app_permission('vorfinanzierungen', 'view'));

drop policy if exists "financing liabilities creatable by finance roles" on public.financing_liabilities;
create policy "financing liabilities creatable by finance roles"
  on public.financing_liabilities for insert
  to authenticated
  with check (public.has_app_permission('vorfinanzierungen', 'create'));

drop policy if exists "financing liabilities editable by finance roles" on public.financing_liabilities;
create policy "financing liabilities editable by finance roles"
  on public.financing_liabilities for update
  to authenticated
  using (public.has_app_permission('vorfinanzierungen', 'edit'))
  with check (public.has_app_permission('vorfinanzierungen', 'edit'));

drop policy if exists "financing repayments readable by finance roles" on public.financing_liability_repayments;
create policy "financing repayments readable by finance roles"
  on public.financing_liability_repayments for select
  to authenticated
  using (public.has_app_permission('vorfinanzierungen', 'view'));

revoke all on function public.guard_financing_liability_status() from public;
revoke all on function public.guard_financing_liability_status() from anon;
revoke all on function public.refresh_financing_liability_status(uuid) from public;
revoke all on function public.refresh_financing_liability_status(uuid) from anon;
revoke all on function public.refresh_financing_liability_status_trigger() from public;
revoke all on function public.refresh_financing_liability_status_trigger() from anon;

revoke all on function public.create_financing_liability_repayment(uuid, numeric, date, text, text, text) from public;
revoke all on function public.create_financing_liability_repayment(uuid, numeric, date, text, text, text) from anon;
grant execute on function public.create_financing_liability_repayment(uuid, numeric, date, text, text, text) to authenticated;

revoke all on function public.cancel_financing_liability(uuid, text) from public;
revoke all on function public.cancel_financing_liability(uuid, text) from anon;
grant execute on function public.cancel_financing_liability(uuid, text) to authenticated;

revoke all on function public.cancel_financing_liability_repayment(uuid, text) from public;
revoke all on function public.cancel_financing_liability_repayment(uuid, text) from anon;
grant execute on function public.cancel_financing_liability_repayment(uuid, text) to authenticated;
