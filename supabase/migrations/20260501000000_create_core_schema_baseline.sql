create extension if not exists pgcrypto;

-- Vorsichtige Baseline fuer eine leere Staging-Datenbank.
-- Die spaeteren Migrationsdateien erweitern dieses Schema weiter.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  member_number text,
  first_name text,
  last_name text,
  email text,
  phone text,
  member_type text not null default 'vollmitglied',
  role text not null default 'mitglied',
  app_role text not null default 'readonly',
  status text not null default 'aktiv',
  is_test boolean not null default false,
  street text,
  postal_code text,
  city text,
  birthdate date,
  clothing_size text,
  auth_user_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists members_auth_user_id_idx on public.members (auth_user_id);
create index if not exists members_status_idx on public.members (status);
create index if not exists members_app_role_idx on public.members (app_role);
create index if not exists members_member_number_idx on public.members (member_number);

create or replace function public.is_board_member()
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
      and (
        app_role = 'admin'
        or role in ('obmann', 'obmann_stv', 'schriftfuehrer', 'schriftfuehrer_stv', 'kassier', 'kassier_stv', 'beirat')
      )
  );
$$;

drop trigger if exists set_members_updated_at on public.members;
create trigger set_members_updated_at
  before update on public.members
  for each row
  execute function public.set_updated_at();

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_date date,
  location text,
  status text not null default 'geplant',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_event_date_idx on public.events (event_date);
create index if not exists events_status_idx on public.events (status);
create index if not exists events_name_idx on public.events (lower(name));

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
  before update on public.events
  for each row
  execute function public.set_updated_at();

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  document_date date,
  description text,
  file_path text not null,
  file_name text,
  mime_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_document_date_idx on public.documents (document_date desc);
create index if not exists documents_category_idx on public.documents (category);
create index if not exists documents_title_idx on public.documents (lower(title));

drop trigger if exists set_documents_updated_at on public.documents;
create trigger set_documents_updated_at
  before update on public.documents
  for each row
  execute function public.set_updated_at();

