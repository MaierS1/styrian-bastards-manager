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

export async function fetchInAppNotifications({ limit = 20, includeArchived = false } = {}) {
  let query = supabase
    .from('in_app_notifications')
    .select(NOTIFICATION_SELECT)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!includeArchived) {
    query = query.is('archived_at', null)
  }

  return query
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
