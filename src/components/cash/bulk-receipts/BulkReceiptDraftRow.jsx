import { memo } from 'react'
import {
  buttonStyle,
  colors,
  dangerButtonStyle,
  mutedTextStyle,
  secondaryButtonStyle,
} from '../../../styles/appStyles'
import { BULK_RECEIPT_STATUSES } from '../../../services/cash/bulkReceiptTypes'
import {
  getAnalysisFieldValue,
  getAnalysisWarningSummary,
  getBulkReceiptShortIssue,
  getBulkReceiptStatusLabel,
  getBulkReceiptStatusTone,
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
  onConfirmReview,
}) {
  const statusLabel = getBulkReceiptStatusLabel(draft.status)
  const issue = getBulkReceiptShortIssue(draft)
  const isProcessing = isBulkReceiptProcessing(draft.status)
  const tone = getBulkReceiptStatusTone(draft.status)
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
          border: `1px solid ${tone.color}`,
          borderLeft: `5px solid ${tone.color}`,
          borderRadius: 10,
          background: tone.background,
          transition: 'box-shadow 140ms ease, transform 140ms ease',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile
              ? '1fr'
              : 'minmax(210px, 1.45fr) minmax(135px, 0.85fr) minmax(105px, 0.55fr) minmax(125px, 0.7fr) minmax(105px, 0.55fr) minmax(180px, 1fr) minmax(100px, 0.45fr)',
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
          <div style={{ display: 'flex', justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
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
            <DetailSection title="Analysehinweise">
              {draft.analysisWarnings?.length > 0 ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  {draft.analysisWarnings.map((warning) => (
                    <div key={`${warning.code || 'warning'}-${warning.message || ''}`} style={warningPanelStyle}>
                      <strong style={{ display: 'block' }}>{getAnalysisWarningSummary(warning)}</strong>
                      <details style={{ marginTop: 6 }}>
                        <summary style={{ cursor: 'pointer' }}>Originalanalyse anzeigen</summary>
                        <p style={{ marginBottom: 0 }}>
                          {warning.message || warning.code || 'Hinweis zur Beleganalyse'}
                        </p>
                      </details>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ ...mutedTextStyle, margin: 0 }}>Keine Analysehinweise vorhanden.</p>
              )}
            </DetailSection>

            {draft.uploadStatus === 'uploaded' ? (
              <>
                <BulkReceiptDraftEditor
                  draft={draft}
                  status={statusLabel}
                  events={events}
                  categories={categories}
                  paymentMethods={paymentMethods}
                  canEditDraft={canEditDraft}
                  onChange={onChange}
                />
                {draft.reviewMessage && (
                  <p style={{ color: colors.successText, fontWeight: 800, marginTop: 10 }}>
                    {draft.reviewMessage}
                  </p>
                )}
                <div style={detailActionsStyle}>
                  {draft.status === BULK_RECEIPT_STATUSES.NEEDS_REVIEW && (
                    <button
                      type="button"
                      onClick={() => onConfirmReview(draft.id)}
                      style={actionButtonStyle(buttonStyle)}
                      disabled={disabled}
                    >
                      ✓ Prüfung bestätigen
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onAnalyze(draft.id)}
                    style={actionButtonStyle(secondaryButtonStyle)}
                    disabled={!canAnalyzeDraft}
                    aria-label={`${draft.fileName} erneut analysieren`}
                  >
                    Neu analysieren
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(draft.id)}
                    style={actionButtonStyle(dangerButtonStyle)}
                    disabled={disabled}
                    aria-label={`${draft.fileName} entfernen`}
                  >
                    Entfernen
                  </button>
                </div>
              </>
            ) : (
              <p style={mutedTextStyle}>
                Die Belegdaten können bearbeitet werden, sobald der Upload abgeschlossen ist.
              </p>
            )}

            <details style={{ marginTop: 12 }}>
              <summary style={{ ...mutedTextStyle, cursor: 'pointer' }}>Technische Details</summary>
              {draft.storagePath && (
                <p style={{ ...mutedTextStyle, wordBreak: 'break-word', marginBottom: 0 }}>
                  Storage-Pfad: {draft.storagePath}
                </p>
              )}
              {getAnalysisFieldValue(draft.analysisResult, 'invoiceNumber') && (
                <p style={{ ...mutedTextStyle, wordBreak: 'break-word', marginBottom: 0 }}>
                  Rechnungsnummer: {getAnalysisFieldValue(draft.analysisResult, 'invoiceNumber')}
                </p>
              )}
            </details>
          </div>
        )}
      </div>
    </>
  )
})

function DetailSection({ title, children }) {
  return (
    <section style={{ marginBottom: 14 }}>
      <strong style={{ display: 'block', color: colors.black, marginBottom: 8 }}>{title}</strong>
      {children}
    </section>
  )
}

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
  const tone = getBulkReceiptStatusTone(status)
  const baseText = status === BULK_RECEIPT_STATUSES.READY ? 'Bereit' : label
  const text = status === BULK_RECEIPT_STATUSES.SAVED ? `✓ ${baseText}` : baseText

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        width: 'fit-content',
        borderRadius: 999,
        border: `1px solid ${tone.color}`,
        padding: '4px 10px',
        color: tone.color,
        background: tone.background,
        fontWeight: 800,
        fontSize: 13,
      }}
    >
      {isProcessing && <span aria-hidden="true" style={spinnerStyle} />}
      {text}
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

const detailActionsStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  marginTop: 12,
  paddingTop: 12,
  borderTop: `1px solid ${colors.border}`,
}

const warningPanelStyle = {
  border: '1px solid #9a3412',
  borderRadius: 8,
  background: '#fff7ed',
  color: '#9a3412',
  padding: 10,
}

function actionButtonStyle(baseStyle) {
  return {
    ...baseStyle,
    margin: 0,
    width: 'auto',
  }
}

function getIssueColor(status) {
  return status === BULK_RECEIPT_STATUSES.ERROR ? colors.dangerText : '#9a3412'
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
