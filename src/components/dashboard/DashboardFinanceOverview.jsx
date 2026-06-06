import { cardStyle, colors, dashboardLabelStyle, headingStyle, mutedTextStyle, secondaryButtonStyle } from '../../styles/appStyles'

export function DashboardFinanceOverview({ financeData, financeHealthStatus, getCategorySummary, onNavigate }) {
  const safeFinanceData = financeData || {}
  const safeEventSummaries = Array.isArray(safeFinanceData.eventSummaries) ? safeFinanceData.eventSummaries : []
  const safeGetCategorySummary = typeof getCategorySummary === 'function' ? getCategorySummary : () => []
  const categorySummaryResult = safeGetCategorySummary()
  const categorySummary = Array.isArray(categorySummaryResult) ? categorySummaryResult : []
  const safeFinanceHealthStatus = financeHealthStatus || { label: 'Unbekannt', color: colors.muted }

  return (
    <div style={{ ...cardStyle, borderTop: `6px solid ${colors.blue}` }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <strong style={dashboardLabelStyle}>Jahresübersicht</strong>
          <p style={{ ...mutedTextStyle, marginTop: 8, marginBottom: 0 }}>
            Kompakter Finanzstatus mit Fokus auf Kassa, Ergebnis und Top-Event-Werte.
          </p>
        </div>

        <span style={{ color: safeFinanceHealthStatus.color, fontWeight: 900 }}>
          {safeFinanceHealthStatus.label}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 14 }}>
        <div style={cardStyle}>
          <strong>Offene Beiträge</strong>
          <br />
          {(safeFinanceData.openFeesCount || 0)} offen · {(safeFinanceData.openFeesTotal || 0).toFixed(2)} EUR
        </div>

        <div style={cardStyle}>
          <strong>Jahresergebnis</strong>
          <br />
          Einnahmen {(safeFinanceData.incomeTotal || 0).toFixed(2)} EUR · Ausgaben {(safeFinanceData.expenseTotal || 0).toFixed(2)} EUR
          <br />
          <strong>{(safeFinanceData.balance || 0).toFixed(2)} EUR</strong>
        </div>
      </div>

      <h3 style={headingStyle}>Top Event-Ergebnisse</h3>

      {safeEventSummaries.length === 0 ? (
        <p style={mutedTextStyle}>Noch keine Event-Finanzdaten vorhanden.</p>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {safeEventSummaries.slice(0, 3).map((event, index) => {
            const eventItem = event || {}

            return (
              <div key={eventItem.id || index} style={cardStyle}>
                <strong>{eventItem.name || 'Event'}</strong> · {eventItem.date || '-'}
                <br />
                Einnahmen: {(eventItem.income || 0).toFixed(2)} EUR · Ausgaben: {(eventItem.expense || 0).toFixed(2)} EUR · Ergebnis:{' '}
                <strong style={{ color: (eventItem.balance || 0) >= 0 ? colors.successText : colors.red }}>
                  {(eventItem.balance || 0).toFixed(2)} EUR
                </strong>
              </div>
            )
          })}
        </div>
      )}

      {safeEventSummaries.length > 3 && (
        <button type="button" onClick={() => onNavigate?.('cash')} style={{ ...secondaryButtonStyle, width: 'auto', marginTop: 10 }}>
          Alle anzeigen
        </button>
      )}

      <h3 style={headingStyle}>Kategorien kompakt</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
        {categorySummary.slice(0, 5).map((item, index) => {
          const categoryItem = item || {}

          return (
            <div key={categoryItem.category || index} style={cardStyle}>
              <strong>{categoryItem.category || 'Kategorie'}</strong>
              <div style={mutedTextStyle}>Einnahmen: {(categoryItem.income || 0).toFixed(2)} EUR</div>
              <div style={mutedTextStyle}>Ausgaben: {(categoryItem.expense || 0).toFixed(2)} EUR</div>
              <div>
                Ergebnis:{' '}
                <strong style={{ color: (categoryItem.balance || 0) >= 0 ? colors.successText : colors.red }}>
                  {(categoryItem.balance || 0).toFixed(2)} EUR
                </strong>
              </div>
            </div>
          )
        })}
      </div>

      {categorySummary.length > 5 && (
        <button type="button" onClick={() => onNavigate?.('cash')} style={{ ...secondaryButtonStyle, width: 'auto', marginTop: 10 }}>
          Alle anzeigen
        </button>
      )}
    </div>
  )
}
