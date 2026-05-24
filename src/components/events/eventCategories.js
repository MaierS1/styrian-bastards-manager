export const EVENT_CATEGORY_OPTIONS = [
  { value: 'event', label: 'Event' },
  { value: 'heimspiel', label: 'Heimspiel' },
  { value: 'turnier', label: 'Turnier' },
  { value: 'fanfahrt', label: 'Fanfahrt' },
  { value: 'treffen', label: 'Treffen' },
  { value: 'sitzung', label: 'Sitzung' },
  { value: 'sonstiges', label: 'Sonstiges' },
]

export function getEventCategoryLabel(value) {
  return EVENT_CATEGORY_OPTIONS.find((category) => category.value === value)?.label || 'Event'
}
