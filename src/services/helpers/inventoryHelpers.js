export function normalizeInventoryDate(value) {
  const text = String(value || '').trim()

  if (!text) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text

  const parts = text.split('.')
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0')
    const month = parts[1].padStart(2, '0')
    const year = parts[2]
    return `${year}-${month}-${day}`
  }

  return null
}

export function getInventoryCsvValue(row, keys) {
  const normalizedRow = {}

  Object.keys(row || {}).forEach((key) => {
    const normalizedKey = key
      .trim()
      .toLowerCase()
      .replace('ä', 'ae')
      .replace('ö', 'oe')
      .replace('ü', 'ue')
      .replace('ß', 'ss')
      .replace(/[^a-z0-9]/g, '')

    normalizedRow[normalizedKey] = row[key]
  })

  for (const key of keys) {
    const normalizedKey = key
      .trim()
      .toLowerCase()
      .replace('ä', 'ae')
      .replace('ö', 'oe')
      .replace('ü', 'ue')
      .replace('ß', 'ss')
      .replace(/[^a-z0-9]/g, '')

    if (normalizedRow[normalizedKey] !== undefined) {
      return String(normalizedRow[normalizedKey] || '').trim()
    }
  }

  return ''
}

export function normalizeInventoryCondition(value) {
  const text = String(value || '').trim().toLowerCase()

  if (text.includes('neu')) return 'neu'
  if (text.includes('defekt')) return 'defekt'
  if (text.includes('repar')) return 'reparatur'
  if (text.includes('schlecht')) return 'schlecht'
  if (text.includes('gebraucht')) return 'gebraucht'
  if (text.includes('gut')) return 'gut'

  return 'gut'
}

export function normalizeInventoryStatus(value) {
  const text = String(value || '').trim().toLowerCase()

  if (text.includes('ausgemustert')) return 'ausgemustert'
  if (text.includes('verliehen')) return 'verliehen'
  if (text.includes('defekt')) return 'defekt'
  if (text.includes('aktiv')) return 'aktiv'

  return 'aktiv'
}

export function getNextInventoryNumber(inventoryItems) {
  const maxNumber = inventoryItems.reduce((max, item) => {
    const match = String(item.inventory_number || '').match(/^SB-(\d+)$/)
    if (!match) return max

    return Math.max(max, Number(match[1]))
  }, 0)

  return `SB-${String(maxNumber + 1).padStart(3, '0')}`
}

export function getInventorySortValue(item, key) {
  if (key === 'inventory_number') {
    const match = String(item.inventory_number || '').match(/^SB-(\d+)$/)
    return match ? Number(match[1]) : 0
  }

  if (key === 'purchase_date') return item.purchase_date || ''
  if (key === 'name') return item.name || ''
  if (key === 'location') return item.location || ''
  return item[key] || ''
}

export function getFilteredInventoryItems(inventoryItems, options, getInventorySortValueFn) {
  const { searchText, categoryFilter, statusFilter, sortBy, sortDirection } = options
  const search = String(searchText || '').toLowerCase()

  return inventoryItems
    .filter((item) => {
      const matchesSearch =
        !search ||
        (item.inventory_number || '').toLowerCase().includes(search) ||
        (item.name || '').toLowerCase().includes(search) ||
        (item.category || '').toLowerCase().includes(search) ||
        (item.location || '').toLowerCase().includes(search) ||
        (item.responsible || '').toLowerCase().includes(search)

      const matchesCategory = categoryFilter === 'alle' || item.category === categoryFilter
      const matchesStatus = statusFilter === 'alle' || item.status === statusFilter

      return matchesSearch && matchesCategory && matchesStatus
    })
    .sort((a, b) => {
      const valueA = getInventorySortValueFn(a, sortBy)
      const valueB = getInventorySortValueFn(b, sortBy)

      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return sortDirection === 'asc' ? valueA - valueB : valueB - valueA
      }

      return sortDirection === 'asc'
        ? String(valueA).localeCompare(String(valueB), 'de-AT')
        : String(valueB).localeCompare(String(valueA), 'de-AT')
    })
}

export function getInventoryCategories(inventoryItems) {
  const categories = new Set(inventoryItems.map((item) => item.category).filter(Boolean))
  return Array.from(categories).sort((a, b) => a.localeCompare(b))
}

export function getInventoryTotalValue(items = []) {
  return items
    .filter((item) => item.status !== 'ausgemustert')
    .reduce((sum, item) => sum + Number(item.value || 0), 0)
}

export function getInventoryQrValue(item, origin = window.location.origin) {
  return item.qr_url || `${origin}?inventory=${encodeURIComponent(item.inventory_number || item.id)}`
}
