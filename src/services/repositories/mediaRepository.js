import { supabase } from '../../lib/supabase'
import { notifyDomainEvent } from '../notifications/domainNotificationService'

export const MEDIA_CHANNELS = ['homepage', 'facebook', 'instagram', 'member_area']

export function createDefaultMediaChannels(item = {}) {
  return MEDIA_CHANNELS.map((channel) => {
    const enabled = channel === 'homepage'
      ? Boolean(item.is_public)
      : channel === 'member_area'
        ? Boolean(item.members_only || item.internal_only)
        : false
    const isLocalChannel = channel === 'homepage' || channel === 'member_area'
    const status = getDefaultChannelStatus({ enabled, isLocalChannel, item })

    return {
      channel,
      enabled,
      status,
      scheduled_at: isLocalChannel && enabled ? item.scheduled_at || null : null,
      published_at: isLocalChannel && enabled && item.status === 'published' ? item.published_at || null : null,
      external_id: null,
      external_url: null,
      error_code: null,
      error_message: null,
      attempt_count: 0,
      last_attempt_at: null,
    }
  })
}

function getDefaultChannelStatus({ enabled, isLocalChannel, item }) {
  if (!enabled) return 'not_requested'
  if (!isLocalChannel) return 'configured'
  if (item.status === 'archived') return 'archived'
  if (item.status === 'published') return 'published'
  if (item.scheduled_at) return 'scheduled'
  return 'not_requested'
}

export function normalizeMediaItem(item) {
  const loadedChannels = Array.isArray(item.media_post_channels)
    ? item.media_post_channels
    : Array.isArray(item.channels)
      ? item.channels
      : []
  const channelsByName = new Map(loadedChannels.map((channel) => [channel.channel, channel]))
  const channels = createDefaultMediaChannels(item).map((channel) => normalizeMediaChannel({
    ...channel,
    ...channelsByName.get(channel.channel),
  }))

  return {
    ...item,
    hashtags: Array.isArray(item.hashtags) ? item.hashtags : [],
    channels,
  }
}

function normalizeMediaChannel(channel) {
  const enabled = Boolean(channel.enabled)

  if (channel.channel === 'facebook' || channel.channel === 'instagram') {
    return {
      ...channel,
      enabled,
      status: enabled ? 'configured' : 'not_requested',
      scheduled_at: null,
      published_at: null,
    }
  }

  if (!enabled) {
    return {
      ...channel,
      enabled,
      status: 'not_requested',
      scheduled_at: null,
      published_at: null,
    }
  }

  return {
    ...channel,
    enabled,
  }
}

export async function fetchMediaItems() {
  const result = await supabase
    .from('media_items')
    .select('*, media_post_channels(*)')
    .order('publication_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (result.error) return result

  return {
    ...result,
    data: (result.data || []).map(normalizeMediaItem),
  }
}

export async function fetchPublicMediaItems({ limit = 50 } = {}) {
  return supabase.rpc('get_public_media_items', {
    p_category: null,
    p_limit: limit,
    p_featured_only: false,
  })
}

export async function saveMediaItemRecord({
  mediaEditingId,
  payload,
  channels = [],
  mediaItems,
  createAuditLog,
  loadMediaItems,
  resetMediaForm,
  notificationContext,
  alertFn = alert,
}) {
  let savedMediaId = mediaEditingId

  if (mediaEditingId) {
    const oldMediaItem = mediaItems.find((item) => item.id === mediaEditingId)

    const { error } = await supabase.rpc('save_media_item_with_channels', {
      p_media_item_id: mediaEditingId,
      p_media_item: payload,
      p_channels: channels,
    })

    if (error) return { error }

    await createAuditLog('update', 'media_items', mediaEditingId, oldMediaItem, { ...payload, channels })
    alertFn('Medienbeitrag wurde aktualisiert.')
  } else {
    const { data, error } = await supabase.rpc('save_media_item_with_channels', {
      p_media_item_id: null,
      p_media_item: payload,
      p_channels: channels,
    })

    if (error) return { error }
    savedMediaId = data?.id || null

    await createAuditLog('insert', 'media_items', data?.id, null, { ...data, channels })
    alertFn('Medienbeitrag wurde angelegt.')
  }

  if (payload.status === 'published' && savedMediaId) {
    const notificationType = payload.category === 'presseartikel'
      ? 'press_published'
      : payload.category === 'vereinsnews'
        ? 'news_published'
        : null

    if (notificationType) {
      await notifyDomainEvent({
        type: notificationType,
        targetId: savedMediaId,
        targetType: 'media_item',
        variables: {
          title: payload.title,
          category: payload.category,
          updated_at: payload.published_at || payload.publication_date,
        },
        metadata: {
          media_item_id: savedMediaId,
          media_category: payload.category,
        },
        ...notificationContext,
      })
    }
  }

  resetMediaForm()
  await loadMediaItems()
  return { ok: true }
}

export async function deleteMediaItemRecord({
  mediaItem,
  createAuditLog,
  loadMediaItems,
  alertFn = alert,
}) {
  const { error } = await supabase
    .from('media_items')
    .delete()
    .eq('id', mediaItem.id)

  if (error) return { error }

  await createAuditLog('delete', 'media_items', mediaItem.id, mediaItem, null)
  await loadMediaItems()
  alertFn('Medienbeitrag wurde gelöscht.')

  return { ok: true }
}
