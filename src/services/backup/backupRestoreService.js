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

const KNOWN_STORAGE_BUCKETS = [
  { id: 'documents', name: 'documents', public: false },
  { id: 'invoice-archive', name: 'invoice-archive', public: false },
  { id: 'public-assets', name: 'public-assets', public: true },
  { id: 'receipts', name: 'receipts', public: false },
]

const ASSET_LINK_FIELDS = [
  { table: 'documents', bucket: 'documents', fields: ['file_path'] },
  { table: 'invoices', bucket: 'invoice-archive', fields: ['pdf_url'] },
  { table: 'cash_entries', bucket: 'receipts', fields: ['receipt_url'] },
  { table: 'sponsor_contracts', bucket: 'documents', fields: ['document_path'] },
  { table: 'sponsors', bucket: 'public-assets', fields: ['logo_path'] },
  { table: 'merch_items', bucket: 'public-assets', fields: ['image_path'] },
  { table: 'events', bucket: 'public-assets', fields: ['public_image_path', 'public_image_url', 'event_image_url'] },
  { table: 'media_items', bucket: 'public-assets', fields: ['image_path', 'audio_url'] },
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

function normalizeBucket(bucket) {
  if (typeof bucket === 'string') return { id: bucket, name: bucket, public: bucket === 'public-assets' }

  const name = bucket?.name || bucket?.id

  return {
    id: bucket?.id || name,
    name,
    public: bucket?.public === true,
  }
}

async function getStorageBuckets() {
  try {
    const { data, error } = await supabase.storage.listBuckets()

    if (error) {
      return {
        buckets: KNOWN_STORAGE_BUCKETS,
        warnings: [{
          bucket: 'storage.buckets',
          reason: `Bucket-Liste konnte nicht gelesen werden: ${error.message}. Bekannte Buckets werden einzeln geprüft.`,
        }],
      }
    }

    const bucketsByName = new Map()

    KNOWN_STORAGE_BUCKETS.forEach((bucket) => {
      bucketsByName.set(bucket.name, normalizeBucket(bucket))
    })

    const remoteBuckets = data || []

    remoteBuckets.forEach((bucket) => {
      const normalized = normalizeBucket(bucket)
      if (normalized.name) bucketsByName.set(normalized.name, normalized)
    })

    return {
      buckets: Array.from(bucketsByName.values()),
      warnings: [],
    }
  } catch (error) {
    return {
      buckets: KNOWN_STORAGE_BUCKETS,
      warnings: [{
        bucket: 'storage.buckets',
        reason: `Bucket-Liste konnte nicht gelesen werden: ${error?.message || 'Unbekannter Fehler'}. Bekannte Buckets werden einzeln geprüft.`,
      }],
    }
  }
}

function isStorageFolder(item) {
  return !item?.id && !item?.metadata?.size && !item?.metadata?.mimetype && !item?.metadata?.mimeType
}

async function listBucketFiles(bucket, prefix = '') {
  const limit = 1000
  let offset = 0
  const files = []

  while (true) {
    const { data, error } = await supabase.storage
      .from(bucket.name)
      .list(prefix, { limit, offset, sortBy: { column: 'name', order: 'asc' } })

    if (error) throw error

    const entries = data || []

    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name

      if (isStorageFolder(entry)) {
        const nestedFiles = await listBucketFiles(bucket, path)
        files.push(...nestedFiles)
        continue
      }

      files.push({ ...entry, path })
    }

    if (entries.length < limit) break
    offset += limit
  }

  return files
}

function decodeStorageValue(value) {
  try {
    return decodeURIComponent(String(value || '').trim())
  } catch {
    return String(value || '').trim()
  }
}

function extractStoragePath(value, bucketName) {
  const text = decodeStorageValue(value)
  if (!text) return null

  const cleanText = text.split('?')[0].split('#')[0]

  if (/^https?:\/\//i.test(cleanText)) {
    const publicMarker = `/storage/v1/object/public/${bucketName}/`
    const signedMarker = `/storage/v1/object/sign/${bucketName}/`
    const publicIndex = cleanText.indexOf(publicMarker)
    const signedIndex = cleanText.indexOf(signedMarker)

    if (publicIndex >= 0) return cleanText.slice(publicIndex + publicMarker.length)
    if (signedIndex >= 0) return cleanText.slice(signedIndex + signedMarker.length)
    return null
  }

  if (cleanText.startsWith(`${bucketName}/`)) return cleanText.slice(bucketName.length + 1)

  return cleanText
}

function addAssetLink(assetLinks, bucket, path, table, sourceField, row) {
  if (!path) return

  const key = `${bucket}:${path}`
  if (assetLinks.has(key)) return

  assetLinks.set(key, {
    linked_table: table,
    linked_record_id: row?.id || null,
    source_field: sourceField,
  })
}

function buildAssetLinkIndex(tableData) {
  const assetLinks = new Map()

  ASSET_LINK_FIELDS.forEach(({ table, bucket, fields }) => {
    const rows = Array.isArray(tableData[table]) ? tableData[table] : []

    rows.forEach((row) => {
      fields.forEach((field) => {
        addAssetLink(assetLinks, bucket, extractStoragePath(row?.[field], bucket), table, field, row)
      })
    })
  })

  return assetLinks
}

function getPublicUrl(bucket, path) {
  if (!bucket.public && bucket.name !== 'public-assets') return null

  const { data } = supabase.storage.from(bucket.name).getPublicUrl(path)
  return data?.publicUrl || null
}

