import {
  colors,
  inputStyle,
  mutedTextStyle,
  secondaryButtonStyle,
} from '../../styles/appStyles'

export function BulkReceiptDraftItem({
  draft,
  status,
  statusStyle,
  events,
  categories,
  paymentMethods,
  disabled,
  isMobile,
  formatFileSize,
  analysisDisabled,
  onChange,
  onRemove,
  onToggle,
  onAnalyze,
}) {
  const canEditDraft = !disabled && draft.uploadStatus === 'uploaded'
  const canAnalyzeDraft = draft.uploadStatus === 'uploaded'
    && Boolean(draft.storagePath)
    && !analysisDisabled
    && draft.analysisStatus !== 'analyzing'
  const analysisStatusLabel = getAnalysisStatusLabel(draft.analysisStatus)
  const analysisButtonLabel = draft.analysisStatus === 'completed' || draft.analysisStatus === 'error'
    ? 'Erneut analysieren'
    : 'Beleg analysieren'

  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        padding: 10,
        background: status === 'Fehler' ? colors.dangerBg : status === 'Bereit zur Verbuchung' ? colors.successBg : colors.white,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(220px, 1fr) 120px 160px 160px',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <span style={{ fontWeight: 800, wordBreak: 'break-word' }}>{draft.fileName}</span>
        <span>{formatFileSize(draft.fileSize)}</span>
        <span>{draft.fileType || '-'}</span>
        <span style={statusStyle}>{status}</span>
      </div>

      {draft.uploadStatus === 'uploading' && (
        <p style={mutedTextStyle}>Upload läuft...</p>
      )}

      {draft.storagePath && (
        <p style={{ ...mutedTextStyle, wordBreak: 'break-word' }}>
          Gespeichert als: {draft.storagePath}
        </p>
      )}

      {draft.error && (
        <p style={{ color: colors.dangerText }}>{draft.error}</p>
      )}

      {draft.uploadStatus === 'uploaded' && (
        <div style={{ marginTop: 8 }}>
          <p style={getAnalysisStatusStyle(draft.analysisStatus)}>
            {analysisStatusLabel}
          </p>

          {draft.analysisError && (
            <p style={{ color: colors.dangerText }}>{draft.analysisError}</p>
          )}

          {draft.analysisWarnings?.length > 0 && (
            <ul style={{ color: colors.infoText, marginTop: 8 }}>
              {draft.analysisWarnings.map((warning) => (
                <li key={`${warning.code || 'warning'}-${warning.message || ''}`}>
                  {warning.message || warning.code || 'Hinweis zur Beleganalyse'}
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={() => onAnalyze(draft.id)}
            style={secondaryButtonStyle}
            disabled={!canAnalyzeDraft}
          >
            {analysisButtonLabel}
          </button>
        </div>
      )}

      {draft.validationErrors.length > 0 && draft.uploadStatus === 'uploaded' && (
        <ul style={{ color: colors.dangerText, marginTop: 8 }}>
          {draft.validationErrors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      <button type="button" onClick={() => onToggle(draft.id)} style={secondaryButtonStyle} disabled={disabled}>
        {draft.isExpanded ? 'Prüfmaske schließen' : 'Prüfmaske öffnen'}
      </button>
      <button type="button" onClick={() => onRemove(draft.id)} style={secondaryButtonStyle} disabled={disabled}>
        Entfernen
      </button>

      {draft.isExpanded && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(180px, 1fr))',
            gap: 10,
            marginTop: 10,
          }}
        >
          <label>
            Belegdatum
            <input
              type="date"
              value={draft.date}
              onChange={(event) => onChange(draft.id, 'date', event.target.value)}
              style={inputStyle}
              disabled={!canEditDraft}
            />
          </label>

          <label>
            Typ
            <select
              value={draft.type}
              onChange={(event) => onChange(draft.id, 'type', event.target.value)}
              style={inputStyle}
              disabled={!canEditDraft}
            >
              <option value="einnahme">Einnahme</option>
              <option value="ausgabe">Ausgabe</option>
            </select>
          </label>

          <label>
            Kategorie
            <select
              value={draft.category}
              onChange={(event) => onChange(draft.id, 'category', event.target.value)}
              style={inputStyle}
              disabled={!canEditDraft}
            >
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Zahlungsart
            <select
              value={draft.paymentMethod}
              onChange={(event) => onChange(draft.id, 'paymentMethod', event.target.value)}
              style={inputStyle}
              disabled={!canEditDraft}
            >
              {paymentMethods.map((paymentMethod) => (
                <option key={paymentMethod.value} value={paymentMethod.value}>
                  {paymentMethod.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Event-Zuordnung
            <select
              value={draft.eventId}
              onChange={(event) => onChange(draft.id, 'eventId', event.target.value)}
              style={inputStyle}
              disabled={!canEditDraft}
            >
              <option value="">Keinem Event zuordnen</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} · {event.event_date}
                </option>
              ))}
            </select>
          </label>

          <label>
            Betrag
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.amount}
              onChange={(event) => onChange(draft.id, 'amount', event.target.value)}
              style={inputStyle}
              disabled={!canEditDraft}
            />
          </label>

          <label style={{ gridColumn: '1 / -1' }}>
            Beschreibung
            <input
              value={draft.description}
              onChange={(event) => onChange(draft.id, 'description', event.target.value)}
              style={inputStyle}
              disabled={!canEditDraft}
            />
          </label>

          {status === 'Bereit zur Verbuchung' && (
            <p style={{ color: colors.successText, fontWeight: 800, gridColumn: '1 / -1' }}>
              Dieser Beleg ist lokal geprüft und kann verbucht werden.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function getAnalysisStatusLabel(status) {
  if (status === 'analyzing') return 'Wird analysiert ...'
  if (status === 'completed') return 'Analyse abgeschlossen'
  if (status === 'error') return 'Analyse fehlgeschlagen'

  return 'Nicht analysiert'
}

function getAnalysisStatusStyle(status) {
  if (status === 'completed') {
    return { color: colors.successText, fontWeight: 800, marginBottom: 6 }
  }

  if (status === 'error') {
    return { color: colors.dangerText, fontWeight: 800, marginBottom: 6 }
  }

  if (status === 'analyzing') {
    return { color: colors.infoText, fontWeight: 800, marginBottom: 6 }
  }

  return { ...mutedTextStyle, marginBottom: 6 }
}
