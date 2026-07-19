insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  15728640,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "cash managers can read receipt files" on storage.objects;
create policy "cash managers can read receipt files"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'receipts'
    and public.can_manage_cash()
  );

drop policy if exists "cash managers can upload receipt files" on storage.objects;
create policy "cash managers can upload receipt files"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'receipts'
    and name like 'cash/%'
    and public.can_manage_cash()
  );

drop policy if exists "cash managers can update receipt files" on storage.objects;
create policy "cash managers can update receipt files"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'receipts'
    and name like 'cash/%'
    and public.can_manage_cash()
  )
  with check (
    bucket_id = 'receipts'
    and name like 'cash/%'
    and public.can_manage_cash()
  );

drop policy if exists "cash managers can delete receipt files" on storage.objects;
create policy "cash managers can delete receipt files"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'receipts'
    and name like 'cash/%'
    and public.can_manage_cash()
  );
