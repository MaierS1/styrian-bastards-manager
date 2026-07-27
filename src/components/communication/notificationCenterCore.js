export const categoryLabels = {
  event: 'Event',
  membership_fee: 'Beitrag',
  invoice: 'Rechnung',
  shop: 'Shop',
  sponsor: 'Sponsor',
  document: 'Dokument',
  press: 'Presse',
  news: 'News',
  financing: 'Vorfinanzierung',
  cash: 'Kassa',
  member: 'Mitglied',
  club_news: 'News',
  board: 'Vorstand',
  system: 'System',
  backup: 'Backup',
}

const PAGE_BY_MODULE = {
  events: 'events',
  beitraege: 'fees',
  rechnungen: 'invoices',
  dokumente: 'documents',
  medien_presse: 'media',
  vorfinanzierungen: 'financingLiabilities',
  kassa: 'cash',
  mitglieder: 'members',
  sponsoren: 'sponsors',
  membership_fees: 'fees',
  invoices: 'invoices',
  shop: 'merch',
  sponsors: 'sponsors',
  financing: 'financingLiabilities',
  financing_liabilities: 'financingLiabilities',
  cash: 'cash',
  members: 'members',
  press: 'media',
  news: 'media',
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
  financingLiabilities: { module: 'vorfinanzierungen' },
  inventory: { module: 'inventar' },
  admin: { module: 'backup' },
}

const PAGE_BY_CATEGORY = {
  event: 'events',
  membership_fee: 'fees',
  invoice: 'invoices',
  shop: 'merch',
  sponsor: 'sponsors',
  document: 'documents',
  press: 'media',
  news: 'media',
  financing: 'financingLiabilities',
  cash: 'cash',
  member: 'members',
  club_news: 'media',
  system: 'dashboard',
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
  const sourceItems = reset ? [] : normalizeNotificationItems(currentItems)

  for (const item of [...sourceItems, ...normalizeNotificationItems(nextItems)]) {
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
  const normalizedItems = normalizeNotificationItems(items)
  if (error) return 'error'
  if (loading && normalizedItems.length === 0) return 'loading'
  if (!loading && normalizedItems.length === 0) return 'empty'
  return 'ready'
}

export function normalizeNotificationItems(items) {
  return Array.isArray(items) ? items.filter(Boolean) : []
}

export function applyOptimisticRead(items, notificationId, readAt) {
  return normalizeNotificationItems(items).map((item) => (
    item.id === notificationId ? { ...item, read_at: item.read_at || readAt } : item
  ))
}

export function resolveNotificationTarget(notification, { canOpenPage = () => false } = {}) {
  const url = String(notification?.url || '').trim()
  if (isSafeInternalPath(url)) {
    const pathTarget = buildAllowedTarget({
      kind: 'path',
      path: url,
      page: pageFromPath(url),
      entityId: entityIdFromPath(url),
      canOpenPage,
    })
    if (pathTarget.page) return pathTarget
  }

  const module = notification?.data?.source?.module
  if (module && PAGE_BY_MODULE[module]) {
    const moduleTarget = buildAllowedTarget({
      kind: 'page',
      page: PAGE_BY_MODULE[module],
      entityId: entityIdFromNotification(notification),
      canOpenPage,
    })
    if (moduleTarget.page) return moduleTarget
  }

  const fallbackPage = PAGE_BY_CATEGORY[notification?.category] || 'dashboard'
  return buildAllowedTarget({
    kind: 'fallback',
    page: fallbackPage,
    entityId: entityIdFromNotification(notification),
    canOpenPage,
  })
}

export async function openNotificationAndNavigate({
  notification,
  markRead,
  onNavigate,
  canOpenPage = () => false,
  onError = () => {},
} = {}) {
  const target = resolveNotificationTarget(notification, { canOpenPage })

  try {
    if (markRead) await markRead(notification)
  } catch (error) {
    onError(error)
  }

  if (target.page && onNavigate) {
    onNavigate(target.page, target)
    return { navigated: true, target }
  }

  return { navigated: false, target }
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
  const cleanPath = String(path || '').split(/[?#]/)[0]
  const firstSegment = cleanPath.split('/').filter(Boolean)[0]
  return PAGE_BY_MODULE[firstSegment] || firstSegment || null
}

function entityIdFromPath(path) {
  const query = String(path || '').split('?')[1]?.split('#')[0]
  if (!query) return null

  try {
    return new URLSearchParams(query).get('id')
  } catch {
    return null
  }
}

function entityIdFromNotification(notification) {
  return notification?.data?.metadata?.target_id
    || notification?.data?.metadata?.member_id
    || notification?.data?.metadata?.event_id
    || notification?.data?.metadata?.invoice_id
    || notification?.data?.metadata?.financing_liability_id
    || notification?.data?.metadata?.document_id
    || notification?.data?.metadata?.sponsor_id
    || notification?.data?.source?.entity_id
    || null
}

function buildAllowedTarget({ kind, page, path = null, entityId = null, canOpenPage }) {
  if (!page || !notificationTargetPages[page] || !canOpenPage(page)) {
    return { kind: 'none', page: null, path: null, entityId: null }
  }

  return { kind, page, path, entityId }
}

function isNotificationAfterCursor(notification, cursor) {
  const createdAt = String(notification?.created_at || '')
  if (createdAt < cursor.created_at) return true
  if (createdAt > cursor.created_at) return false
  if (!cursor.id) return false
  return String(notification?.id || '') < cursor.id
}
