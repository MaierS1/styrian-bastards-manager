import { useEffect, useState } from 'react'
import { buttonStyle, cardStyle, colors, headingStyle, inputStyle, mutedTextStyle, secondaryButtonStyle, sectionStyle } from '../../styles/appStyles'
import { checkBackupSystemStatus } from '../../services/backup/backupRestoreService'

const lastBackupStorageKey = 'styrianBastardsLastBackup'
const manualChecklistItems = [
  'GitHub Website Repo prüfen',
  'GitHub Manager Repo prüfen',
  'Cloudflare Pages Deployment prüfen',
  'Supabase Backups prüfen',
  'Storage-Dateien prüfen',
]

export function AdminBackupRestore({
  canRestore,
  exportMembersCsv,
  exportCashCsv,
  exportTaxAdvisorCsv,
  exportTaxAdvisorProCsv,
  exportCategorySummaryCsv,
  exportAuditLogsCsv,
  exportExcelStyleCashbookCsv,
  exportExcelStyleCashbookPdf,
  exportEventsCsv,
  exportCheckinsCsv,
  exportDocumentsCsv,
  exportInventoryCsv,
  exportInventoryPdf,
  exportInventoryLabelsPdf,
  exportInvoicesCsv,
  exportFullBackupJson,
  handleRestoreFile,
  restoreFileName,
  restoreData,
  getRestoreCount,
  restoreFullBackup,
  restoreImporting,
  setRestoreData,
  setRestoreFileName,
}) {
  const [systemStatus, setSystemStatus] = useState(null)
  const [systemStatusLoading, setSystemStatusLoading] = useState(false)
  const [lastBackupInfo, setLastBackupInfo] = useState(null)
  const [backupExporting, setBackupExporting] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(lastBackupStorageKey)
      if (stored) setLastBackupInfo(JSON.parse(stored))
    } catch {
      setLastBackupInfo(null)
    }
  }, [])

  async function refreshSystemStatus() {
    setSystemStatusLoading(true)

    try {
      setSystemStatus(await checkBackupSystemStatus())
    } catch (error) {
      setSystemStatus({
        checked_at: new Date().toISOString(),
        database: {
          status: 'error',
          label: 'nicht erreichbar',
          message: error?.message || 'Systemstatus konnte nicht geprüft werden.',
        },
        storage: {
          status: 'error',
          label: 'nicht erreichbar',
          bucket_count: 0,
          buckets_checked: [],
          skipped_buckets: [],
          message: error?.message || 'Storage-Status konnte nicht geprüft werden.',
        },
        backup_module: {
          status: 'warning',
          label: 'eingeschränkt',
          manifest_supported: true,
          asset_manifest_supported: true,
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
      })
    } finally {
      setSystemStatusLoading(false)
    }
  }

  async function handleFullBackupExport() {
    setBackupExporting(true)

    try {
      const result = await exportFullBackupJson()

      if (result) {
        const nextBackupInfo = {
          ...result,
          saved_in_browser_at: new Date().toISOString(),
        }

        setLastBackupInfo(nextBackupInfo)

        try {
          localStorage.setItem(lastBackupStorageKey, JSON.stringify(nextBackupInfo))
        } catch {
          // Local status persistence is optional; the download itself is the important operation.
        }
      }
    } finally {
      setBackupExporting(false)
    }
  }

  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>Export & Backup</h2>

      <p style={mutedTextStyle}>
        Hier kannst du deine Vereinsdaten lokal sichern. CSV-Dateien eignen sich für Excel/LibreOffice,
        das JSON-Backup enthält alle Hauptdaten als Sicherheitskopie.
      </p>

      <p style={{ ...mutedTextStyle, color: colors.dangerText, fontWeight: 700 }}>
        Das Komplettbackup enthält personenbezogene und finanzielle Daten. Die Datei sollte sicher gespeichert
        und nicht unverschlüsselt weitergegeben werden.
      </p>

      <div style={{ ...cardStyle, borderTop: `6px solid ${getStatusColor(systemStatus?.database?.status || 'manual')}` }}>
        <div style={systemStatusHeaderStyle}>
          <div>
            <h3 style={systemStatusHeadingStyle}>Systemstatus</h3>
            <p style={mutedTextStyle}>
              Statusanzeige für Backup, Supabase und manuelle externe Prüfungen. Es werden keine Reparaturen ausgeführt.
            </p>
          </div>

          <button onClick={refreshSystemStatus} style={secondaryButtonStyle} disabled={systemStatusLoading}>
            {systemStatusLoading ? 'Status wird geprüft...' : 'Status aktualisieren'}
          </button>
        </div>

        <div style={statusGridStyle}>
          <StatusCard
            title="Supabase Datenbank"
            status={systemStatus?.database?.status || 'manual'}
            label={systemStatus?.database?.label || 'noch nicht geprüft'}
          >
            <p style={statusTextStyle}>{systemStatus?.database?.message || 'Members-Count wird beim Aktualisieren geprüft.'}</p>
            {Number.isFinite(systemStatus?.database?.member_count) && (
              <p style={statusTextStyle}>Mitglieder-Zählung: {systemStatus.database.member_count}</p>
            )}
          </StatusCard>

          <StatusCard
            title="Supabase Storage"
            status={systemStatus?.storage?.status || 'manual'}
            label={systemStatus?.storage?.label || 'noch nicht geprüft'}
          >
            <p style={statusTextStyle}>{systemStatus?.storage?.message || 'Buckets werden beim Aktualisieren geprüft.'}</p>
            <p style={statusTextStyle}>Gefundene lesbare Buckets: {systemStatus?.storage?.bucket_count ?? '-'}</p>
            {systemStatus?.storage?.buckets_checked?.length > 0 && (
              <ul style={statusListStyle}>
                {systemStatus.storage.buckets_checked.map((bucket) => (
                  <li key={bucket.bucket}>
                    {bucket.bucket}: {bucket.readable ? 'lesbar' : 'Warnung'}
                  </li>
                ))}
              </ul>
            )}
            {systemStatus?.storage?.skipped_buckets?.length > 0 && (
              <ul style={warningListStyle}>
                {systemStatus.storage.skipped_buckets.map((bucket) => (
                  <li key={`${bucket.bucket}-${bucket.reason}`}>
                    {bucket.bucket}: {bucket.reason}
                  </li>
                ))}
              </ul>
            )}
          </StatusCard>

          <StatusCard
            title="Backup-Modul"
            status={systemStatus?.backup_module?.status || 'ok'}
            label={systemStatus?.backup_module?.label || 'unterstützt'}
          >
            <p style={statusTextStyle}>
              Letztes lokales Backup: {formatBackupInfo(lastBackupInfo)}
            </p>
            <p style={statusTextStyle}>Manifest: unterstützt</p>
            <p style={statusTextStyle}>Asset-Manifest: unterstützt</p>
            <p style={statusTextStyle}>
              {systemStatus?.backup_module?.local_download_note ||
                'Lokale Downloads werden nicht automatisch serverseitig gespeichert.'}
            </p>
          </StatusCard>

          <StatusCard
            title="Homepage/App Integration"
            status="manual"
            label="manuell prüfen"
          >
            {(systemStatus?.integration?.notes || [
              'Homepage-Daten kommen teilweise aus Supabase.',
              'Die Manager-App ist die zentrale Datenquelle.',
              'GitHub/Cloudflare-Status wird in dieser Version nur als manuelle Prüfliste angezeigt.',
            ]).map((note) => (
              <p key={note} style={statusTextStyle}>{note}</p>
            ))}
          </StatusCard>
        </div>

        <div style={{ ...cardStyle, background: colors.offWhite, boxShadow: 'none' }}>
          <strong>Manuelle Prüfliste</strong>
          <ul style={statusListStyle}>
            {manualChecklistItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        {systemStatus?.checked_at && (
          <p style={mutedTextStyle}>Zuletzt geprüft: {formatDateTime(systemStatus.checked_at)}</p>
        )}
      </div>

      <div style={{ width: '100%', boxSizing: 'border-box', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <button onClick={exportMembersCsv} style={secondaryButtonStyle}>
          Mitglieder CSV
        </button>

        <button onClick={exportCashCsv} style={secondaryButtonStyle}>
          Kassabuch CSV
        </button>

        <button onClick={exportTaxAdvisorCsv} style={secondaryButtonStyle}>
          Steuerberater CSV
        </button>

        <button onClick={exportTaxAdvisorProCsv} style={secondaryButtonStyle}>
          Steuerberater PRO CSV
        </button>

        <button onClick={exportCategorySummaryCsv} style={secondaryButtonStyle}>
          Kategorien-Auswertung CSV
        </button>

        <button onClick={exportAuditLogsCsv} style={secondaryButtonStyle}>
          Audit Log CSV
        </button>

        <button onClick={exportExcelStyleCashbookCsv} style={secondaryButtonStyle}>
          Kassabuch wie Excel CSV
        </button>

        <button onClick={exportExcelStyleCashbookPdf} style={secondaryButtonStyle}>
          Kassabuch wie Excel PDF
        </button>

        <button onClick={exportEventsCsv} style={secondaryButtonStyle}>
          Events CSV
        </button>

        <button onClick={exportCheckinsCsv} style={secondaryButtonStyle}>
          Check-ins CSV
        </button>

        <button onClick={exportDocumentsCsv} style={secondaryButtonStyle}>
          Dokumentenliste CSV
        </button>

        <button onClick={exportInventoryCsv} style={secondaryButtonStyle}>
          Inventar CSV
        </button>

        <button onClick={exportInventoryPdf} style={secondaryButtonStyle}>
          Inventarliste PDF
        </button>

        <button onClick={exportInventoryLabelsPdf} style={secondaryButtonStyle}>
          Inventar Etiketten PDF
        </button>

        <button onClick={exportInvoicesCsv} style={secondaryButtonStyle}>
          Rechnungen CSV
        </button>

        <button onClick={handleFullBackupExport} style={buttonStyle} disabled={backupExporting}>
          {backupExporting ? 'Backup wird erstellt...' : 'Komplett-Backup JSON'}
        </button>
      </div>

      <p style={mutedTextStyle}>
        Hinweis: Das JSON-Backup enthält die Dokumenten-Metadaten, aber nicht die eigentlichen hochgeladenen Dateien.
        Diese liegen weiterhin im Supabase Storage.
      </p>

      <p style={mutedTextStyle}>
        Das Asset-Manifest enthält nur Dateiinformationen und Links, aber nicht die Dateien selbst. Für eine vollständige
        Wiederherstellung müssen die Dateien später separat exportiert werden.
      </p>

      {canRestore && (
        <div style={{ ...cardStyle, borderTop: `6px solid ${colors.red}` }}>
          <h3 style={headingStyle}>Backup wiederherstellen</h3>

          <p style={mutedTextStyle}>
            Wähle eine zuvor exportierte JSON-Backup-Datei aus. Die App importiert nur Datensätze,
            deren ID noch nicht vorhanden ist. Bestehende Daten werden nicht überschrieben.
          </p>

          <input
            type="file"
            accept=".json,application/json"
            onChange={handleRestoreFile}
            style={inputStyle}
          />

          {restoreFileName && (
            <p style={mutedTextStyle}>
              Datei: <strong>{restoreFileName}</strong>
            </p>
          )}

          {restoreData && (
            <div style={{ ...cardStyle, background: colors.infoBg, borderColor: colors.blue }}>
              <strong style={{ color: colors.infoText }}>Restore-Vorschau</strong>
              <br />
              Exportiert am: {restoreData.exported_at || '-'}
              <br />
              Mitglieder: {getRestoreCount('members')}
              <br />
              Beiträge: {getRestoreCount('membership_fees')}
              <br />
              Beitragsperioden: {getRestoreCount('membership_fee_periods')}
              <br />
              Beitragspositionen: {getRestoreCount('membership_fee_items')}
              <br />
              Kassa-Einträge: {getRestoreCount('cash_entries')}
              <br />
              Events: {getRestoreCount('events')}
              <br />
              Check-ins: {getRestoreCount('event_checkins')}
              <br />
              Dokumente: {getRestoreCount('documents')}
            </div>
          )}

          <button onClick={restoreFullBackup} style={buttonStyle} disabled={restoreImporting || !restoreData}>
            {restoreImporting ? 'Restore läuft...' : 'Backup wiederherstellen'}
          </button>

          <button
            onClick={() => {
              setRestoreData(null)
              setRestoreFileName('')
            }}
            style={secondaryButtonStyle}
            disabled={restoreImporting}
          >
            Restore abbrechen
          </button>
        </div>
      )}
    </section>
  )
}

function StatusCard({ title, status, label, children }) {
  return (
    <div style={{ ...statusCardStyle, borderTop: `5px solid ${getStatusColor(status)}` }}>
      <div style={statusTitleRowStyle}>
        <strong>{title}</strong>
        <span style={{ ...statusBadgeStyle, background: getStatusBackground(status), color: getStatusColor(status) }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  )
}

function getStatusColor(status) {
  if (status === 'ok') return colors.successText
  if (status === 'warning') return '#92400e'
  if (status === 'error') return colors.dangerText
  return colors.muted
}

function getStatusBackground(status) {
  if (status === 'ok') return colors.successBg
  if (status === 'warning') return '#fffbeb'
  if (status === 'error') return colors.dangerBg
  return '#f3f4f6'
}

function formatDateTime(value) {
  if (!value) return '-'

  try {
    return new Date(value).toLocaleString('de-AT')
  } catch {
    return value
  }
}

function formatBackupInfo(lastBackupInfo) {
  if (!lastBackupInfo) return 'noch nicht im Browser gespeichert'

  const filename = lastBackupInfo.filename || 'Backup JSON'
  const exportedAt = formatDateTime(lastBackupInfo.exported_at || lastBackupInfo.saved_in_browser_at)
  const version = lastBackupInfo.backup_version ? ` · Version ${lastBackupInfo.backup_version}` : ''

  return `${filename} · ${exportedAt}${version}`
}

const systemStatusHeaderStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
  flexWrap: 'wrap',
}

const systemStatusHeadingStyle = {
  ...headingStyle,
  marginBottom: 8,
}

const statusGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 12,
  marginTop: 12,
}

const statusCardStyle = {
  ...cardStyle,
  boxShadow: 'none',
  marginBottom: 0,
}

const statusTitleRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
  marginBottom: 10,
}

const statusBadgeStyle = {
  borderRadius: 999,
  padding: '4px 10px',
  fontSize: 13,
  fontWeight: 800,
  whiteSpace: 'nowrap',
}

const statusTextStyle = {
  ...mutedTextStyle,
  marginTop: 6,
  marginBottom: 6,
}

const statusListStyle = {
  ...mutedTextStyle,
  paddingLeft: 20,
  marginTop: 8,
  marginBottom: 0,
}

const warningListStyle = {
  ...statusListStyle,
  color: '#92400e',
}
