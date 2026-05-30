export const EVENT_CATEGORY_OPTIONS = [
  { value: 'treffen', label: 'Treffen' },
  { value: 'fanfahrt', label: 'Fanfahrten' },
  { value: 'cornhole', label: 'Cornhole' },
  { value: 'vereinsveranstaltung', label: 'Vereinsveranstaltung' },
  { value: 'sonstiges', label: 'Sonstiges' },
]

export function getEventCategoryLabel(value) {
  return EVENT_CATEGORY_OPTIONS.find((category) => category.value === value)?.label || 'Event'
}
