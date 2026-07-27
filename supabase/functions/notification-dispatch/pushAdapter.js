export const MAX_PUSH_PROVIDER_RESPONSE_LENGTH = 180
export const DEFAULT_PUSH_TITLE = 'Styrian Bastards Vereinsmanager'
const ROOT_PATH = '/'
export const DEFAULT_PUSH_ICON = `${ROOT_PATH}favicon.svg`
export const DEFAULT_PUSH_BADGE = `${ROOT_PATH}favicon.svg`
export const DEFAULT_PUSH_URL = '/notifications'

const SAFE_PATH_PATTERN = /^\/[A-Za-z0-9/_?=&.#%:-]*$/

export function shouldDeliverPush({ recipient, preference, subscriptions = [] }) {
  if (!recipient.auth_user_id) {
    return { deliver: false, status: 'skipped', errorCode: 'no_app_user' }
  }

  if (recipient.status && recipient.status !== 'aktiv') {
    return { deliver: false, status: 'skipped', errorCode: 'inactive_recipient' }
  }

  if (preference?.enabled !== true && preference?.required !== true) {
    return { deliver: false, status: 'skipped', errorCode: 'push_preference_disabled' }
  }

  if (subscriptions.length === 0) {
    return { deliver: false, status: 'skipped', errorCode: 'no_push_subscription' }
  }

  return { deliver: true, status: 'sent', errorCode: null }
}

export function buildPushPayload({ payload, appPublicUrl, notificationId = null }) {
  const url = resolveSafePushUrl(payload.url, appPublicUrl)
  const data = {
    ...(isPlainObject(payload.metadata) ? payload.metadata : {}),
    ...(isPlainObject(payload.data) ? payload.data : {}),
  }

  return {
    title: normalizeText(payload.title) || DEFAULT_PUSH_TITLE,
    body: normalizeText(payload.message),
    icon: DEFAULT_PUSH_ICON,
    badge: DEFAULT_PUSH_BADGE,
    url,
    notification_id: notificationId,
    type: normalizeText(payload.type),
    category: normalizeText(payload.category || 'system'),
    priority: normalizeText(payload.priority || 'normal'),
    tag: notificationId ? `notification:${notificationId}` : `notification:${normalizeText(payload.type) || 'message'}`,
    requireInteraction: ['high', 'critical'].includes(payload.priority),
    data: {
      ...data,
      url,
      notification_id: notificationId,
      type: normalizeText(payload.type),
      category: normalizeText(payload.category || 'system'),
    },
  }
}

export function resolveSafePushUrl(value, appPublicUrl) {
  const path = normalizeText(value) || DEFAULT_PUSH_URL
  const lower = path.toLowerCase()

  if (
    SAFE_PATH_PATTERN.test(path)
    && !lower.startsWith('//')
    && !lower.includes('javascript:')
    && !lower.includes('data:')
  ) {
    return path
  }

  if (appPublicUrl) {
    try {
      const appUrl = new URL(appPublicUrl)
      const targetUrl = new URL(path)
      if (
        ['http:', 'https:'].includes(targetUrl.protocol)
        && targetUrl.origin === appUrl.origin
      ) {
        return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}` || DEFAULT_PUSH_URL
      }
    } catch {
      return DEFAULT_PUSH_URL
    }
  }

  return DEFAULT_PUSH_URL
}

export function createVapidKeyJwk({ publicKey, privateKey }) {
  const publicBytes = base64UrlToBytes(publicKey)
  const privateBytes = base64UrlToBytes(privateKey)

  if (publicBytes.length !== 65 || publicBytes[0] !== 4) {
    throw new Error('vapid_public_key_invalid')
  }

  if (privateBytes.length !== 32) {
    throw new Error('vapid_private_key_invalid')
  }

  const x = bytesToBase64Url(publicBytes.slice(1, 33))
  const y = bytesToBase64Url(publicBytes.slice(33, 65))
  const d = bytesToBase64Url(privateBytes)

  return {
    publicKey: {
      kty: 'EC',
      crv: 'P-256',
      x,
      y,
      ext: true,
    },
    privateKey: {
      kty: 'EC',
      crv: 'P-256',
      x,
      y,
      d,
      ext: true,
    },
  }
}

export async function sendWebPushNotification({
  webpush,
  subscription,
  payload,
  vapidPublicKey,
  vapidPrivateKey,
  vapidSubject,
}) {
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return {
      ok: false,
      status: null,
      errorCode: 'push_configuration_missing',
      errorMessage: 'Push-Konfiguration fehlt.',
      globalConfigurationError: true,
    }
  }

  try {
    const vapidKeys = await webpush.importVapidKeys(createVapidKeyJwk({
      publicKey: vapidPublicKey,
      privateKey: vapidPrivateKey,
    }))
    const appServer = await webpush.ApplicationServer.new({
      contactInformation: vapidSubject,
      vapidKeys,
    })
    const subscriber = appServer.subscribe({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    })

    await subscriber.pushTextMessage(JSON.stringify(payload), {
      ttl: 3600,
      urgency: mapPushUrgency(payload.priority),
      topic: String(payload.tag || '').slice(0, 32) || undefined,
    })

    return {
      ok: true,
      status: 201,
      providerResponse: { status: 'accepted' },
    }
  } catch (error) {
    return normalizePushSendError(error)
  }
}

export async function normalizePushSendError(error) {
  const response = error?.response || null
  const status = Number(response?.status || 0) || null
  const providerText = await safeReadResponseText(response)
  const message = String(error?.message || '')

  if (message.startsWith('vapid_')) {
    return {
      ok: false,
      status: null,
      errorCode: 'push_configuration_invalid',
      errorMessage: 'Push-Konfiguration ist ungueltig.',
      deactivateSubscription: false,
      globalConfigurationError: true,
      providerResponse: sanitizeProviderResponse(null, null),
    }
  }

  if (status === 404 || status === 410) {
    return {
      ok: false,
      status,
      errorCode: 'push_subscription_expired',
      errorMessage: 'Push-Subscription ist nicht mehr gueltig.',
      deactivateSubscription: true,
      providerResponse: sanitizeProviderResponse(status, providerText),
    }
  }

  if (status === 429) {
    return {
      ok: false,
      status,
      errorCode: 'push_rate_limited',
      errorMessage: 'Push-Dienst hat den Versand temporaer limitiert.',
      deactivateSubscription: false,
      providerResponse: sanitizeProviderResponse(status, providerText, response?.headers?.get?.('retry-after')),
    }
  }

  if (status >= 500) {
    return {
      ok: false,
      status,
      errorCode: 'push_provider_unavailable',
      errorMessage: 'Push-Dienst ist temporaer nicht verfuegbar.',
      deactivateSubscription: false,
      providerResponse: sanitizeProviderResponse(status, providerText),
    }
  }

  if (status === 400 || status === 401 || status === 403) {
    return {
      ok: false,
      status,
      errorCode: 'push_provider_rejected',
      errorMessage: 'Push-Dienst hat den Versand abgelehnt.',
      deactivateSubscription: false,
      providerResponse: sanitizeProviderResponse(status, providerText),
    }
  }

  return {
    ok: false,
    status,
    errorCode: 'push_send_failed',
    errorMessage: 'Push konnte nicht gesendet werden.',
    deactivateSubscription: false,
    providerResponse: sanitizeProviderResponse(status, error?.message),
  }
}

export function sanitizeProviderResponse(status, text, retryAfter = null) {
  return {
    http_status: status || null,
    body: sanitizeProviderText(text),
    retry_after: retryAfter || null,
  }
}

export function sanitizeProviderText(value) {
  if (!value) return null
  return String(value)
    .replace(/https?:\/\/[^\s"']+/g, '[url]')
    .slice(0, MAX_PUSH_PROVIDER_RESPONSE_LENGTH)
}

export function mapPushUrgency(priority) {
  if (priority === 'critical' || priority === 'high') return 'high'
  if (priority === 'low') return 'low'
  return 'normal'
}

function base64UrlToBytes(value) {
  const normalized = normalizeText(value)
  const padding = '='.repeat((4 - normalized.length % 4) % 4)
  const base64 = `${normalized}${padding}`.replaceAll('-', '+').replaceAll('_', '/')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function bytesToBase64Url(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

async function safeReadResponseText(response) {
  if (!response?.text) return null

  try {
    return await response.clone().text()
  } catch {
    return null
  }
}

function normalizeText(value) {
  return String(value || '').trim()
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
