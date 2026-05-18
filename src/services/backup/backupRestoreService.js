import { supabase } from '../../lib/supabase'
import { exportFullBackupJson as exportFullBackupJsonService } from '../export/csvExports'

export function exportFullBackupJson({
  selectedCashYear,
  members,
  fees,
  cashEntries,
  events,
  eventCheckins,
  documents,
  auditLogs,
  inventoryItems,
  invoices,
  invoiceItems,
  invoiceCustomers,
}) {
  return exportFullBackupJsonService({
    selectedCashYear,
    members,
    fees,
    cashEntries,
    events,
    eventCheckins,
    documents,
    auditLogs,
    inventoryItems,
    invoices,
    invoiceItems,
    invoiceCustomers,
  })
}

export function handleRestoreFile({
  event,
  setRestoreData,
  setRestoreFileName,
  alertFn = alert,
  FileReaderCtor = FileReader,
}) {
  const file = event.target.files?.[0]

  if (!file) {
    setRestoreData(null)
    setRestoreFileName('')
    return
  }

  setRestoreFileName(file.name)

  const reader = new FileReaderCtor()

  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || '{}'))

      if (!parsed || typeof parsed !== 'object') {
        alertFn('Backup-Datei ist ungÃ¼ltig.')
        return
      }

      setRestoreData(parsed)
    } catch (error) {
      alertFn(`Backup konnte nicht gelesen werden: ${error.message}`)
    }
  }

  reader.readAsText(file, 'UTF-8')
}

export function getRestoreCount(restoreData, key) {
  return Array.isArray(restoreData?.[key]) ? restoreData[key].length : 0
}

export function stripSystemFields(row) {
  const cleaned = { ...(row || {}) }
  delete cleaned.created_at
  delete cleaned.updated_at
  return cleaned
}

export function deduplicateById(rows, existingRows) {
  const existingIds = new Set((existingRows || []).map((row) => row.id).filter(Boolean))

  return (rows || [])
    .filter((row) => row && row.id && !existingIds.has(row.id))
    .map(stripSystemFields)
}

export async function restoreFullBackup({
  isAdmin,
  restoreData,
  members,
  fees,
  events,
  cashEntries,
  eventCheckins,
  documents,
  setRestoreData,
  setRestoreFileName,
  setRestoreImporting,
  loadAll,
  alertFn = alert,
  confirmFn = window.confirm,
}) {
  if (!isAdmin()) return alertFn('Nur Admins dÃ¼rfen Backups wiederherstellen.')

  if (!restoreData) {
    alertFn('Bitte zuerst eine Backup-JSON-Datei auswÃ¤hlen.')
    return
  }

  const confirmed = confirmFn(
    `Backup wiederherstellen?\n\n` +
      `Mitglieder: ${getRestoreCount(restoreData, 'members')}\n` +
      `BeitrÃ¤ge: ${getRestoreCount(restoreData, 'membership_fees')}\n` +
      `Kassa: ${getRestoreCount(restoreData, 'cash_entries')}\n` +
      `Events: ${getRestoreCount(restoreData, 'events')}\n` +
      `Check-ins: ${getRestoreCount(restoreData, 'event_checkins')}\n` +
      `Dokumente: ${getRestoreCount(restoreData, 'documents')}\n\n` +
      `Es werden nur DatensÃ¤tze mit noch nicht vorhandener ID importiert. Bestehende Daten werden nicht Ã¼berschrieben.`
  )

  if (!confirmed) return

  setRestoreImporting(true)

  try {
    const restoreSteps = [
      {
        table: 'members',
        backupKey: 'members',
        existing: members,
      },
      {
        table: 'membership_fees',
        backupKey: 'membership_fees',
        existing: fees,
      },
      {
        table: 'events',
        backupKey: 'events',
        existing: events,
      },
      {
        table: 'cash_entries',
        backupKey: 'cash_entries',
        existing: cashEntries,
      },
      {
        table: 'event_checkins',
        backupKey: 'event_checkins',
        existing: eventCheckins,
      },
      {
        table: 'documents',
        backupKey: 'documents',
        existing: documents,
      },
    ]

    const importedSummary = []

    for (const step of restoreSteps) {
      const rows = Array.isArray(restoreData[step.backupKey]) ? restoreData[step.backupKey] : []
      const rowsToInsert = deduplicateById(rows, step.existing)

      if (rowsToInsert.length === 0) {
        importedSummary.push(`${step.table}: 0`)
        continue
      }

      const { error } = await supabase.from(step.table).insert(rowsToInsert)

      if (error) {
        alertFn(`Fehler beim Restore in ${step.table}: ${error.message}`)
        return
      }

      importedSummary.push(`${step.table}: ${rowsToInsert.length}`)
    }

    setRestoreData(null)
    setRestoreFileName('')
    await loadAll()

    alertFn(`Backup wurde wiederhergestellt.\n\nImportiert:\n${importedSummary.join('\n')}`)
  } finally {
    setRestoreImporting(false)
  }
}
