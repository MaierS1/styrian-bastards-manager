create or replace function public.normalize_media_post_channel_phase1()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.channel in ('facebook', 'instagram') then
    new.status := case when coalesce(new.enabled, false) then 'configured' else 'not_requested' end;
    new.scheduled_at := null;
    new.published_at := null;
    new.external_id := null;
    new.external_url := null;
    new.error_code := null;
    new.error_message := null;
    new.attempt_count := 0;
    new.last_attempt_at := null;
  elsif coalesce(new.enabled, false) = false then
    new.status := 'not_requested';
    new.scheduled_at := null;
    new.published_at := null;
    new.external_id := null;
    new.external_url := null;
    new.error_code := null;
    new.error_message := null;
    new.attempt_count := 0;
    new.last_attempt_at := null;
  elsif new.status = 'draft' then
    new.status := 'not_requested';
  end if;

  return new;
end;
$$;

drop trigger if exists normalize_media_post_channel_phase1 on public.media_post_channels;
create trigger normalize_media_post_channel_phase1
  before insert or update on public.media_post_channels
  for each row
  execute function public.normalize_media_post_channel_phase1();

alter table public.media_post_channels
  drop constraint if exists media_post_channels_phase1_no_social_publish_metadata_check;

update public.media_post_channels
set
  status = case
    when channel in ('facebook', 'instagram') and enabled = true then 'configured'
    else 'not_requested'
  end,
  scheduled_at = null,
  published_at = null,
  external_id = null,
  external_url = null,
  error_code = null,
  error_message = null,
  attempt_count = 0,
  last_attempt_at = null
where channel in ('facebook', 'instagram')
  or enabled = false;

alter table public.media_post_channels
  add constraint media_post_channels_phase1_no_social_publish_metadata_check check (
    (
      channel not in ('facebook', 'instagram')
      or (
        scheduled_at is null
        and published_at is null
        and external_id is null
        and external_url is null
        and error_code is null
        and error_message is null
        and attempt_count = 0
        and last_attempt_at is null
        and status in ('not_requested', 'configured')
      )
    )
    and (
      enabled = true
      or (
        status = 'not_requested'
        and scheduled_at is null
        and published_at is null
        and external_id is null
        and external_url is null
        and error_code is null
        and error_message is null
        and attempt_count = 0
        and last_attempt_at is null
      )
    )
  );

revoke all on function public.normalize_media_post_channel_phase1() from public;
revoke all on function public.normalize_media_post_channel_phase1() from anon;
grant execute on function public.normalize_media_post_channel_phase1() to authenticated;
