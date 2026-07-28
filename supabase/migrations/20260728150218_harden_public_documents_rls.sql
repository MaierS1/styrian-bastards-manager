begin;

-- Harden the shared documents registry. File access remains governed by
-- Storage policies; this migration only protects document metadata rows.
alter table public.documents enable row level security;

drop policy if exists "documents users can read documents" on public.documents;
drop policy if exists "documents creators can create documents" on public.documents;
drop policy if exists "documents editors can update documents" on public.documents;
drop policy if exists "documents deleters can delete documents" on public.documents;

revoke all on table public.documents from anon;
revoke all on table public.documents from authenticated;

grant select, insert, update, delete on table public.documents to authenticated;

create policy "documents users can read documents"
on public.documents
for select
to authenticated
using (
  public.has_app_permission('dokumente', 'view')
);

create policy "documents creators can create documents"
on public.documents
for insert
to authenticated
with check (
  public.has_app_permission('dokumente', 'create')
);

create policy "documents editors can update documents"
on public.documents
for update
to authenticated
using (
  public.has_app_permission('dokumente', 'edit')
)
with check (
  public.has_app_permission('dokumente', 'edit')
);

create policy "documents deleters can delete documents"
on public.documents
for delete
to authenticated
using (
  public.has_app_permission('dokumente', 'delete')
);

commit;
