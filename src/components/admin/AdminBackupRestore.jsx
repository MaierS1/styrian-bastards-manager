import { buttonStyle, cardStyle, colors, headingStyle, inputStyle, mutedTextStyle, secondaryButtonStyle, sectionStyle } from '../../styles/appStyles'

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

        <button onClick={exportFullBackupJson} style={buttonStyle}>
          Komplett-Backup JSON
        </button>
      </div>

      <p style={mutedTextStyle}>
        Hinweis: Das JSON-Backup enthält die Dokumenten-Metadaten, aber nicht die eigentlichen hochgeladenen Dateien.
        Diese liegen weiterhin im Supabase Storage.
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
