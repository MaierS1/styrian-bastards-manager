alter table public.media_items
  add column if not exists social_text text,
  add column if not exists hashtags text[] not null default '{}',
  add column if not exists scheduled_at timestamptz,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null,
  add column if not exists published_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

update public.permissions
set label = 'Media Center'
where module = 'medien_presse';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'media_items_social_text_not_blank'
      and conrelid = 'public.media_items'::regclass
  ) then
    alter table public.media_items
      add constraint media_items_social_text_not_blank
      check (social_text is null or length(trim(social_text)) > 0);
  end if;
end $$;

create table if not exists public.media_post_channels (
  id uuid primary key default gen_random_uuid(),
  media_item_id uuid not null references public.media_items(id) on delete cascade,
  channel text not null,
  enabled boolean not null default false,
  status text not null default 'draft',
  scheduled_at timestamptz,
  published_at timestamptz,
  external_id text,
  external_url text,
  error_code text,
  error_message text,
  attempt_count integer not null default 0,
  last_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint media_post_channels_channel_check check (
    channel in ('homepage', 'facebook', 'instagram', 'member_area')
  ),
  constraint media_post_channels_status_check check (
    status in ('draft', 'scheduled', 'published', 'failed', 'archived')
  ),
  constraint media_post_channels_attempt_count_check check (attempt_count >= 0),
  constraint media_post_channels_external_id_not_blank check (
    external_id is null or length(trim(external_id)) > 0
  ),
  constraint media_post_channels_external_url_not_blank check (
    external_url is null or length(trim(external_url)) > 0
  ),
  constraint media_post_channels_error_code_not_blank check (
    error_code is null or length(trim(error_code)) > 0
  ),
  constraint media_post_channels_error_message_not_blank check (
    error_message is null or length(trim(error_message)) > 0
  ),
  unique (media_item_id, channel)
);

create index if not exists media_post_channels_item_idx
  on public.media_post_channels (media_item_id);

create index if not exists media_post_channels_publication_idx
  on public.media_post_channels (channel, enabled, status, scheduled_at, published_at)
  where enabled = true;

drop trigger if exists set_media_post_channels_updated_at on public.media_post_channels;
create trigger set_media_post_channels_updated_at
  before update on public.media_post_channels
  for each row
  execute function public.set_updated_at();

alter table public.media_post_channels enable row level security;

revoke all on table public.media_post_channels from public;
revoke all on table public.media_post_channels from anon;
grant select, insert, update, delete on table public.media_post_channels to authenticated;

drop policy if exists "authenticated users can read media post channels" on public.media_post_channels;
create policy "authenticated users can read media post channels"
  on public.media_post_channels
  for select
  to authenticated
  using (true);

drop policy if exists "media managers can insert media post channels" on public.media_post_channels;
create policy "media managers can insert media post channels"
  on public.media_post_channels
  for insert
  to authenticated
  with check (public.can_manage_media());

drop policy if exists "media managers can update media post channels" on public.media_post_channels;
create policy "media managers can update media post channels"
  on public.media_post_channels
  for update
  to authenticated
  using (public.can_manage_media())
  with check (public.can_manage_media());

drop policy if exists "media managers can delete media post channels" on public.media_post_channels;
create policy "media managers can delete media post channels"
  on public.media_post_channels
  for delete
  to authenticated
  using (public.can_manage_media());

insert into public.media_post_channels (
  media_item_id,
  channel,
  enabled,
  status,
  scheduled_at,
  published_at
)
select
  m.id,
  c.channel,
  case c.channel
    when 'homepage' then m.is_public
    when 'member_area' then coalesce(m.members_only, false) or coalesce(m.internal_only, false)
    else false
  end as enabled,
  case
    when c.channel = 'homepage' and m.is_public and m.status = 'published' then 'published'
    when c.channel = 'member_area'
      and (coalesce(m.members_only, false) or coalesce(m.internal_only, false))
      and m.status = 'published' then 'published'
    when m.status = 'archived' then 'archived'
    else 'draft'
  end as status,
  m.scheduled_at,
  case
    when m.status = 'published' then m.published_at
    else null
  end as published_at
from public.media_items m
cross join (
  values ('homepage'), ('facebook'), ('instagram'), ('member_area')
) as c(channel)
on conflict (media_item_id, channel) do nothing;

create or replace function public.save_media_item_with_channels(
  p_media_item_id uuid,
  p_media_item jsonb,
  p_channels jsonb default '[]'::jsonb
)
returns public.media_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.media_items;
  v_existing public.media_items;
  v_channel jsonb;
  v_hashtags text[];
