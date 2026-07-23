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

  return nextItems
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, limit)
}

export function resolveNotificationTarget(notification) {
  const url = String(notification?.url || '').trim()
  if (isSafeInternalPath(url)) {
    return { kind: 'path', path: url, page: pageFromPath(url) }
  }

  const module = notification?.data?.source?.module
  if (module && PAGE_BY_MODULE[module]) {
    return { kind: 'page', page: PAGE_BY_MODULE[module] }
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
