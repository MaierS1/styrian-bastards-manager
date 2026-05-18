import { supabase } from '../../lib/supabase'

export function saveOfflineCashEntryService({
  entry,
  storage = localStorage,
  setOfflineCashEntries,
}) {
  const current = JSON.parse(storage.getItem('offlineCashEntries') || '[]')
  const updated = [entry, ...current]

  storage.setItem('offlineCashEntries', JSON.stringify(updated))
  setOfflineCashEntries(updated)
}

export async function syncOfflineCashEntriesService({
  offlineCashEntries,
  setOfflineCashEntries,
  loadCashEntries,
  isOnline = navigator.onLine,
  storage = localStorage,
  alertFn = alert,
}) {
  if (!isOnline) {
    alertFn('Keine Internetverbindung.')
    return
  }

  if (offlineCashEntries.length === 0) {
    alertFn('Keine Offline-EintrÃ¤ge vorhanden.')
    return
  }

  const entriesToSync = offlineCashEntries.map((offlineEntry) => {
    const entry = { ...offlineEntry }
    delete entry.offline_id
    return entry
  })

  const { error } = await supabase.from('cash_entries').insert(entriesToSync)

  if (error) return alertFn(error.message)

  storage.removeItem('offlineCashEntries')
  setOfflineCashEntries([])
  loadCashEntries()

  alertFn('Offline-EintrÃ¤ge wurden synchronisiert.')
}
