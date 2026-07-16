import { supabase } from '../../lib/supabase'

export const MEDIA_CHANNELS = ['homepage', 'facebook', 'instagram', 'members']

export async function fetchMediaItems() {
  return supabase
    .from('media_items')
    .select('*, media_post_channels(*)')
    .order('publication_date', { ascending: false })
    .order('created_at', { ascending: false })
}

export async function fetchPublicMediaItems({ limit = 50 } = {}) {
  return supabase.rpc('get_public_media_items', {
    p_category: null,
    p_limit: limit,
    p_featured_only: false,
  })
}

export async function saveMediaItemChannels(mediaItemId, channels = []) {
  const requestedChannels = new Map(
    channels
      .filter((item) => MEDIA_CHANNELS.includes(item?.channel))
      .map((item) => [item.channel, Boolean(item.enabled)]),
  )

  const rows = MEDIA_CHANNELS.map((channel) => ({
    media_item_id: mediaItemId,
    channel,
    enabled: requestedChannels.get(channel) || false,
    status: requestedChannels.get(channel) ? 'pending' : 'not_requested',
  }))

  return supabase
    .from('media_post_channels')
    .upsert(rows, { onConflict: 'media_item_id,channel' })
    .select()
}

export async function saveMediaItemRecord({
  mediaEditingId,
  payload,
  channels,
  mediaItems,
  createAuditLog,
  loadMediaItems,
  resetMediaForm,
  alertFn = alert,
}) {
  let savedMediaItemId = mediaEditingId

  if (mediaEditingId) {
    const oldMediaItem = mediaItems.find((item) => item.id === mediaEditingId)

    const { error } = await supabase
      .from('media_items')
      .update(payload)
      .eq('id', mediaEditingId)

    if (error) return { error }

    await createAuditLog('update', 'media_items', mediaEditingId, oldMediaItem, payload)
  } else {
    const { data, error } = await supabase
      .from('media_items')
      .insert(payload)
      .select()
      .single()

    if (error) return { error }

    savedMediaItemId = data?.id
    await createAuditLog('insert', 'media_items', savedMediaItemId, null, data)
  }

  if (savedMediaItemId && Array.isArray(channels)) {
    const { data: savedChannels, error: channelError } = await saveMediaItemChannels(savedMediaItemId, channels)

    if (channelError) return { error: channelError }

    await createAuditLog(
      'update',
      'media_post_channels',
      savedMediaItemId,
      null,
      savedChannels,
    )
  }

  alertFn(mediaEditingId ? 'Medienbeitrag wurde aktualisiert.' : 'Medienbeitrag wurde angelegt.')
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
