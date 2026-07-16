-- Media Center Phase 1
-- Rueckwaertskompatible Erweiterung des bestehenden Medien-/Pressemoduls.

begin;

alter table public.media_items
  add column if not exists social_text text,
  add column if not exists hashtags text[] not null default '{}',
  add column if not exists scheduled_at timestamptz,
  add column if not exists created_by uuid,
  add column if not exists updated_by uuid,
  add column if not exists published_by uuid,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.media_post_channels (
  id uuid primary key default gen_random_uuid(),
  media_item_id uuid not null references public.media_items(id) on delete cascade,
  channel text not null check (channel in ('homepage', 'facebook', 'instagram', 'members')),
  enabled boolean not null default false,
  status text not null default 'not_requested'
    check (status in ('not_requested', 'pending', 'publishing', 'published', 'failed')),
  scheduled_at timestamptz,
  published_at timestamptz,
  external_id text,
  external_url text,
  error_code text,
  error_message text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_post_channels_media_item_channel_key unique (media_item_id, channel)
);

create index if not exists media_post_channels_media_item_id_idx
  on public.media_post_channels(media_item_id);

create index if not exists media_post_channels_status_idx
  on public.media_post_channels(status)
  where enabled = true;

create or replace function public.set_media_center_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_media_items_updated_at on public.media_items;
create trigger set_media_items_updated_at
before update on public.media_items
for each row execute function public.set_media_center_updated_at();

drop trigger if exists set_media_post_channels_updated_at on public.media_post_channels;
create trigger set_media_post_channels_updated_at
before update on public.media_post_channels
for each row execute function public.set_media_center_updated_at();

insert into public.media_post_channels (media_item_id, channel, enabled, status, published_at)
select
  id,
  'homepage',
  true,
  case when status = 'published' then 'published' else 'not_requested' end,
  case when status = 'published' then published_at else null end
from public.media_items
where coalesce(is_public, false) = true
on conflict (media_item_id, channel) do nothing;

insert into public.media_post_channels (media_item_id, channel, enabled, status, published_at)
select
  id,
  'members',
  true,
  case when status = 'published' then 'published' else 'not_requested' end,
  case when status = 'published' then published_at else null end
from public.media_items
where coalesce(members_only, false) = true
   or coalesce(internal_only, false) = true
on conflict (media_item_id, channel) do nothing;

alter table public.media_post_channels enable row level security;

drop policy if exists "Authenticated users can read media post channels" on public.media_post_channels;
create policy "Authenticated users can read media post channels"
on public.media_post_channels
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can insert media post channels" on public.media_post_channels;
create policy "Authenticated users can insert media post channels"
on public.media_post_channels
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users can update media post channels" on public.media_post_channels;
create policy "Authenticated users can update media post channels"
on public.media_post_channels
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can delete media post channels" on public.media_post_channels;
create policy "Authenticated users can delete media post channels"
on public.media_post_channels
for delete
to authenticated
using (true);

commit;
