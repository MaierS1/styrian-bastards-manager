drop function if exists public.get_public_media_items(text, integer, boolean);

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
  content text,
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
    media_items.content,
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
