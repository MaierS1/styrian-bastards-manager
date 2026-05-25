create table if not exists public.media_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text,
  category text not null,
  status text not null default 'draft',
  source_name text,
  author_name text,
  summary text,
  content text,
  external_url text,
  audio_url text,
  image_path text,
  image_alt text,
  publication_date date not null default current_date,
  published_at timestamptz,
  is_public boolean not null default false,
  is_featured boolean not null default false,
  public_sort_order integer not null default 0,
  related_event_id uuid references public.events(id) on delete set null,
  related_sponsor_id uuid references public.sponsors(id) on delete set null,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint media_items_title_not_blank check (length(trim(title)) > 0),
  constraint media_items_slug_not_blank check (slug is null or length(trim(slug)) > 0),
  constraint media_items_slug_format_check check (
    slug is null or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint media_items_category_check check (
    category in (
      'presseartikel',
      'podcast',
      'radiosendung',
      'interview',
      'eventbericht',
      'vereinsnews',
      'sponsor-news',
      'sonstiges'
    )
  ),
  constraint media_items_status_check check (
    status in ('draft', 'published', 'archived')
  ),
  constraint media_items_source_name_not_blank check (
    source_name is null or length(trim(source_name)) > 0
  ),
  constraint media_items_author_name_not_blank check (
    author_name is null or length(trim(author_name)) > 0
  ),
  constraint media_items_summary_not_blank check (
    summary is null or length(trim(summary)) > 0
  ),
  constraint media_items_content_not_blank check (
    content is null or length(trim(content)) > 0
  ),
  constraint media_items_external_url_not_blank check (
    external_url is null or length(trim(external_url)) > 0
  ),
  constraint media_items_audio_url_not_blank check (
    audio_url is null or length(trim(audio_url)) > 0
  ),
  constraint media_items_image_path_not_blank check (
    image_path is null or length(trim(image_path)) > 0
  ),
  constraint media_items_image_alt_not_blank check (
    image_alt is null or length(trim(image_alt)) > 0
  ),
  constraint media_items_public_sort_order_check check (public_sort_order >= 0)
);

create unique index if not exists media_items_slug_unique_idx
  on public.media_items (lower(trim(slug)))
  where slug is not null;

create index if not exists media_items_status_category_date_idx
  on public.media_items (status, category, publication_date desc);

create index if not exists media_items_public_listing_idx
  on public.media_items (
    is_public,
    status,
    is_featured,
    publication_date desc,
    public_sort_order,
    lower(title)
  )
  where is_public = true;

create index if not exists media_items_related_event_id_idx
  on public.media_items (related_event_id)
  where related_event_id is not null;

create index if not exists media_items_related_sponsor_id_idx
  on public.media_items (related_sponsor_id)
  where related_sponsor_id is not null;

drop trigger if exists set_media_items_updated_at on public.media_items;

create trigger set_media_items_updated_at
  before update on public.media_items
  for each row
  execute function public.set_updated_at();

create or replace function public.can_manage_media()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where members.auth_user_id = auth.uid()
      and members.app_role in ('admin', 'members')
  );
$$;

revoke all on function public.can_manage_media() from public;
revoke all on function public.can_manage_media() from anon;
grant execute on function public.can_manage_media() to authenticated;

create or replace function public.get_public_media_items(
  p_category text default null,
  p_limit integer default 12,
  p_featured_only boolean default false
)
returns table (
  id uuid,
  title text,
  slug text,
  category text,
  source_name text,
  summary text,
  external_url text,
  audio_url text,
  image_path text,
  image_alt text,
  publication_date date,
  is_featured boolean,
  public_sort_order integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    media_items.id,
    media_items.title,
    media_items.slug,
    media_items.category,
    media_items.source_name,
    media_items.summary,
    media_items.external_url,
    media_items.audio_url,
    media_items.image_path,
    coalesce(nullif(trim(media_items.image_alt), ''), media_items.title) as image_alt,
    media_items.publication_date,
    media_items.is_featured,
    media_items.public_sort_order
  from public.media_items
  where media_items.is_public = true
    and media_items.status = 'published'
    and media_items.publication_date <= current_date
    and (
      media_items.published_at is null
      or media_items.published_at <= now()
    )
    and (
      p_category is null
      or media_items.category = p_category
    )
    and (
      p_featured_only = false
      or media_items.is_featured = true
    )
  order by
    media_items.is_featured desc,
    media_items.publication_date desc,
    media_items.public_sort_order asc,
    lower(media_items.title) asc
  limit least(greatest(coalesce(p_limit, 12), 1), 50);
$$;

revoke all on function public.get_public_media_items(text, integer, boolean) from public;
grant execute on function public.get_public_media_items(text, integer, boolean) to anon;
grant execute on function public.get_public_media_items(text, integer, boolean) to authenticated;

alter table public.media_items enable row level security;

revoke all on table public.media_items from public;
revoke all on table public.media_items from anon;
grant select, insert, update, delete on table public.media_items to authenticated;

drop policy if exists "authenticated users can read media items" on public.media_items;
create policy "authenticated users can read media items"
  on public.media_items
  for select
  to authenticated
  using (true);

drop policy if exists "authenticated users can insert media items" on public.media_items;
create policy "authenticated users can insert media items"
  on public.media_items
  for insert
  to authenticated
  with check (public.can_manage_media());

drop policy if exists "authenticated users can update media items" on public.media_items;
create policy "authenticated users can update media items"
  on public.media_items
  for update
  to authenticated
  using (public.can_manage_media())
  with check (public.can_manage_media());

drop policy if exists "authenticated users can delete media items" on public.media_items;
create policy "authenticated users can delete media items"
  on public.media_items
  for delete
  to authenticated
  using (public.can_manage_media());
