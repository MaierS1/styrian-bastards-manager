begin;

alter table public.cash_month_closings
  add column if not exists created_at timestamptz not null default now();

alter table public.cash_month_closings
  add column if not exists updated_at timestamptz not null default now();

alter table public.event_checkins
  add column if not exists updated_at timestamptz not null default now();

alter table public.inventory_items
  add column if not exists updated_at timestamptz not null default now();

alter table public.invoice_customers
  add column if not exists updated_at timestamptz not null default now();

alter table public.invoice_items
  add column if not exists updated_at timestamptz not null default now();

alter table public.invoices
  add column if not exists updated_at timestamptz not null default now();

alter table public.member_change_requests
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_cash_month_closings_updated_at'
      and tgrelid = 'public.cash_month_closings'::regclass
      and not tgisinternal
  ) then
    create trigger set_cash_month_closings_updated_at
      before update on public.cash_month_closings
      for each row
      execute function public.set_updated_at();
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_event_checkins_updated_at'
      and tgrelid = 'public.event_checkins'::regclass
      and not tgisinternal
  ) then
    create trigger set_event_checkins_updated_at
      before update on public.event_checkins
      for each row
      execute function public.set_updated_at();
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_inventory_items_updated_at'
      and tgrelid = 'public.inventory_items'::regclass
      and not tgisinternal
  ) then
    create trigger set_inventory_items_updated_at
      before update on public.inventory_items
      for each row
      execute function public.set_updated_at();
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_invoice_customers_updated_at'
      and tgrelid = 'public.invoice_customers'::regclass
      and not tgisinternal
  ) then
    create trigger set_invoice_customers_updated_at
      before update on public.invoice_customers
      for each row
      execute function public.set_updated_at();
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_invoice_items_updated_at'
      and tgrelid = 'public.invoice_items'::regclass
      and not tgisinternal
  ) then
    create trigger set_invoice_items_updated_at
      before update on public.invoice_items
      for each row
      execute function public.set_updated_at();
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_invoices_updated_at'
      and tgrelid = 'public.invoices'::regclass
      and not tgisinternal
  ) then
    create trigger set_invoices_updated_at
      before update on public.invoices
      for each row
      execute function public.set_updated_at();
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_member_change_requests_updated_at'
      and tgrelid = 'public.member_change_requests'::regclass
      and not tgisinternal
  ) then
    create trigger set_member_change_requests_updated_at
      before update on public.member_change_requests
      for each row
      execute function public.set_updated_at();
  end if;
end
$$;

commit;
