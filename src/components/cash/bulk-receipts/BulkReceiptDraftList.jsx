import { mutedTextStyle } from '../../../styles/appStyles'
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
    return (
      <p style={mutedTextStyle}>
        Wähle mehrere Belege aus, um die Queue zu starten.
      </p>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
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