create table if not exists public.membership_fees (
  id uuid primary key default gen_random_uuid(),
  member_id uuid,
  year integer not null,
  amount numeric(10,2) not null default 0,
  paid boolean not null default false,
  paid_at date,
  payment_method text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists membership_fees_member_id_idx on public.membership_fees (member_id);
create index if not exists membership_fees_year_idx on public.membership_fees (year);
create index if not exists membership_fees_paid_idx on public.membership_fees (paid);

drop trigger if exists set_membership_fees_updated_at on public.membership_fees;
create trigger set_membership_fees_updated_at
  before update on public.membership_fees
  for each row
  execute function public.set_updated_at();

create table if not exists public.invoice_customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  street text,
  house_number text,
  address_addition text,
  postal_code text,
  city text,
  country text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoice_customers_name_idx on public.invoice_customers (lower(name));

drop trigger if exists set_invoice_customers_updated_at on public.invoice_customers;
create trigger set_invoice_customers_updated_at
  before update on public.invoice_customers
  for each row
  execute function public.set_updated_at();

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null,
  customer_id uuid,
  customer_name text not null,
  customer_email text,
  customer_address text,
  customer_street text,
  customer_house_number text,
  customer_address_addition text,
  customer_postal_code text,
  customer_city text,
  customer_country text not null default 'Österreich',
  issue_date date not null default current_date,
  due_date date,
  total_amount numeric(12,2) not null default 0,
  status text not null default 'offen',
  is_test boolean not null default false,
  invoice_type text not null default 'rechnung',
  original_invoice_id uuid,
  cancellation_reason text,
  notes text,
  created_by uuid,
  member_id uuid,
  membership_fee_id uuid,
  paid_at date,
  cancelled_at timestamptz,
  pdf_url text,
  pdf_archived_at timestamptz,
  emailed_at timestamptz,
  last_reminder_at timestamptz,
  reminder_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoices_invoice_number_idx on public.invoices (invoice_number);
create index if not exists invoices_issue_date_idx on public.invoices (issue_date desc);
create index if not exists invoices_status_idx on public.invoices (status);
create index if not exists invoices_member_id_idx on public.invoices (member_id);
create index if not exists invoices_customer_id_idx on public.invoices (customer_id);

drop trigger if exists set_invoices_updated_at on public.invoices;
create trigger set_invoices_updated_at
  before update on public.invoices
  for each row
  execute function public.set_updated_at();

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  total_price numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoice_items_invoice_id_idx on public.invoice_items (invoice_id);

drop trigger if exists set_invoice_items_updated_at on public.invoice_items;
create trigger set_invoice_items_updated_at
  before update on public.invoice_items
  for each row
  execute function public.set_updated_at();

create table if not exists public.cash_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default current_date,
  entry_year integer not null default extract(year from current_date)::integer,
  receipt_number text,
  is_cancelled boolean not null default false,
  cancelled_at timestamptz,
  cancellation_reason text,
  type text not null default 'einnahme',
  category text not null default 'sonstiges',
  amount numeric(12,2) not null default 0,
  description text,
  payment_method text not null default 'bar',
  is_opening boolean not null default false,
  receipt_url text,
  event_id uuid,
  invoice_id uuid,
  membership_fee_id uuid,
  member_id uuid,
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cash_entries_entry_date_idx on public.cash_entries (entry_date desc);
create index if not exists cash_entries_entry_year_idx on public.cash_entries (entry_year);
create index if not exists cash_entries_event_id_idx on public.cash_entries (event_id);
create index if not exists cash_entries_invoice_id_idx on public.cash_entries (invoice_id);
create index if not exists cash_entries_member_id_idx on public.cash_entries (member_id);
create index if not exists cash_entries_membership_fee_id_idx on public.cash_entries (membership_fee_id);
create index if not exists cash_entries_receipt_number_idx on public.cash_entries (receipt_number);

drop trigger if exists set_cash_entries_updated_at on public.cash_entries;
create trigger set_cash_entries_updated_at
  before update on public.cash_entries
  for each row
  execute function public.set_updated_at();

create table if not exists public.cash_month_closings (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  month integer not null,
  closed_at timestamptz not null default now(),
  closed_by uuid,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists cash_month_closings_year_month_uidx
  on public.cash_month_closings (year, month);

drop trigger if exists set_cash_month_closings_updated_at on public.cash_month_closings;
create trigger set_cash_month_closings_updated_at
  before update on public.cash_month_closings
  for each row
  execute function public.set_updated_at();

create table if not exists public.member_change_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null,
  requested_by uuid,
  requested_data jsonb not null default '{}'::jsonb,
  status text not null default 'offen',
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists member_change_requests_member_id_idx on public.member_change_requests (member_id);
create index if not exists member_change_requests_status_idx on public.member_change_requests (status);
create index if not exists member_change_requests_created_at_idx on public.member_change_requests (created_at desc);

drop trigger if exists set_member_change_requests_updated_at on public.member_change_requests;
create trigger set_member_change_requests_updated_at
  before update on public.member_change_requests
  for each row
  execute function public.set_updated_at();

create table if not exists public.event_checkins (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null,
  event_name text not null,
  checkin_date date not null,
  checkin_time timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_checkins_member_id_idx on public.event_checkins (member_id);
create index if not exists event_checkins_event_name_idx on public.event_checkins (event_name);
create index if not exists event_checkins_checkin_date_idx on public.event_checkins (checkin_date desc);
create index if not exists event_checkins_checkin_time_idx on public.event_checkins (checkin_time desc);

drop trigger if exists set_event_checkins_updated_at on public.event_checkins;
create trigger set_event_checkins_updated_at
  before update on public.event_checkins
  for each row
  execute function public.set_updated_at();

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  table_name text not null,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  user_id uuid,
  user_email text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_table_name_idx on public.audit_logs (table_name);
create index if not exists audit_logs_record_id_idx on public.audit_logs (record_id);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  inventory_number text,
  name text not null,
  category text,
  responsible text,
  location text,
  purchase_date date,
  condition text,
  status text not null default 'aktiv',
  last_check_date date,
  check_status text,
  serial_number text,
  value numeric(12,2),
  label_line_1 text not null default 'STYRIAN BASTARDS',
  label_line_2 text not null default 'VEREINSEIGENTUM',
  label_line_3 text,
  label_line_4 text,
  qr_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inventory_items_inventory_number_idx on public.inventory_items (inventory_number);
create index if not exists inventory_items_status_idx on public.inventory_items (status);
create index if not exists inventory_items_category_idx on public.inventory_items (category);
create index if not exists inventory_items_location_idx on public.inventory_items (location);

drop trigger if exists set_inventory_items_updated_at on public.inventory_items;
create trigger set_inventory_items_updated_at
  before update on public.inventory_items
  for each row
  execute function public.set_updated_at();

grant select, insert, update, delete on table public.members to authenticated;
grant select, insert, update, delete on table public.events to authenticated;
grant select, insert, update, delete on table public.documents to authenticated;
grant select, insert, update, delete on table public.membership_fees to authenticated;
grant select, insert, update, delete on table public.invoice_customers to authenticated;
grant select, insert, update, delete on table public.invoices to authenticated;
grant select, insert, update, delete on table public.invoice_items to authenticated;
grant select, insert, update, delete on table public.cash_entries to authenticated;
grant select, insert, update, delete on table public.cash_month_closings to authenticated;
grant select, insert, update, delete on table public.member_change_requests to authenticated;
grant select, insert, update, delete on table public.event_checkins to authenticated;
grant select, insert, update, delete on table public.audit_logs to authenticated;
grant select, insert, update, delete on table public.inventory_items to authenticated;

