begin;

-- Inventory is internal club data. No anonymous table access is required.
alter table public.inventory_items enable row level security;

drop policy if exists "inventory users can read inventory items" on public.inventory_items;
drop policy if exists "inventory creators can create inventory items" on public.inventory_items;
drop policy if exists "inventory editors can update inventory items" on public.inventory_items;
drop policy if exists "inventory deleters can delete inventory items" on public.inventory_items;

revoke all on table public.inventory_items from anon;
revoke all on table public.inventory_items from authenticated;

grant select, insert, update, delete on table public.inventory_items to authenticated;

create policy "inventory users can read inventory items"
on public.inventory_items
for select
to authenticated
using (
  public.has_app_permission('inventar', 'view')
);

create policy "inventory creators can create inventory items"
on public.inventory_items
for insert
to authenticated
with check (
  public.has_app_permission('inventar', 'create')
);

create policy "inventory editors can update inventory items"
on public.inventory_items
for update
to authenticated
using (
  public.has_app_permission('inventar', 'edit')
)
with check (
  public.has_app_permission('inventar', 'edit')
);

create policy "inventory deleters can delete inventory items"
on public.inventory_items
for delete
to authenticated
using (
  public.has_app_permission('inventar', 'delete')
);

commit;
