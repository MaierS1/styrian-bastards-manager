import { supabase } from '../../lib/supabase'

const NOTIFICATION_SELECT = `
  id,
  job_id,
  auth_user_id,
  member_id,
  type,
  category,
  title,
  body,
  url,
  data,
  read_at,
  archived_at,
  deleted_at,
  created_at,
  updated_at
`

const NOTIFICATION_PREFERENCE_SELECT = `
  id,
  auth_user_id,
  member_id,
  notification_type,
  category,
  channel,
  enabled,
  required,
  opted_in_at,
  opted_out_at,
  created_at,
  updated_at
`

function sanitizeNotificationPreference(preference) {
  return {
    auth_user_id: preference.auth_user_id || null,
    member_id: preference.member_id || null,
    notification_type: preference.notification_type,
    category: preference.category,
    channel: preference.channel,
    enabled: Boolean(preference.enabled),
    required: Boolean(preference.required),
    opted_in_at: preference.opted_in_at || null,
    opted_out_at: preference.opted_out_at || null,
  }
}

export async function fetchInAppNotifications({
  limit = 20,
  cursor = null,
  unreadOnly = false,
  includeArchived = false,
} = {}) {
  let query = supabase
    .from('in_app_notifications')
    .select(NOTIFICATION_SELECT)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!includeArchived) {
    query = query.is('archived_at', null)
  }

  if (unreadOnly) {
    query = query.is('read_at', null)
  }

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  return query
}

export async function fetchNotificationPreferences({ authUserId, memberId } = {}) {
  let query = supabase
    .from('notification_preferences')
    .select(NOTIFICATION_PREFERENCE_SELECT)
    .order('category', { ascending: true })
    .order('notification_type', { ascending: true })
    .order('channel', { ascending: true })

  if (authUserId && memberId) {
    query = query.or(`auth_user_id.eq.${authUserId},member_id.eq.${memberId}`)
  } else if (authUserId) {
    query = query.eq('auth_user_id', authUserId)
  } else if (memberId) {
    query = query.eq('member_id', memberId)
  } else {
    return { data: [], error: null }
  }

  return query
}

export async function upsertNotificationPreference(preference) {
  const payload = sanitizeNotificationPreference(preference)

  if (preference.id) {
    return supabase
      .from('notification_preferences')
      .update(payload)
      .eq('id', preference.id)
      .select(NOTIFICATION_PREFERENCE_SELECT)
      .single()
  }

  let existingQuery = supabase
    .from('notification_preferences')
    .select('id')
    .eq('notification_type', payload.notification_type)
    .eq('channel', payload.channel)
    .limit(1)

  if (payload.member_id) {
    existingQuery = existingQuery.eq('member_id', payload.member_id)
  } else if (payload.auth_user_id) {
    existingQuery = existingQuery.eq('auth_user_id', payload.auth_user_id)
  }

  const existingResult = await existingQuery.maybeSingle()

  if (existingResult.error) return existingResult

  if (existingResult.data?.id) {
    return supabase
      .from('notification_preferences')
      .update(payload)
      .eq('id', existingResult.data.id)
      .select(NOTIFICATION_PREFERENCE_SELECT)
      .single()
  }

  return supabase
    .from('notification_preferences')
    .insert(payload)
    .select(NOTIFICATION_PREFERENCE_SELECT)
    .single()
}

export async function saveNotificationPreferences(preferences) {
  const savedPreferences = []

  for (const preference of preferences) {
    const result = await upsertNotificationPreference(preference)

    if (result.error) {
      return { data: savedPreferences, error: result.error }
    }

    if (result.data) savedPreferences.push(result.data)
  }

  return { data: savedPreferences, error: null }
}

export async function fetchUnreadNotificationCount() {
  return supabase
    .from('in_app_notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null)
    .is('archived_at', null)
    .is('deleted_at', null)
}

export async function markInAppNotificationRead(notificationId) {
  return supabase
    .from('in_app_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .select(NOTIFICATION_SELECT)
    .single()
}

export async function markInAppNotificationUnread(notificationId) {
  return supabase
    .from('in_app_notifications')
    .update({ read_at: null })
    .eq('id', notificationId)
    .select(NOTIFICATION_SELECT)
    .single()
}

export async function markAllInAppNotificationsRead() {
  return supabase
    .from('in_app_notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null)
    .is('archived_at', null)
    .is('deleted_at', null)
    .select(NOTIFICATION_SELECT)
}

export async function archiveInAppNotification(notificationId) {
  return supabase
    .from('in_app_notifications')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', notificationId)
    .select(NOTIFICATION_SELECT)
    .single()
}

export async function unarchiveInAppNotification(notificationId) {
  return supabase
    .from('in_app_notifications')
    .update({ archived_at: null })
    .eq('id', notificationId)
    .select(NOTIFICATION_SELECT)
    .single()
}

export async function softDeleteInAppNotification(notificationId) {
  return supabase
    .from('in_app_notifications')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', notificationId)
    .select(NOTIFICATION_SELECT)
    .single()
}

export function subscribeToInAppNotifications({ authUserId, memberId, onChange }) {
  if (!authUserId && !memberId) {
    return { unsubscribe: () => {} }
  }

  const channel = supabase.channel(`in_app_notifications:${authUserId || memberId}`)

  if (authUserId) {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'in_app_notifications',
        filter: `auth_user_id=eq.${authUserId}`,
      },
      onChange
    )
  }

  if (memberId) {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'in_app_notifications',
        filter: `member_id=eq.${memberId}`,
      },
      onChange
    )
  }

  channel.subscribe()

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel)
    },
  }
}
