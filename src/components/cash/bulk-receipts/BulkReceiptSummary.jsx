import { colors, mutedTextStyle } from '../../../styles/appStyles'
import { BULK_RECEIPT_STATUSES } from '../../../services/cash/bulkReceiptTypes'
import {
  getBulkReceiptDashboard,
  getBulkReceiptProgressHint,
} from './bulkReceiptUiUtils'

export function BulkReceiptSummary({ summary, progress }) {
  if (!summary.total) return null

  const dashboard = getBulkReceiptDashboard(summary)
  const cards = [
    {
      key: 'processing',
      count: dashboard.processing,
      label: 'In Verarbeitung',
      description: 'Upload oder Analyse läuft',
      icon: 'activity',
      tone: BULK_RECEIPT_STATUSES.ANALYZING,
    },
    {
      key: 'ready',
      count: dashboard.ready,
      label: 'Bereit',
      description: 'Kann verbucht werden',
      icon: 'check',
      tone: BULK_RECEIPT_STATUSES.READY,
    },
    {
      key: 'needsReview',
      count: dashboard.needsReview,
      label: 'Prüfung erforderlich',
      description: 'Felder oder Hinweise prüfen',
      icon: 'review',
      tone: BULK_RECEIPT_STATUSES.NEEDS_REVIEW,
    },
    {
      key: 'error',
      count: dashboard.error,
      label: 'Fehler',
      description: 'Technisch fehlgeschlagen',
      icon: 'error',
      tone: BULK_RECEIPT_STATUSES.ERROR,
    },
  ]

  return (
    <div style={{ display: 'grid', gap: 14, marginTop: 16, marginBottom: 14 }} aria-live="polite">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 10,
        }}
      >
        {cards.map((card) => (
          <StatusDashboardCard key={card.key} {...card} />
        ))}
      </div>

      <div
        style={{
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          padding: 14,
          background: colors.white,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', marginBottom: 8 }}>
          <strong style={{ color: colors.black, fontSize: 18 }}>Gesamtfortschritt</strong>
          <strong style={{ color: colors.blue, fontSize: 24 }}>{progress.percent} %</strong>
        </div>
        <div
          aria-label={`Verarbeitung ${progress.percent} Prozent`}
          style={{
            height: 18,
            borderRadius: 999,
            background: colors.offWhite,
            border: `1px solid ${colors.border}`,
            overflow: 'hidden',
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: `${progress.percent}%`,
              height: '100%',
              background: getProgressColor(dashboard),
              transition: 'width 160ms ease',
            }}
          />
        </div>
        <p style={mutedTextStyle}>
          {progress.processed} von {progress.total} Belegen verarbeitet · {getBulkReceiptProgressHint(summary)}
        </p>
      </div>
    </div>
  )
}

function StatusDashboardCard({ count, label, description, icon, tone }) {
  return (
    <div
      style={{
        border: `1px solid ${getToneColor(tone)}`,
        borderLeft: `6px solid ${getToneColor(tone)}`,
        borderRadius: 10,
        padding: 12,
        background: getToneBackground(tone),
        minHeight: 112,
        display: 'grid',
        alignContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
        <span
          aria-hidden="true"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            display: 'grid',
            placeItems: 'center',
            border: `1px solid ${getToneColor(tone)}`,
            color: getToneColor(tone),
            background: colors.white,
            fontSize: 11,
            fontWeight: 900,
          }}
        >
          <DashboardIcon name={icon} />
        </span>
        <strong style={{ color: getToneColor(tone), fontSize: 30, lineHeight: 1 }}>{count}</strong>
      </div>
      <div>
        <strong style={{ display: 'block', color: colors.black }}>{label}</strong>
        <span style={{ ...mutedTextStyle, fontSize: 13 }}>{description}</span>
      </div>
    </div>
  )
}

function DashboardIcon({ name }) {
  if (name === 'check') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'review') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 8v5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M12 17h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M10.3 4.8L3.4 17.2A2 2 0 0 0 5.1 20h13.8a2 2 0 0 0 1.7-2.8L13.7 4.8a2 2 0 0 0-3.4 0z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'error') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 8v5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M12 17h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }

  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 13a8 8 0 0 1 13.7-5.7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M17.7 7.3H14V3.6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 11a8 8 0 0 1-13.7 5.7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M6.3 16.7H10v3.7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function getProgressColor(dashboard) {
  if (dashboard.error > 0) return colors.dangerText
  if (dashboard.needsReview > 0) return colors.infoText
  return colors.successText
}

function getToneColor(status) {
  if (status === BULK_RECEIPT_STATUSES.READY) return colors.successText
  if (status === BULK_RECEIPT_STATUSES.ERROR) return colors.dangerText
  if (status === BULK_RECEIPT_STATUSES.NEEDS_REVIEW) return colors.infoText
  return colors.blue
}

function getToneBackground(status) {
  if (status === BULK_RECEIPT_STATUSES.READY) return colors.successBg
  if (status === BULK_RECEIPT_STATUSES.ERROR) return colors.dangerBg
  if (status === BULK_RECEIPT_STATUSES.NEEDS_REVIEW) return colors.infoBg
  return colors.offWhite
}
