import { supabase } from '../../lib/supabase'

export async function fetchMediaItems() {
  return supabase
    .from('media_items')
    .select('*')
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

export async function saveMediaItemRecord({
  mediaEditingId,
  payload,
  mediaItems,
  createAuditLog,
  loadMediaItems,
  resetMediaForm,
  alertFn = alert,
}) {
  if (mediaEditingId) {
    const oldMediaItem = mediaItems.find((item) => item.id === mediaEditingId)

    const { error } = await supabase
      .from('media_items')
      .update(payload)
      .eq('id', mediaEditingId)

    if (error) return { error }

    await createAuditLog('update', 'media_items', mediaEditingId, oldMediaItem, payload)
    alertFn('Medienbeitrag wurde aktualisiert.')
  } else {
    const { data, error } = await supabase
      .from('media_items')
      .insert(payload)
      .select()
      .single()

    if (error) return { error }

    await createAuditLog('insert', 'media_items', data?.id, null, data)
    alertFn('Medienbeitrag wurde angelegt.')
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
