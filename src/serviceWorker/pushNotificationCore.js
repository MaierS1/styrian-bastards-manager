export const DEFAULT_PUSH_TITLE = 'Styrian Bastards Vereinsmanager'
export const DEFAULT_PUSH_BODY = 'Neue Benachrichtigung'
export const DEFAULT_PUSH_URL = '/'
export const DEFAULT_PUSH_ICON = '/icons.svg'
export const DEFAULT_PUSH_BADGE = '/icons.svg'

const SAFE_PATH_PATTERN = /^\/[A-Za-z0-9/_?=&.#%:-]*$/

export function parsePushPayload(rawPayload) {
  const parsed = parseRawPayload(rawPayload)
  const title = normalizeText(parsed.title) || DEFAULT_PUSH_TITLE
  const body = normalizeText(parsed.body || parsed.message) || DEFAULT_PUSH_BODY
  const url = resolveSafeClientUrl(parsed.url || parsed.deep_link || DEFAULT_PUSH_URL)
  const priority = normalizeText(parsed.priority || 'normal')
  const notificationId = normalizeText(parsed.notification_id || parsed.notificationId)
  const type = normalizeText(parsed.type)
  const category = normalizeText(parsed.category)
  const tag = normalizeText(parsed.tag) || notificationId || [type, category, url].filter(Boolean).join(':') || 'notification'

  return {
    title,
    options: {
      body,
      icon: normalizeText(parsed.icon) || DEFAULT_PUSH_ICON,
      badge: normalizeText(parsed.badge) || DEFAULT_PUSH_BADGE,
      tag,
      renotify: Boolean(parsed.renotify && tag),
      requireInteraction: parsed.requireInteraction === true || priority === 'critical',
      data: {
        ...(isPlainObject(parsed.data) ? parsed.data : {}),
        url,
        notification_id: notificationId || null,
        type: type || null,
        category: category || null,
        priority,
      },
    },
  }
}

export function parseRawPayload(rawPayload) {
  if (!rawPayload) return {}

  if (typeof rawPayload === 'string') {
    try {
      const parsed = JSON.parse(rawPayload)
      return isPlainObject(parsed) ? parsed : {}
    } catch {
      return {
        title: DEFAULT_PUSH_TITLE,
        body: rawPayload,
      }
    }
  }

  if (isPlainObject(rawPayload)) return rawPayload
  return {}
}

export function resolveSafeClientUrl(value, origin = selfOrigin()) {
  const rawValue = normalizeText(value)
  if (!rawValue) return DEFAULT_PUSH_URL

  if (SAFE_PATH_PATTERN.test(rawValue) && !isUnsafeProtocol(rawValue)) {
    return rawValue
  }

  try {
    const base = new URL(origin || 'https://app.local')
    const parsed = new URL(rawValue, base)
    if (parsed.origin !== base.origin) return DEFAULT_PUSH_URL
    if (!['http:', 'https:'].includes(parsed.protocol)) return DEFAULT_PUSH_URL
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || DEFAULT_PUSH_URL
  } catch {
    return DEFAULT_PUSH_URL
  }
}

export function isSameClientUrl(clientUrl, targetPath, origin = selfOrigin()) {
  try {
    const base = new URL(origin || 'https://app.local')
    const client = new URL(clientUrl, base)
    const target = new URL(targetPath || DEFAULT_PUSH_URL, base)
    return client.origin === base.origin
      && client.pathname === target.pathname
      && client.search === target.search
      && client.hash === target.hash
  } catch {
    return false
  }
}

function isUnsafeProtocol(value) {
  const lower = value.toLowerCase()
  return lower.startsWith('//')
    || lower.includes('javascript:')
    || lower.includes('data:')
}

function normalizeText(value) {
  return String(value || '').trim()
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function selfOrigin() {
  try {
    return self.location?.origin || ''
  } catch {
    return ''
  }
}
