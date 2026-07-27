export const PUSH_SUBSCRIPTION_SELECT = `
  id,
  auth_user_id,
  member_id,
  endpoint,
  endpoint_hash,
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
  failure_count,
  created_at,
  updated_at
`

function createSafeError(message, status = null) {
  return { message, status }
}

function normalizeEndpoint(value) {
  return String(value || '').trim()
}

function sanitizeDeviceLabel(value) {
  const label = String(value || '').trim()
  if (!label) return null
  return label.slice(0, 80)
}

async function getAuthenticatedUserId(client) {
  const response = await client.auth?.getUser?.()
  const user = response?.data?.user
  if (response?.error || !user?.id) {
    return { authUserId: null, error: createSafeError('Nicht angemeldet.', 401) }
  }

  return { authUserId: user.id, error: null }
}

function sanitizePushSubscription(payload, authUserId) {
  return {
    auth_user_id: authUserId,
    member_id: payload.member_id || null,
    endpoint: normalizeEndpoint(payload.endpoint),
    p256dh: String(payload.p256dh || '').trim(),
    auth: String(payload.auth || '').trim(),
    content_encoding: payload.content_encoding || 'aes128gcm',
    user_agent: payload.user_agent || null,
    platform: payload.platform || null,
    device_label: sanitizeDeviceLabel(payload.device_label),
    permission: payload.permission || 'granted',
    is_active: payload.is_active !== false,
    opted_out_at: payload.opted_out_at || null,
    last_seen_at: payload.last_seen_at || new Date().toISOString(),
    last_error: payload.last_error || null,
    last_error_at: payload.last_error_at || null,
  }
}

export function createPushSubscriptionRepository(client, { now = () => new Date().toISOString() } = {}) {
  async function getOwnSubscriptions({ authUserId, memberId } = {}) {
    let query = client
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
      const authResult = await getAuthenticatedUserId(client)
      if (authResult.error) return { data: [], error: authResult.error }
      query = query.eq('auth_user_id', authResult.authUserId)
    }

    return query
  }

  async function findByEndpoint({ endpoint, authUserId, memberId } = {}) {
    const normalizedEndpoint = normalizeEndpoint(endpoint)
    if (!normalizedEndpoint) return { data: null, error: createSafeError('endpoint ist erforderlich.', 400) }

    let query = client
      .from('push_subscriptions')
      .select(PUSH_SUBSCRIPTION_SELECT)
      .eq('endpoint', normalizedEndpoint)
      .limit(1)

    if (authUserId && memberId) {
      query = query.or(`auth_user_id.eq.${authUserId},member_id.eq.${memberId}`)
    } else if (authUserId) {
      query = query.eq('auth_user_id', authUserId)
    } else if (memberId) {
      query = query.eq('member_id', memberId)
    } else {
      const authResult = await getAuthenticatedUserId(client)
      if (authResult.error) return { data: null, error: authResult.error }
      query = query.eq('auth_user_id', authResult.authUserId)
    }

    return query.maybeSingle()
  }

  async function upsertOwnSubscription(payload) {
    const authResult = await getAuthenticatedUserId(client)
    if (authResult.error) return { data: null, error: authResult.error }
    if (payload.auth_user_id && payload.auth_user_id !== authResult.authUserId) {
      return { data: null, error: createSafeError('auth_user_id darf nicht ueberschrieben werden.', 403) }
    }

    const sanitizedPayload = sanitizePushSubscription(payload, authResult.authUserId)
    if (!sanitizedPayload.endpoint || !sanitizedPayload.p256dh || !sanitizedPayload.auth) {
      return { data: null, error: createSafeError('Push-Subscription ist unvollstaendig.', 400) }
    }

    return client
      .from('push_subscriptions')
      .upsert(sanitizedPayload, { onConflict: 'endpoint' })
      .select(PUSH_SUBSCRIPTION_SELECT)
      .single()
  }

  async function updateDeviceLabel({ id, deviceLabel }) {
    if (!id) return { data: null, error: createSafeError('id ist erforderlich.', 400) }

    return client
      .from('push_subscriptions')
      .update({
        device_label: sanitizeDeviceLabel(deviceLabel),
        last_seen_at: now(),
      })
      .eq('id', id)
      .select(PUSH_SUBSCRIPTION_SELECT)
      .maybeSingle()
  }

  async function deactivateSubscription({ id, endpoint } = {}) {
    const payload = {
      is_active: false,
      permission: 'default',
      opted_out_at: now(),
      last_seen_at: now(),
    }

    let query = client
      .from('push_subscriptions')
      .update(payload)

    if (id) {
      query = query.eq('id', id)
    } else if (endpoint) {
      query = query.eq('endpoint', normalizeEndpoint(endpoint))
    } else {
      return { data: null, error: createSafeError('id oder endpoint ist erforderlich.', 400) }
    }

    return query
      .select(PUSH_SUBSCRIPTION_SELECT)
      .maybeSingle()
  }

  async function markSeen({ id, endpoint } = {}) {
    const payload = {
      last_seen_at: now(),
    }

    let query = client
      .from('push_subscriptions')
      .update(payload)

    if (id) {
      query = query.eq('id', id)
    } else if (endpoint) {
      query = query.eq('endpoint', normalizeEndpoint(endpoint))
    } else {
      return { data: null, error: createSafeError('id oder endpoint ist erforderlich.', 400) }
    }

    return query
      .select(PUSH_SUBSCRIPTION_SELECT)
      .maybeSingle()
  }

  async function reconcileOwnSubscription({ browserSubscription, normalizedSubscription, memberId } = {}) {
    if (!browserSubscription && !normalizedSubscription) return getOwnSubscriptions({ memberId })

    const subscriptionPayload = normalizedSubscription || browserSubscription
    return upsertOwnSubscription({
      ...subscriptionPayload,
      member_id: memberId || subscriptionPayload.member_id || null,
      is_active: true,
      permission: 'granted',
      last_seen_at: now(),
    })
  }

  return {
    getOwnSubscriptions,
    fetchOwnPushSubscriptions: getOwnSubscriptions,
    findByEndpoint,
    upsertOwnSubscription,
    savePushSubscription: upsertOwnSubscription,
    updateDeviceLabel,
    deactivateSubscription,
    deactivatePushSubscription: deactivateSubscription,
    markSeen,
    markPushSubscriptionSeen: markSeen,
    reconcileOwnSubscription,
  }
}
