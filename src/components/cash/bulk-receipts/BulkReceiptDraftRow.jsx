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
  shortenReceiptFileName,
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
  const isProcessing = isBulkReceiptProcessing(draft.status)
  const canEditDraft = !disabled && draft.uploadStatus === 'uploaded'
  const canAnalyzeDraft = draft.uploadStatus === 'uploaded'
    && Boolean(draft.storagePath)
    && !analysisDisabled
    && !isProcessing
    && draft.analysisStatus !== 'analyzing'

  return (
    <>
      <style>
        {`
          @keyframes bulkReceiptSpin { to { transform: rotate(360deg); } }
          .bulk-receipt-row:hover { box-shadow: 0 10px 26px rgba(15, 23, 42, 0.08); transform: translateY(-1px); }
        `}
      </style>
      <div
        className="bulk-receipt-row"
        style={{
          border: `1px solid ${getRowBorder(draft.status)}`,
          borderLeft: `5px solid ${getStatusColor(draft.status)}`,
          borderRadius: 10,
          background: getRowBackground(draft.status),
          transition: 'box-shadow 140ms ease, transform 140ms ease',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile
              ? '1fr'
              : 'minmax(210px, 1.45fr) minmax(135px, 0.85fr) minmax(105px, 0.55fr) minmax(125px, 0.7fr) minmax(105px, 0.55fr) minmax(180px, 1fr) minmax(170px, 0.85fr)',
            gap: isMobile ? 8 : 10,
            alignItems: 'center',
            padding: 12,
          }}
          aria-live={isProcessing ? 'polite' : undefined}
        >
          <div style={{ minWidth: 0 }}>
            <strong
              title={draft.fileName}
              style={{
                display: 'block',
                color: colors.black,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {shortenReceiptFileName(draft.fileName, isMobile ? 36 : 48)}
            </strong>
            <span style={{ ...mutedTextStyle, fontSize: 12 }}>
              {formatFileSize(draft.fileSize)}
              {draft.fileType ? ` · ${draft.fileType}` : ''}
            </span>
          </div>

          <MobileField label="Status" isMobile={isMobile}>
            <StatusBadge status={draft.status} label={statusLabel} isProcessing={isProcessing} />
          </MobileField>
          <MobileField label="Datum" isMobile={isMobile}>
            <span>{draft.date || '-'}</span>
          </MobileField>
          <MobileField label="Kategorie" isMobile={isMobile}>
            <span>{draft.category || '-'}</span>
          </MobileField>
          <MobileField label="Betrag" isMobile={isMobile}>
            <strong style={{ color: colors.black, fontSize: 16 }}>
              {draft.amount ? `${draft.amount} €` : '-'}
            </strong>
          </MobileField>
          <MobileField label="Problem" isMobile={isMobile}>
            <span
              title={issue}
              style={{
                color: issue ? getIssueColor(draft.status) : colors.muted,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'block',
              }}
            >
              {issue || 'Keine offenen Hinweise'}
            </span>
          </MobileField>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              justifyContent: isMobile ? 'flex-start' : 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={() => onToggle(draft.id)}
              style={smallButtonStyle}
              disabled={disabled}
              aria-expanded={draft.isExpanded}
              aria-label={draft.isExpanded ? `${draft.fileName} schließen` : `${draft.fileName} öffnen`}
            >
              {draft.isExpanded ? 'Schließen' : 'Öffnen'}
            </button>
            <button
              type="button"
              onClick={() => onAnalyze(draft.id)}
              style={smallButtonStyle}
              disabled={!canAnalyzeDraft}
              aria-label={`${draft.fileName} erneut analysieren`}
            >
              Neu analysieren
            </button>
            <button
              type="button"
              onClick={() => onRemove(draft.id)}
              style={smallButtonStyle}
              disabled={disabled}
              aria-label={`${draft.fileName} entfernen`}
            >
              Entfernen
            </button>
          </div>
        </div>

        {draft.isExpanded && (
          <div
            style={{
              borderTop: `1px solid ${colors.border}`,
              background: colors.white,
              padding: 14,
            }}
          >
            {draft.analysisWarnings?.length > 0 && (
              <div
                style={{
                  border: `1px solid ${colors.infoText}`,
                  borderRadius: 8,
                  background: colors.infoBg,
                  color: colors.infoText,
                  padding: 10,
                  marginBottom: 12,
                }}
              >
                <strong style={{ display: 'block', marginBottom: 4 }}>Analysehinweise</strong>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {draft.analysisWarnings.map((warning) => (
                    <li key={`${warning.code || 'warning'}-${warning.message || ''}`}>
                      {warning.message || warning.code || 'Hinweis zur Beleganalyse'}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {draft.uploadStatus === 'uploaded' ? (
              <BulkReceiptDraftEditor
                draft={draft}
                status={statusLabel}
                events={events}
                categories={categories}
                paymentMethods={paymentMethods}
                canEditDraft={canEditDraft}
                onChange={onChange}
              />
            ) : (
              <p style={mutedTextStyle}>
                Die Belegdaten können bearbeitet werden, sobald der Upload abgeschlossen ist.
              </p>
            )}

            {draft.storagePath && (
              <details style={{ marginTop: 12 }}>
                <summary style={{ ...mutedTextStyle, cursor: 'pointer' }}>Technische Details</summary>
                <p style={{ ...mutedTextStyle, wordBreak: 'break-word', marginBottom: 0 }}>
                  Storage-Pfad: {draft.storagePath}
                </p>
              </details>
            )}
          </div>
        )}
      </div>
    </>
  )
})

function MobileField({ label, isMobile, children }) {
  if (!isMobile) return children

  return (
    <div style={{ display: 'grid', gap: 2 }}>
      <span style={{ ...mutedTextStyle, fontSize: 12, fontWeight: 800 }}>{label}</span>
      {children}
    </div>
  )
}

function StatusBadge({ status, label, isProcessing }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        width: 'fit-content',
        borderRadius: 999,
        border: `1px solid ${getStatusColor(status)}`,
        padding: '4px 10px',
        color: getStatusColor(status),
        background: colors.white,
        fontWeight: 800,
        fontSize: 13,
      }}
    >
      {isProcessing && <span aria-hidden="true" style={spinnerStyle} />}
      {label}
    </span>
  )
}

const smallButtonStyle = {
  ...secondaryButtonStyle,
  padding: '8px 10px',
  fontSize: 13,
  margin: 0,
  width: 'auto',
}

function getRowBorder(status) {
  if (isBulkReceiptProcessing(status)) return colors.infoText
  if (status === BULK_RECEIPT_STATUSES.READY || status === BULK_RECEIPT_STATUSES.SAVED) return colors.successText
  if (status === BULK_RECEIPT_STATUSES.ERROR) return colors.dangerText
  return colors.border
}

function getRowBackground(status) {
  if (isBulkReceiptProcessing(status)) return colors.infoBg
  if (status === BULK_RECEIPT_STATUSES.READY || status === BULK_RECEIPT_STATUSES.SAVED) return colors.successBg
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
  width: 12,
  height: 12,
  borderRadius: '50%',
  border: `2px solid ${colors.border}`,
  borderTopColor: colors.infoText,
  display: 'inline-block',
  animation: 'bulkReceiptSpin 850ms linear infinite',
}
