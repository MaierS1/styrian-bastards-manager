import { cardStyle, colors, dashboardLabelStyle, headingStyle, mutedTextStyle } from '../../styles/appStyles'

export function DashboardFinanceOverview({ financeData, financeHealthStatus, getCategorySummary }) {
  return (
    <div style={{ ...cardStyle, borderTop: `6px solid ${colors.blue}` }}>
      <strong style={dashboardLabelStyle}>Finanz-Dashboard PRO</strong>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 14 }}>
        <div style={cardStyle}>
          <strong>Finanzstatus</strong>
          <br />
          <span style={{ color: financeHealthStatus.color, fontWeight: 900 }}>
            {financeHealthStatus.label}
          </span>
        </div>

        <div style={cardStyle}>
          <strong>Offene Beiträge</strong>
          <br />
          {financeData.openFeesCount} offen · {financeData.openFeesTotal.toFixed(2)} €
        </div>

        <div style={cardStyle}>
          <strong>Jahresergebnis</strong>
          <br />
          Einnahmen {financeData.incomeTotal.toFixed(2)} € · Ausgaben {financeData.expenseTotal.toFixed(2)} €
          <br />
          <strong>{financeData.balance.toFixed(2)} €</strong>
        </div>
      </div>

      <h3 style={headingStyle}>Top Event-Ergebnisse</h3>

      {financeData.eventSummaries.length === 0 && (
        <p style={mutedTextStyle}>Noch keine Event-Finanzdaten vorhanden.</p>
      )}

      {financeData.eventSummaries.slice(0, 5).map((event) => (
        <div key={event.id} style={{ ...cardStyle, marginBottom: 8 }}>
          <strong>{event.name}</strong> · {event.date || '-'}
          <br />
          Einnahmen: {event.income.toFixed(2)} € · Ausgaben: {event.expense.toFixed(2)} € · Ergebnis:{' '}
          <strong style={{ color: event.balance >= 0 ? colors.successText : colors.red }}>
            {event.balance.toFixed(2)} €
          </strong>
        </div>
      ))}

      <h3 style={headingStyle}>Kategorien kompakt</h3>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
          <thead>
            <tr>
              {['Kategorie', 'Einnahmen', 'Ausgaben', 'Ergebnis'].map((header) => (
                <th key={header} style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #d1d5db' }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {getCategorySummary().map((item) => (
              <tr key={item.category}>
                <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{item.category}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{item.income.toFixed(2)} €</td>
                <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>{item.expense.toFixed(2)} €</td>
                <td style={{ padding: 8, borderBottom: '1px solid #e5e7eb' }}>
                  <strong>{item.balance.toFixed(2)} €</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
