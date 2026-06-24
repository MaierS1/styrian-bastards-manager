export function formatFallback(value, fallback = 'Keine Angabe') {
  if (value === null || value === undefined || value === '') return fallback

  return String(value)
}

export function formatList(items = [], formatter = (item) => item, { limit = 5 } = {}) {
  if (!Array.isArray(items) || items.length === 0) return ''

  return items
    .slice(0, limit)
    .map((item) => `- ${formatter(item)}`)
    .join('\n')
}

export function formatDate(value) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export function formatAmount(value, { currency = 'EUR', fromCents = true } = {}) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null

  const amount = fromCents ? Number(value) / 100 : Number(value)

  return new Intl.NumberFormat('de-AT', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatLink(value, label = null) {
  if (!value || typeof value !== 'string') return null

  return label ? `${label}: ${value}` : value
}

export function compactLines(lines = []) {
  return lines.filter(Boolean).join('\n')
}

export function getRecordCount(data) {
  if (Array.isArray(data)) return data.length
  if (data && typeof data === 'object') return 1

  return 0
}
