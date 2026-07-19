import { colors } from '../../../styles/appStyles'
import { BulkReceiptDraftRow } from './BulkReceiptDraftRow'

export function BulkReceiptDraftList({
  drafts,
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
  if (drafts.length === 0) {
    return null
  }

  return (
    <div style={queueRootStyle} aria-label="Beleg-Queue">
      {!isMobile && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(150px, 1.45fr) minmax(110px, 0.8fr) minmax(86px, 0.52fr) minmax(105px, 0.7fr) minmax(86px, 0.5fr) minmax(130px, 1fr) minmax(86px, 0.38fr)',
            gap: 10,
            padding: '0 12px',
            color: colors.muted,
            fontSize: 12,
            fontWeight: 800,
            textTransform: 'uppercase',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
          }}
        >
          <span>Beleg</span>
          <span>Status</span>
          <span>Datum</span>
          <span>Kategorie</span>
          <span>Betrag</span>
          <span>Problem</span>
          <span style={{ textAlign: 'right' }}>Aktionen</span>
        </div>
      )}
      {drafts.map((draft) => (
        <BulkReceiptDraftRow
          key={draft.id}
          draft={draft}
          events={events}
          categories={categories}
          paymentMethods={paymentMethods}
          disabled={disabled}
          isMobile={isMobile}
          formatFileSize={formatFileSize}
          analysisDisabled={analysisDisabled}
          onChange={onChange}
          onRemove={onRemove}
          onToggle={onToggle}
          onAnalyze={onAnalyze}
          onConfirmReview={onConfirmReview}
        />
      ))}
    </div>
  )
}

const queueRootStyle = {
  display: 'grid',
  gap: 8,
  paddingTop: 14,
  borderTop: `1px solid ${colors.border}`,
  width: '100%',
  maxWidth: '100%',
  boxSizing: 'border-box',
  overflow: 'hidden',
}
