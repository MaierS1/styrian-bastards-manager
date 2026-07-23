export const categoryLabels = {
  event: 'Event',
  membership_fee: 'Beitrag',
  invoice: 'Rechnung',
  document: 'Dokument',
  club_news: 'News',
  board: 'Vorstand',
  system: 'System',
  backup: 'Backup',
}

const PAGE_BY_MODULE = {
  events: 'events',
  membership_fees: 'fees',
  invoices: 'invoices',
  documents: 'documents',
  club_news: 'media',
  system: 'dashboard',
}

export const notificationTargetPages = {
  dashboard: { module: null },
  portal: { module: null },
  notifications: { module: null },
  members: { module: 'mitglieder' },
  fees: { module: 'beitraege' },
  cash: { module: 'kassa' },
  invoices: { module: 'rechnungen' },
  events: { module: 'events' },
  documents: { module: 'dokumente' },
  media: { module: 'medien_presse' },
  sponsors: { module: 'sponsoren' },
  merch: { module: 'shop' },
  inventory: { module: 'inventar' },
  admin: { module: 'backup' },
}

export function getCategoryLabel(category) {
  return categoryLabels[category] || category || 'Info'
}

export function formatUnreadBadge(count) {
  const value = Number(count || 0)
  if (value <= 0) return ''
  return value > 99 ? '99+' : String(value)
}

export function mergeNotificationList(currentItems, changedItem, { limit = 20 } = {}) {
  if (!changedItem?.id) return currentItems

  const nextItems = currentItems.filter((item) => item.id !== changedItem.id)
  if (!changedItem.deleted_at && !changedItem.archived_at) {
    nextItems.unshift(changedItem)
  }

  return sortNotificationsByCursor(nextItems).slice(0, limit)
}

export function mergeNotificationPage(currentItems, nextItems, { reset = false } = {}) {
  const itemsById = new Map()
  const sourceItems = reset ? [] : currentItems

  for (const item of [...sourceItems, ...nextItems]) {
    if (item?.id && !itemsById.has(item.id)) {
      itemsById.set(item.id, item)
    }
  }

  return sortNotificationsByCursor([...itemsById.values()])
}

export function createNotificationCursor(notification) {
  if (!notification?.created_at || !notification?.id) return null
  return {
    created_at: notification.created_at,
    id: notification.id,
  }
}

export function normalizeNotificationCursor(cursor) {
  if (!cursor) return null
  if (typeof cursor === 'string') return { created_at: cursor, id: null }
  if (cursor.created_at) {
    return {
      created_at: cursor.created_at,
      id: cursor.id || null,
    }
  }
  return null
}

export function sortNotificationsByCursor(items) {
  return [...items].sort((a, b) => {
    const createdDiff = new Date(b.created_at || 0) - new Date(a.created_at || 0)
    if (createdDiff !== 0) return createdDiff
    return String(b.id || '').localeCompare(String(a.id || ''))
  })
}

export function paginateNotifications(items, { cursor = null, limit = 20 } = {}) {
  const normalizedCursor = normalizeNotificationCursor(cursor)
  const sorted = sortNotificationsByCursor(items)
  const pageItems = normalizedCursor
    ? sorted.filter((item) => isNotificationAfterCursor(item, normalizedCursor))
    : sorted

  return pageItems.slice(0, limit)
}

export function getNotificationListState({ loading = false, error = '', items = [] } = {}) {
  if (error) return 'error'
  if (loading && items.length === 0) return 'loading'
  if (!loading && items.length === 0) return 'empty'
  return 'ready'
}

export function applyOptimisticRead(items, notificationId, readAt) {
  return items.map((item) => (
    item.id === notificationId ? { ...item, read_at: item.read_at || readAt } : item
  ))
}

export function resolveNotificationTarget(notification, { canOpenPage = () => false } = {}) {
  const url = String(notification?.url || '').trim()
  if (isSafeInternalPath(url)) {
    return buildAllowedTarget({ kind: 'path', path: url, page: pageFromPath(url), canOpenPage })
  }

  const module = notification?.data?.source?.module
  if (module && PAGE_BY_MODULE[module]) {
    return buildAllowedTarget({ kind: 'page', page: PAGE_BY_MODULE[module], canOpenPage })
  }

  return { kind: 'none', page: null, path: null }
}

export function isSafeInternalPath(value) {
  const path = String(value || '').trim()
  const lower = path.toLowerCase()
  return /^\/[A-Za-z0-9/_?=&.#%:-]*$/.test(path)
    && !lower.startsWith('//')
    && !lower.includes('javascript:')
    && !lower.includes('data:')
}

function pageFromPath(path) {
  const firstSegment = String(path || '').split('/').filter(Boolean)[0]
  return PAGE_BY_MODULE[firstSegment] || firstSegment || null
}

function buildAllowedTarget({ kind, page, path = null, canOpenPage }) {
  if (!page || !notificationTargetPages[page] || !canOpenPage(page)) {
    return { kind: 'none', page: null, path: null }
  }

  return { kind, page, path }
}

function isNotificationAfterCursor(notification, cursor) {
  const createdAt = String(notification?.created_at || '')
  if (createdAt < cursor.created_at) return true
  if (createdAt > cursor.created_at) return false
  if (!cursor.id) return false
  return String(notification?.id || '') < cursor.id
}
