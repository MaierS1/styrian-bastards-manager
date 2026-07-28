begin;

-- Protect invoices and invoice metadata. Invoice email dispatch uses
-- service_role intentionally and is not restricted by these grants.
alter table public.invoice_customers enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;

drop policy if exists "invoice users can read invoice customers" on public.invoice_customers;
drop policy if exists "invoice creators can create invoice customers" on public.invoice_customers;
drop policy if exists "invoice editors can update invoice customers" on public.invoice_customers;
drop policy if exists "invoice deleters can delete invoice customers" on public.invoice_customers;

drop policy if exists "invoice users can read invoices" on public.invoices;
drop policy if exists "invoice creators can create invoices" on public.invoices;
drop policy if exists "invoice editors can update invoices" on public.invoices;
drop policy if exists "invoice deleters can delete invoices" on public.invoices;

drop policy if exists "invoice users can read invoice items" on public.invoice_items;
drop policy if exists "invoice creators can create invoice items" on public.invoice_items;
drop policy if exists "invoice editors can update invoice items" on public.invoice_items;
drop policy if exists "invoice deleters can delete invoice items" on public.invoice_items;

revoke all on table public.invoice_customers from anon;
revoke all on table public.invoices from anon;
revoke all on table public.invoice_items from anon;

revoke all on table public.invoice_customers from authenticated;
revoke all on table public.invoices from authenticated;
revoke all on table public.invoice_items from authenticated;

grant select, insert, update, delete on table public.invoice_customers to authenticated;
grant select, insert, update, delete on table public.invoices to authenticated;
grant select, insert, update, delete on table public.invoice_items to authenticated;

create policy "invoice users can read invoice customers"
on public.invoice_customers
for select
to authenticated
using (
  public.has_app_permission('rechnungen', 'view')
);

create policy "invoice creators can create invoice customers"
on public.invoice_customers
for insert
to authenticated
with check (
  public.has_app_permission('rechnungen', 'create')
);

create policy "invoice editors can update invoice customers"
on public.invoice_customers
for update
to authenticated
using (
  public.has_app_permission('rechnungen', 'edit')
)
with check (
  public.has_app_permission('rechnungen', 'edit')
);

create policy "invoice deleters can delete invoice customers"
on public.invoice_customers
for delete
to authenticated
using (
  public.has_app_permission('rechnungen', 'delete')
);

create policy "invoice users can read invoices"
on public.invoices
for select
to authenticated
using (
  public.has_app_permission('rechnungen', 'view')
  or public.has_app_permission('kassa', 'view')
);

create policy "invoice creators can create invoices"
on public.invoices
for insert
to authenticated
with check (
  public.has_app_permission('rechnungen', 'create')
  or public.has_app_permission('kassa', 'create')
  or public.has_app_permission('kassa', 'edit')
);

create policy "invoice editors can update invoices"
on public.invoices
for update
to authenticated
using (
  public.has_app_permission('rechnungen', 'edit')
  or public.has_app_permission('kassa', 'edit')
)
with check (
  public.has_app_permission('rechnungen', 'edit')
  or public.has_app_permission('kassa', 'edit')
);

create policy "invoice deleters can delete invoices"
on public.invoices
for delete
to authenticated
using (
  public.has_app_permission('rechnungen', 'delete')
);

create policy "invoice users can read invoice items"
on public.invoice_items
for select
to authenticated
using (
  public.has_app_permission('rechnungen', 'view')
  or public.has_app_permission('kassa', 'view')
);

create policy "invoice creators can create invoice items"
on public.invoice_items
for insert
to authenticated
with check (
  public.has_app_permission('rechnungen', 'create')
  or public.has_app_permission('kassa', 'create')
  or public.has_app_permission('kassa', 'edit')
);

create policy "invoice editors can update invoice items"
on public.invoice_items
for update
to authenticated
using (
  public.has_app_permission('rechnungen', 'edit')
  or public.has_app_permission('kassa', 'edit')
)
with check (
  public.has_app_permission('rechnungen', 'edit')
  or public.has_app_permission('kassa', 'edit')
);

create policy "invoice deleters can delete invoice items"
on public.invoice_items
for delete
to authenticated
using (
  public.has_app_permission('rechnungen', 'delete')
);

commit;
