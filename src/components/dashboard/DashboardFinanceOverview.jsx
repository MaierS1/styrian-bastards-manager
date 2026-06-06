import { cardStyle, colors, dashboardLabelStyle, headingStyle, mutedTextStyle, secondaryButtonStyle } from '../../styles/appStyles'

export function DashboardFinanceOverview({ financeData, financeHealthStatus, getCategorySummary, onNavigate }) {
  const categorySummary = getCategorySummary()

  return (
    <div style={{ ...cardStyle, borderTop: `6px solid ${colors.blue}` }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <strong style={dashboardLabelStyle}>Jahresübersicht</strong>
          <p style={{ ...mutedTextStyle, marginTop: 8, marginBottom: 0 }}>
            Kompakter Finanzstatus mit Fokus auf Kassa, Ergebnis und Top-Event-Werte.
          </p>
        </div>

        <span style={{ color: financeHealthStatus.color, fontWeight: 900 }}>
          {financeHealthStatus.label}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 14 }}>
        <div style={cardStyle}>
          <strong>Offene Beiträge</strong>
          <br />
          {financeData.openFeesCount} offen · {financeData.openFeesTotal.toFixed(2)} EUR
        </div>

        <div style={cardStyle}>
          <strong>Jahresergebnis</strong>
          <br />
          Einnahmen {financeData.incomeTotal.toFixed(2)} EUR · Ausgaben {financeData.expenseTotal.toFixed(2)} EUR
          <br />
          <strong>{financeData.balance.toFixed(2)} EUR</strong>
        </div>
      </div>

      <h3 style={headingStyle}>Top Event-Ergebnisse</h3>

      {financeData.eventSummaries.length === 0 ? (
        <p style={mutedTextStyle}>Noch keine Event-Finanzdaten vorhanden.</p>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {financeData.eventSummaries.slice(0, 3).map((event) => (
            <div key={event.id} style={cardStyle}>
              <strong>{event.name}</strong> · {event.date || '-'}
              <br />
              Einnahmen: {event.income.toFixed(2)} EUR · Ausgaben: {event.expense.toFixed(2)} EUR · Ergebnis:{' '}
              <strong style={{ color: event.balance >= 0 ? colors.successText : colors.red }}>
                {event.balance.toFixed(2)} EUR
              </strong>
            </div>
          ))}
        </div>
      )}

      {financeData.eventSummaries.length > 3 && (
        <button type="button" onClick={() => onNavigate?.('cash')} style={{ ...secondaryButtonStyle, width: 'auto', marginTop: 10 }}>
          Alle anzeigen
        </button>
      )}

      <h3 style={headingStyle}>Kategorien kompakt</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
        {categorySummary.slice(0, 5).map((item) => (
          <div key={item.category} style={cardStyle}>
            <strong>{item.category}</strong>
            <div style={mutedTextStyle}>Einnahmen: {item.income.toFixed(2)} EUR</div>
            <div style={mutedTextStyle}>Ausgaben: {item.expense.toFixed(2)} EUR</div>
            <div>
              Ergebnis:{' '}
              <strong style={{ color: item.balance >= 0 ? colors.successText : colors.red }}>
                {item.balance.toFixed(2)} EUR
              </strong>
            </div>
          </div>
        ))}
      </div>

      {categorySummary.length > 5 && (
        <button type="button" onClick={() => onNavigate?.('cash')} style={{ ...secondaryButtonStyle, width: 'auto', marginTop: 10 }}>
          Alle anzeigen
        </button>
      )}
    </div>
  )
}