function toAssetManifestEntry(bucket, file, assetLinks) {
  const metadata = file.metadata || {}
  const link = assetLinks.get(`${bucket.name}:${file.path}`)

  return {
    bucket: bucket.name,
    path: file.path,
    file_name: file.name,
    size: metadata.size ?? null,
    mime_type: metadata.mimetype || metadata.mimeType || metadata.contentType || null,
    created_at: file.created_at || null,
    updated_at: file.updated_at || file.last_accessed_at || null,
    public_url: getPublicUrl(bucket, file.path),
    linked_table: link?.linked_table || null,
    linked_record_id: link?.linked_record_id || null,
    source_field: link?.source_field || null,
    status: link ? 'linked' : 'unlinked',
  }
}

async function buildStorageAssetManifest(tableData) {
  const { buckets, warnings } = await getStorageBuckets()
  const assetLinks = buildAssetLinkIndex(tableData)
  const assetManifest = []
  const skippedBuckets = [...warnings]
  const storageBucketsScanned = []

  for (const bucket of buckets) {
    if (!bucket.name) continue

    try {
      const files = await listBucketFiles(bucket)
      storageBucketsScanned.push(bucket.name)
      assetManifest.push(...files.map((file) => toAssetManifestEntry(bucket, file, assetLinks)))
    } catch (error) {
      skippedBuckets.push({
        bucket: bucket.name,
        reason: error?.message || 'Bucket konnte nicht gelesen werden.',
      })
    }
  }

  return {
    assetManifest,
    storageBucketsScanned,
    skippedBuckets,
  }
}

async function checkStorageBucket(bucket) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket.name)
      .list('', { limit: 1, offset: 0 })

    if (error) {
      return {
        bucket: bucket.name,
        status: 'warning',
        readable: false,
        message: error.message || 'Bucket ist nicht lesbar.',
      }
    }

    return {
      bucket: bucket.name,
      status: 'ok',
      readable: true,
      sample_count: Array.isArray(data) ? data.length : 0,
      message: 'Bucket erreichbar.',
    }
  } catch (error) {
    return {
      bucket: bucket.name,
      status: 'warning',
      readable: false,
      message: error?.message || 'Bucket ist nicht lesbar.',
    }
  }
}

export async function checkBackupSystemStatus() {
  const checkedAt = new Date().toISOString()
  const database = {
    status: 'error',
    label: 'nicht erreichbar',
    member_count: null,
    message: '',
  }

  try {
    const { count, error } = await supabase
      .from('members')
      .select('id', { count: 'exact', head: true })

    if (error) {
      database.message = error.message || 'Supabase Datenbank konnte nicht abgefragt werden.'
    } else {
      database.status = 'ok'
      database.label = 'erreichbar'
      database.member_count = count ?? 0
      database.message = 'Members-Count erfolgreich abgefragt.'
    }
  } catch (error) {
    database.message = error?.message || 'Supabase Datenbank konnte nicht abgefragt werden.'
  }

  const bucketResult = await getStorageBuckets()
  const bucketChecks = await Promise.all(bucketResult.buckets.map(checkStorageBucket))
  const readableBuckets = bucketChecks.filter((bucket) => bucket.readable)
  const skippedBuckets = [
    ...bucketResult.warnings,
    ...bucketChecks
      .filter((bucket) => !bucket.readable)
      .map((bucket) => ({ bucket: bucket.bucket, reason: bucket.message })),
  ]
  const storage = {
    status: bucketChecks.length === 0 ? 'error' : skippedBuckets.length > 0 ? 'warning' : 'ok',
    label: bucketChecks.length === 0 ? 'nicht erreichbar' : skippedBuckets.length > 0 ? 'Warnung' : 'erreichbar',
    bucket_count: readableBuckets.length,
    buckets_checked: bucketChecks,
    skipped_buckets: skippedBuckets,
    message: skippedBuckets.length > 0
      ? 'Einige Buckets konnten nicht gelesen werden.'
      : 'Storage-Buckets erreichbar.',
  }

  return {
    checked_at: checkedAt,
    database,
    storage,
    backup_module: {
      status: 'ok',
      label: 'unterstützt',
      manifest_supported: true,
      asset_manifest_supported: true,
      restore_mode: 'additive_only',
      local_download_note: 'Lokale Downloads werden nicht automatisch serverseitig gespeichert.',
    },
    integration: {
      status: 'manual',
      label: 'manuell prüfen',
      notes: [
        'Homepage-Daten kommen teilweise aus Supabase.',
        'Die Manager-App ist die zentrale Datenquelle.',
        'GitHub/Cloudflare-Status wird in dieser Version nur als manuelle Prüfliste angezeigt.',
      ],
    },
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

  const tableData = {
    members,
    membership_fees: fees,
    membership_fee_periods: membershipFeePeriods,
    membership_fee_items: membershipFeeItems,
    cash_entries: cashEntries,
    events,
    event_checkins: eventCheckins,
    documents,
    audit_logs: auditLogs,
    inventory_items: inventoryItems,
    invoices,
    invoice_items: invoiceItems,
    invoice_customers: invoiceCustomers,
    ...optionalTables,
  }
  const {
    assetManifest,
    storageBucketsScanned,
    skippedBuckets,
  } = await buildStorageAssetManifest(tableData)

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
    assetManifest,
    storageBucketsScanned,
    skippedBuckets,
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
