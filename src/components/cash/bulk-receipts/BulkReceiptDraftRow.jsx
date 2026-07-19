import { memo } from 'react'
import {
  colors,
  mutedTextStyle,
  secondaryButtonStyle,
} from '../../../styles/appStyles'
import { BULK_RECEIPT_STATUSES } from '../../../services/cash/bulkReceiptTypes'
import {
  getBulkReceiptShortIssue,
  getBulkReceiptStatusLabel,
  isBulkReceiptProcessing,
} from './bulkReceiptUiUtils'
import { BulkReceiptDraftEditor } from './BulkReceiptDraftEditor'

export const BulkReceiptDraftRow = memo(function BulkReceiptDraftRow({
  draft,
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
  const statusLabel = getBulkReceiptStatusLabel(draft.status)
  const issue = getBulkReceiptShortIssue(draft)
  const canEditDraft = !disabled && draft.uploadStatus === 'uploaded'
  const canAnalyzeDraft = draft.uploadStatus === 'uploaded'
    && Boolean(draft.storagePath)
    && !analysisDisabled
    && draft.analysisStatus !== 'analyzing'
  const isProcessing = isBulkReceiptProcessing(draft.status)

  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        padding: 10,
        background: getRowBackground(draft.status),
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile
            ? '1fr'
            : 'minmax(180px, 1.4fr) minmax(110px, 0.7fr) minmax(90px, 0.45fr) minmax(105px, 0.5fr) minmax(110px, 0.55fr) minmax(190px, 0.8fr)',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <strong style={{ display: 'block', wordBreak: 'break-word' }}>{draft.fileName}</strong>
          <span style={{ ...mutedTextStyle, fontSize: 13 }}>
            {formatFileSize(draft.fileSize)}
            {draft.fileType ? ` · ${draft.fileType}` : ''}
          </span>
        </div>

        <StatusBadge status={draft.status} label={statusLabel} isProcessing={isProcessing} />
        <span>{draft.amount ? `${draft.amount} €` : '-'}</span>
        <span>{draft.date || '-'}</span>
        <span>{draft.category || '-'}</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => onToggle(draft.id)} style={smallButtonStyle} disabled={disabled}>
            {draft.isExpanded ? 'Schließen' : 'Öffnen'}
          </button>
          <button type="button" onClick={() => onAnalyze(draft.id)} style={smallButtonStyle} disabled={!canAnalyzeDraft}>
            {draft.analysisStatus === 'completed' || draft.analysisStatus === 'error' ? 'Neu analysieren' : 'Analysieren'}
          </button>
          <button type="button" onClick={() => onRemove(draft.id)} style={smallButtonStyle} disabled={disabled}>
            Entfernen
          </button>
        </div>
      </div>

      {issue && (
        <p style={{ color: getIssueColor(draft.status), marginTop: 8, marginBottom: 0 }}>
          {issue}
        </p>
      )}

      {draft.storagePath && draft.isExpanded && (
        <p style={{ ...mutedTextStyle, wordBreak: 'break-word', marginBottom: 0 }}>
          Gespeichert als: {draft.storagePath}
        </p>
      )}

      {draft.isExpanded && draft.uploadStatus === 'uploaded' && (
        <div aria-live={isProcessing ? 'polite' : undefined}>
          {draft.analysisWarnings?.length > 0 && (
            <ul style={{ color: colors.infoText, marginTop: 8 }}>
              {draft.analysisWarnings.map((warning) => (
                <li key={`${warning.code || 'warning'}-${warning.message || ''}`}>
                  {warning.message || warning.code || 'Hinweis zur Beleganalyse'}
                </li>
              ))}
            </ul>
          )}

          {draft.validationErrors.length > 0 && (
            <ul style={{ color: colors.dangerText, marginTop: 8 }}>
              {draft.validationErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}

          <BulkReceiptDraftEditor
            draft={draft}
            status={statusLabel}
            events={events}
            categories={categories}
            paymentMethods={paymentMethods}
            canEditDraft={canEditDraft}
            onChange={onChange}
          />
        </div>
      )}
    </div>
  )
})

const smallButtonStyle = {
  ...secondaryButtonStyle,
  padding: '8px 10px',
  fontSize: 13,
  margin: 0,
  width: 'auto',
}

function StatusBadge({ status, label, isProcessing }) {
  return (
    <span
      aria-live={isProcessing ? 'polite' : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        width: 'fit-content',
        borderRadius: 999,
        border: `1px solid ${getStatusColor(status)}`,
        padding: '3px 9px',
        color: getStatusColor(status),
        fontWeight: 800,
        fontSize: 13,
      }}
    >
      {isProcessing && <span aria-hidden="true" style={spinnerStyle} />}
      {label}
    </span>
  )
}

function getRowBackground(status) {
  if (status === BULK_RECEIPT_STATUSES.READY) return colors.successBg
  if (status === BULK_RECEIPT_STATUSES.ERROR) return colors.dangerBg
  return colors.white
}

function getIssueColor(status) {
  return status === BULK_RECEIPT_STATUSES.ERROR ? colors.dangerText : colors.infoText
}

function getStatusColor(status) {
  if (status === BULK_RECEIPT_STATUSES.READY || status === BULK_RECEIPT_STATUSES.SAVED) return colors.successText
  if (status === BULK_RECEIPT_STATUSES.ERROR) return colors.dangerText
  if (status === BULK_RECEIPT_STATUSES.NEEDS_REVIEW) return colors.infoText
  if (isBulkReceiptProcessing(status)) return colors.infoText
  return colors.muted
}

const spinnerStyle = {
  width: 10,
  height: 10,
  borderRadius: '50%',
  border: `2px solid ${colors.border}`,
  borderTopColor: colors.infoText,
  display: 'inline-block',
}
