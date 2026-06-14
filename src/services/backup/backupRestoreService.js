import { supabase } from '../../lib/supabase'
import { exportFullBackupJson as exportFullBackupJsonService } from '../export/csvExports'
import packageJson from '../../../package.json'

const OPTIONAL_BACKUP_TABLES = [
  'sponsors',
  'sponsor_contracts',
  'media_items',
  'merch_items',
  'merch_variants',
  'merch_sales',
  'merch_sale_items',
  'shop_orders',
  'shop_order_items',
  'event_registrations',
  'cash_month_closings',
  'member_change_requests',
]

async function fetchOptionalBackupTable(table) {
  try {
    const { data, error } = await supabase.from(table).select('*')

    if (error) {
      return {
        table,
        rows: null,
        skipped: {
          table,
          reason: error.message || 'Tabelle konnte nicht exportiert werden.',
        },
      }
    }

    return {
      table,
      rows: Array.isArray(data) ? data : [],
      skipped: null,
    }
  } catch (error) {
    return {
      table,
      rows: null,
      skipped: {
        table,
        reason: error?.message || 'Tabelle konnte nicht exportiert werden.',
      },
    }
  }
}

export async function exportFullBackupJson({
  selectedCashYear,
  members,
  fees,
  membershipFeePeriods,
  membershipFeeItems,
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
  const optionalResults = await Promise.all(OPTIONAL_BACKUP_TABLES.map(fetchOptionalBackupTable))
  const optionalTables = {}
  const skippedTables = []

  optionalResults.forEach((result) => {
    if (Array.isArray(result.rows)) {
      optionalTables[result.table] = result.rows
      return
    }

    if (result.skipped) {
      skippedTables.push(result.skipped)
    }
  })

  return exportFullBackupJsonService({
    selectedCashYear,
    members,
    fees,
    membershipFeePeriods,
    membershipFeeItems,
    cashEntries,
    events,
    eventCheckins,
    documents,
    auditLogs,
    inventoryItems,
    invoices,
    invoiceItems,
    invoiceCustomers,
    appName: packageJson.name || 'styrian-bastards-manager',
    appVersion: packageJson.version,
    optionalTables,
    skippedTables,
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
        alertFn('Backup-Datei ist ungültig.')
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
  membershipFeePeriods,
  membershipFeeItems,
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
  if (!isAdmin()) return alertFn('Nur Admins dürfen Backups wiederherstellen.')

  if (!restoreData) {
    alertFn('Bitte zuerst eine Backup-JSON-Datei auswählen.')
    return
  }

  const confirmed = confirmFn(
      `Backup wiederherstellen?\n\n` +
      `Mitglieder: ${getRestoreCount(restoreData, 'members')}\n` +
      `Beiträge: ${getRestoreCount(restoreData, 'membership_fees')}\n` +
      `Beitragsperioden: ${getRestoreCount(restoreData, 'membership_fee_periods')}\n` +
      `Beitragspositionen: ${getRestoreCount(restoreData, 'membership_fee_items')}\n` +
      `Kassa: ${getRestoreCount(restoreData, 'cash_entries')}\n` +
      `Events: ${getRestoreCount(restoreData, 'events')}\n` +
      `Check-ins: ${getRestoreCount(restoreData, 'event_checkins')}\n` +
      `Dokumente: ${getRestoreCount(restoreData, 'documents')}\n\n` +
      `Es werden nur Datensätze mit noch nicht vorhandener ID importiert. Bestehende Daten werden nicht überschrieben.`
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
        table: 'membership_fee_periods',
        backupKey: 'membership_fee_periods',
        existing: membershipFeePeriods,
      },
      {
        table: 'membership_fee_items',
        backupKey: 'membership_fee_items',
        existing: membershipFeeItems,
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
