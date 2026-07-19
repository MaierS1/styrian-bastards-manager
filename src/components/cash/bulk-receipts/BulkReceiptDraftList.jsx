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
}) {
  if (drafts.length === 0) {
    return null
  }

  return (
    <div style={{ display: 'grid', gap: 8 }} aria-label="Beleg-Queue">
      {!isMobile && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(210px, 1.45fr) minmax(135px, 0.85fr) minmax(105px, 0.55fr) minmax(125px, 0.7fr) minmax(105px, 0.55fr) minmax(180px, 1fr) minmax(170px, 0.85fr)',
            gap: 10,
            padding: '0 12px',
            color: colors.muted,
            fontSize: 12,
            fontWeight: 800,
            textTransform: 'uppercase',
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
        />
      ))}
    </div>
  )
}
