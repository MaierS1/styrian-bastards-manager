import { supabase } from '../../lib/supabase'

const PUSH_SUBSCRIPTION_SELECT = `
  id,
  auth_user_id,
  member_id,
  endpoint,
  p256dh,
  auth,
  content_encoding,
  user_agent,
  platform,
  device_label,
  permission,
  is_active,
  opted_in_at,
  opted_out_at,
  last_seen_at,
  last_success_at,
  last_error_at,
  last_error,
  created_at,
  updated_at
`

function sanitizePushSubscription(payload) {
  return {
    auth_user_id: payload.auth_user_id,
    member_id: payload.member_id || null,
    endpoint: payload.endpoint,
    p256dh: payload.p256dh,
    auth: payload.auth,
    content_encoding: payload.content_encoding || 'aes128gcm',
    user_agent: payload.user_agent || null,
    platform: payload.platform || null,
    device_label: payload.device_label || null,
    permission: payload.permission || 'granted',
    is_active: payload.is_active !== false,
    opted_out_at: payload.opted_out_at || null,
    last_seen_at: payload.last_seen_at || new Date().toISOString(),
    last_error: payload.last_error || null,
    last_error_at: payload.last_error_at || null,
  }
}

export async function fetchOwnPushSubscriptions({ authUserId, memberId } = {}) {
  let query = supabase
    .from('push_subscriptions')
    .select(PUSH_SUBSCRIPTION_SELECT)
    .order('is_active', { ascending: false })
    .order('last_seen_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

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

export async function savePushSubscription(payload) {
  const sanitizedPayload = sanitizePushSubscription(payload)

  return supabase
    .from('push_subscriptions')
    .upsert(sanitizedPayload, { onConflict: 'endpoint' })
    .select(PUSH_SUBSCRIPTION_SELECT)
    .single()
}

export async function deactivatePushSubscription({ id, endpoint } = {}) {
  const payload = {
    is_active: false,
    permission: 'default',
    opted_out_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  }

  let query = supabase
    .from('push_subscriptions')
    .update(payload)

  if (id) {
    query = query.eq('id', id)
  } else if (endpoint) {
    query = query.eq('endpoint', endpoint)
  } else {
    return {
      data: null,
      error: new Error('id oder endpoint ist erforderlich.'),
    }
  }

  return query
    .select(PUSH_SUBSCRIPTION_SELECT)
    .maybeSingle()
}

export async function markPushSubscriptionSeen({ id, endpoint } = {}) {
  const payload = {
    last_seen_at: new Date().toISOString(),
  }

  let query = supabase
    .from('push_subscriptions')
    .update(payload)

  if (id) {
    query = query.eq('id', id)
  } else if (endpoint) {
    query = query.eq('endpoint', endpoint)
  } else {
    return {
      data: null,
      error: new Error('id oder endpoint ist erforderlich.'),
    }
  }

  return query
    .select(PUSH_SUBSCRIPTION_SELECT)
    .maybeSingle()
}