begin
  if not public.can_manage_media() then
    raise exception 'Insufficient media permissions' using errcode = '42501';
  end if;

  select coalesce(array_agg(value), '{}')
  into v_hashtags
  from jsonb_array_elements_text(coalesce(p_media_item->'hashtags', '[]'::jsonb)) as value;

  if p_media_item_id is null then
    insert into public.media_items (
      title,
      slug,
      category,
      status,
      source_name,
      summary,
      content,
      content_html,
      external_url,
      audio_url,
      image_path,
      image_alt,
      publication_date,
      published_at,
      scheduled_at,
      is_public,
      members_only,
      internal_only,
      is_featured,
      public_sort_order,
      internal_notes,
      social_text,
      hashtags,
      created_by,
      updated_by,
      published_by
    ) values (
      p_media_item->>'title',
      nullif(p_media_item->>'slug', ''),
      coalesce(p_media_item->>'category', 'vereinsnews'),
      coalesce(p_media_item->>'status', 'draft'),
      nullif(p_media_item->>'source_name', ''),
      nullif(p_media_item->>'summary', ''),
      nullif(p_media_item->>'content', ''),
      nullif(p_media_item->>'content_html', ''),
      nullif(p_media_item->>'external_url', ''),
      nullif(p_media_item->>'audio_url', ''),
      nullif(p_media_item->>'image_path', ''),
      nullif(p_media_item->>'image_alt', ''),
      coalesce((p_media_item->>'publication_date')::date, current_date),
      nullif(p_media_item->>'published_at', '')::timestamptz,
      nullif(p_media_item->>'scheduled_at', '')::timestamptz,
      coalesce((p_media_item->>'is_public')::boolean, false),
      coalesce((p_media_item->>'members_only')::boolean, false),
      coalesce((p_media_item->>'internal_only')::boolean, false),
      coalesce((p_media_item->>'is_featured')::boolean, false),
      coalesce((p_media_item->>'public_sort_order')::integer, 0),
      nullif(p_media_item->>'internal_notes', ''),
      nullif(p_media_item->>'social_text', ''),
      v_hashtags,
      auth.uid(),
      auth.uid(),
      case when coalesce(p_media_item->>'status', 'draft') = 'published' then auth.uid() else null end
    )
    returning * into v_item;
  else
    select *
    into v_existing
    from public.media_items
    where id = p_media_item_id
    for update;

    if not found then
      raise exception 'Media item not found' using errcode = 'P0002';
    end if;

    update public.media_items
    set
      title = p_media_item->>'title',
      slug = nullif(p_media_item->>'slug', ''),
      category = coalesce(p_media_item->>'category', 'vereinsnews'),
      status = coalesce(p_media_item->>'status', 'draft'),
      source_name = nullif(p_media_item->>'source_name', ''),
      summary = nullif(p_media_item->>'summary', ''),
      content = nullif(p_media_item->>'content', ''),
      content_html = nullif(p_media_item->>'content_html', ''),
      external_url = nullif(p_media_item->>'external_url', ''),
      audio_url = nullif(p_media_item->>'audio_url', ''),
      image_path = nullif(p_media_item->>'image_path', ''),
      image_alt = nullif(p_media_item->>'image_alt', ''),
      publication_date = coalesce((p_media_item->>'publication_date')::date, current_date),
      published_at = nullif(p_media_item->>'published_at', '')::timestamptz,
      scheduled_at = nullif(p_media_item->>'scheduled_at', '')::timestamptz,
      is_public = coalesce((p_media_item->>'is_public')::boolean, false),
      members_only = coalesce((p_media_item->>'members_only')::boolean, false),
      internal_only = coalesce((p_media_item->>'internal_only')::boolean, false),
      is_featured = coalesce((p_media_item->>'is_featured')::boolean, false),
      public_sort_order = coalesce((p_media_item->>'public_sort_order')::integer, 0),
      internal_notes = nullif(p_media_item->>'internal_notes', ''),
      social_text = nullif(p_media_item->>'social_text', ''),
      hashtags = v_hashtags,
      updated_by = auth.uid(),
      published_by = case
        when coalesce(p_media_item->>'status', 'draft') = 'published'
          and (v_existing.published_by is null or v_existing.status <> 'published')
          then auth.uid()
        else v_existing.published_by
      end
    where id = p_media_item_id
    returning * into v_item;
  end if;

  for v_channel in
    select value
    from jsonb_array_elements(coalesce(p_channels, '[]'::jsonb)) as value
  loop
    insert into public.media_post_channels (
      media_item_id,
      channel,
      enabled,
      status,
      scheduled_at,
      published_at,
      external_id,
      external_url,
      error_code,
      error_message,
      attempt_count,
      last_attempt_at
    ) values (
      v_item.id,
      v_channel->>'channel',
      coalesce((v_channel->>'enabled')::boolean, false),
      coalesce(v_channel->>'status', 'draft'),
      nullif(v_channel->>'scheduled_at', '')::timestamptz,
      nullif(v_channel->>'published_at', '')::timestamptz,
      nullif(v_channel->>'external_id', ''),
      nullif(v_channel->>'external_url', ''),
      nullif(v_channel->>'error_code', ''),
      nullif(v_channel->>'error_message', ''),
      coalesce((v_channel->>'attempt_count')::integer, 0),
      nullif(v_channel->>'last_attempt_at', '')::timestamptz
    )
    on conflict (media_item_id, channel) do update
    set
      enabled = excluded.enabled,
      status = excluded.status,
      scheduled_at = excluded.scheduled_at,
      published_at = excluded.published_at,
      external_id = excluded.external_id,
      external_url = excluded.external_url,
      error_code = excluded.error_code,
      error_message = excluded.error_message,
      attempt_count = excluded.attempt_count,
      last_attempt_at = excluded.last_attempt_at;
  end loop;

  return v_item;
end;
$$;

revoke all on function public.save_media_item_with_channels(uuid, jsonb, jsonb) from public;
revoke all on function public.save_media_item_with_channels(uuid, jsonb, jsonb) from anon;
grant execute on function public.save_media_item_with_channels(uuid, jsonb, jsonb) to authenticated;
