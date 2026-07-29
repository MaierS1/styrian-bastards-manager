begin;

drop policy if exists "audit_logs_insert" on public.audit_logs;
drop policy if exists "audit_logs_select" on public.audit_logs;

drop policy if exists "cash_month_closings_delete" on public.cash_month_closings;
drop policy if exists "cash_month_closings_insert" on public.cash_month_closings;
drop policy if exists "cash_month_closings_select" on public.cash_month_closings;

drop policy if exists "documents_delete" on public.documents;
drop policy if exists "documents_insert" on public.documents;
drop policy if exists "documents_select" on public.documents;
drop policy if exists "documents_update" on public.documents;

drop policy if exists "event_checkins_insert" on public.event_checkins;
drop policy if exists "event_checkins_select" on public.event_checkins;

drop policy if exists "inventory_items_delete" on public.inventory_items;
drop policy if exists "inventory_items_insert" on public.inventory_items;
drop policy if exists "inventory_items_select" on public.inventory_items;
drop policy if exists "inventory_items_update" on public.inventory_items;

drop policy if exists "invoice_customers_delete" on public.invoice_customers;
drop policy if exists "invoice_customers_insert" on public.invoice_customers;
drop policy if exists "invoice_customers_select" on public.invoice_customers;
drop policy if exists "invoice_customers_update" on public.invoice_customers;

drop policy if exists "invoice_items_insert" on public.invoice_items;
drop policy if exists "invoice_items_select" on public.invoice_items;
drop policy if exists "invoice_items_update" on public.invoice_items;

drop policy if exists "invoices_delete" on public.invoices;
drop policy if exists "invoices_insert" on public.invoices;
drop policy if exists "invoices_select" on public.invoices;
drop policy if exists "invoices_update" on public.invoices;

drop policy if exists "member_change_requests_delete" on public.member_change_requests;
drop policy if exists "member_change_requests_insert" on public.member_change_requests;
drop policy if exists "member_change_requests_select" on public.member_change_requests;
drop policy if exists "member_change_requests_update" on public.member_change_requests;

drop policy if exists "membership_fees_delete" on public.membership_fees;

drop policy if exists "documents_storage_delete" on storage.objects;
drop policy if exists "documents_storage_insert" on storage.objects;
drop policy if exists "documents_storage_select" on storage.objects;
drop policy if exists "documents_storage_update" on storage.objects;

commit;
