create table if not exists public.member_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  file_url text not null,
  category text,
  is_active boolean not null default true,
  members_only boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint member_documents_title_not_blank check (length(trim(title)) > 0),
  constraint member_documents_file_url_not_blank check (length(trim(file_url)) > 0),
  constraint member_documents_description_not_blank check (description is null or length(trim(description)) > 0),
  constraint member_documents_category_not_blank check (category is null or length(trim(category)) > 0),
  constraint member_documents_sort_order_check check (sort_order >= 0)
);

create index if not exists member_documents_member_listing_idx
  on public.member_documents (is_active, members_only, sort_order, lower(title))
  where is_active = true and members_only = true;

create index if not exists member_documents_category_idx
  on public.member_documents (category)
  where category is not null;

drop trigger if exists set_member_documents_updated_at on public.member_documents;
create trigger set_member_documents_updated_at
  before update on public.member_documents
  for each row
  execute function public.set_updated_at();

alter table public.member_documents enable row level security;

revoke all on table public.member_documents from public;
revoke all on table public.member_documents from anon;
grant select, insert, update, delete on table public.member_documents to authenticated;

drop policy if exists "admins can read member documents" on public.member_documents;
create policy "admins can read member documents"
  on public.member_documents
  for select
  to authenticated
  using (public.is_admin_user());

drop policy if exists "admins can insert member documents" on public.member_documents;
create policy "admins can insert member documents"
  on public.member_documents
  for insert
  to authenticated
  with check (public.is_admin_user());

drop policy if exists "admins can update member documents" on public.member_documents;
create policy "admins can update member documents"
  on public.member_documents
  for update
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

drop policy if exists "admins can delete member documents" on public.member_documents;
create policy "admins can delete member documents"
  on public.member_documents
  for delete
  to authenticated
  using (public.is_admin_user());

alter table public.media_items
  add column if not exists members_only boolean not null default false,
  add column if not exists internal_only boolean not null default false;

create index if not exists media_items_member_area_listing_idx
  on public.media_items (members_only, internal_only, status, publication_date desc, public_sort_order, lower(title))
  where members_only = true or internal_only = true;

alter table public.events
  add column if not exists members_only boolean not null default false,
  add column if not exists internal_only boolean not null default false;

create index if not exists events_member_area_listing_idx
  on public.events (
    members_only,
    internal_only,
    status,
    starts_at,
    event_date,
    public_sort_order,
    lower(coalesce(public_title, title, name))
  )
  where members_only = true or internal_only = true;

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
    d.file_url,
    d.category,
    d.sort_order
  from public.member_documents d
  where auth.uid() is not null
    and exists (
      select 1
      from public.members m
      where m.auth_user_id = auth.uid()
    )
    and d.is_active = true
    and d.members_only = true
  order by d.sort_order asc, lower(d.title) asc;
$$;

revoke all on function public.get_member_documents() from public;
revoke all on function public.get_member_documents() from anon;
grant execute on function public.get_member_documents() to authenticated;

create or replace function public.get_member_news()
returns table (
  id uuid,
  title text,
  slug text,
  category text,
  summary text,
  content text,
  content_html text,
  external_url text,
  audio_url text,
  image_path text,
  image_alt text,
  publication_date date,
  published_at timestamptz,
  sort_order integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    n.id,
    n.title,
    n.slug,
    n.category,
    n.summary,
    n.content,
    n.content_html,
    n.external_url,
    n.audio_url,
    n.image_path,
    coalesce(nullif(trim(n.image_alt), ''), n.title) as image_alt,
    n.publication_date,
    n.published_at,
    n.public_sort_order as sort_order
  from public.media_items n
  where auth.uid() is not null
    and exists (
      select 1
      from public.members m
      where m.auth_user_id = auth.uid()
    )
    and (n.members_only = true or n.internal_only = true)
    and n.status = 'published'
    and n.publication_date <= current_date
    and (n.published_at is null or n.published_at <= now())
  order by n.publication_date desc, n.public_sort_order asc, lower(n.title) asc
  limit 50;
$$;

revoke all on function public.get_member_news() from public;
revoke all on function public.get_member_news() from anon;
grant execute on function public.get_member_news() to authenticated;

create or replace function public.get_member_events()
returns table (
  id uuid,
  title text,
  short_description text,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  event_date date,
  location text,
  meeting_point text,
  event_category text,
  public_image_path text,
  public_image_url text,
  event_image_url text,
  sort_order integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.id,
    coalesce(nullif(trim(e.public_title), ''), nullif(trim(e.title), ''), e.name) as title,
    e.short_description,
    coalesce(e.public_description, e.description, e.notes) as description,
    e.starts_at,
    e.ends_at,
    e.event_date,
    e.location,
    e.meeting_point,
    e.event_category,
    e.public_image_path,
    e.public_image_url,
    e.event_image_url,
    e.public_sort_order as sort_order
  from public.events e
  where auth.uid() is not null
    and exists (
      select 1
      from public.members m
      where m.auth_user_id = auth.uid()
    )
    and (e.members_only = true or e.internal_only = true)
    and e.status in ('geplant', 'laufend')
    and coalesce(e.starts_at::date, e.event_date) >= current_date
  order by coalesce(e.starts_at, e.event_date::timestamptz) asc,
    e.public_sort_order asc,
    lower(coalesce(e.public_title, e.title, e.name)) asc
  limit 50;
$$;

revoke all on function public.get_member_events() from public;
revoke all on function public.get_member_events() from anon;
grant execute on function public.get_member_events() to authenticated;
