alter table public.documents
  add column if not exists show_in_member_area boolean not null default false,
  add column if not exists members_only boolean not null default true,
  add column if not exists member_area_category text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists is_active boolean not null default true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_member_area_category_not_blank'
      and conrelid = 'public.documents'::regclass
  ) then
    alter table public.documents
      add constraint documents_member_area_category_not_blank
      check (member_area_category is null or length(trim(member_area_category)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_sort_order_check'
      and conrelid = 'public.documents'::regclass
  ) then
    alter table public.documents
      add constraint documents_sort_order_check
      check (sort_order >= 0);
  end if;
end $$;

create index if not exists documents_member_area_listing_idx
  on public.documents (
    show_in_member_area,
    members_only,
    is_active,
    sort_order,
    lower(title)
  )
  where show_in_member_area = true
    and members_only = true
    and is_active = true;

create or replace function public.get_member_documents()
returns table (
  title text,
  description text,
  file_url text,
  category text,
  sort_order integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    d.title,
    d.description,
    d.file_path as file_url,
    coalesce(nullif(trim(d.member_area_category), ''), d.category) as category,
    d.sort_order
  from public.documents d
  where auth.uid() is not null
    and exists (
      select 1
      from public.members m
      where m.auth_user_id = auth.uid()
    )
    and d.is_active = true
    and d.show_in_member_area = true
    and d.members_only = true
  order by d.sort_order asc, lower(d.title) asc;
$$;

revoke all on function public.get_member_documents() from public;
revoke all on function public.get_member_documents() from anon;
grant execute on function public.get_member_documents() to authenticated;

comment on table public.member_documents is
  'Deprecated compatibility table. Member-area documents are now served from public.documents via get_member_documents().';
