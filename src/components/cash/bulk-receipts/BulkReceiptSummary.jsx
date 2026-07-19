import { colors, mutedTextStyle } from '../../../styles/appStyles'
import {
  BULK_RECEIPT_STATUSES,
  BULK_RECEIPT_STATUS_LABELS,
} from '../../../services/cash/bulkReceiptTypes'

const summaryOrder = [
  BULK_RECEIPT_STATUSES.WAITING,
  BULK_RECEIPT_STATUSES.UPLOADING,
  BULK_RECEIPT_STATUSES.ANALYZING,
  BULK_RECEIPT_STATUSES.READY,
  BULK_RECEIPT_STATUSES.NEEDS_REVIEW,
  BULK_RECEIPT_STATUSES.ERROR,
  BULK_RECEIPT_STATUSES.SAVED,
]

export function BulkReceiptSummary({ summary, progress }) {
  if (!summary.total) {
    return (
      <p style={mutedTextStyle}>
        Noch keine Belege ausgewählt.
      </p>
    )
  }

  return (
    <div style={{ marginTop: 12, marginBottom: 12 }} aria-live="polite">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        <SummaryPill label="Gesamt" value={summary.total} />
        {summaryOrder.map((status) => {
          const count = summary.countsByStatus[status] || 0
          if (count === 0) return null

          return (
            <SummaryPill
              key={status}
              label={BULK_RECEIPT_STATUS_LABELS[status]}
              value={count}
              tone={status}
            />
          )
        })}
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
          <span style={{ fontWeight: 800 }}>Verarbeitung</span>
          <span style={mutedTextStyle}>
            {progress.processed} von {progress.total} verarbeitet · {progress.percent} %
          </span>
        </div>
        <div
          aria-label={`Verarbeitung ${progress.percent} Prozent`}
          style={{
            height: 10,
            borderRadius: 999,
            background: colors.offWhite,
            border: `1px solid ${colors.border}`,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress.percent}%`,
              height: '100%',
              background: colors.blue,
            }}
          />
        </div>
      </div>
    </div>
  )
}

function SummaryPill({ label, value, tone = '' }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        border: `1px solid ${getToneColor(tone)}`,
        borderRadius: 999,
        padding: '4px 10px',
        fontSize: 13,
        fontWeight: 800,
        color: getToneColor(tone),
        background: colors.white,
      }}
    >
      {label}: {value}
    </span>
  )
}

function getToneColor(status) {
  if (status === BULK_RECEIPT_STATUSES.READY || status === BULK_RECEIPT_STATUSES.SAVED) {
    return colors.successText
  }

  if (status === BULK_RECEIPT_STATUSES.ERROR) return colors.dangerText
  if (status === BULK_RECEIPT_STATUSES.UPLOADING || status === BULK_RECEIPT_STATUSES.ANALYZING) return colors.infoText

  return colors.muted
}
