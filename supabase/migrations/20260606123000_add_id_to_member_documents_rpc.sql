drop function if exists public.get_member_documents();

create function public.get_member_documents()
returns table (
  id uuid,
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
    d.id,
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
