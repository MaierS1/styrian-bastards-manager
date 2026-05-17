import {
  cardStyle,
  colors,
  dashboardLabelStyle,
  dashboardNumberStyle,
  mutedTextStyle,
} from '../../styles/appStyles'

export function DashboardSummaryCards({
  cashBalance,
  incomeTotal,
  expenseTotal,
  inventoryTotalValue,
  testMembersCount,
  openFeesCount,
  openFeesTotal,
  nextEvent,
}) {
  return (
    <>
      <div style={{ width: '100%', boxSizing: 'border-box', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 15 }}>
        <div style={{ ...cardStyle, background: colors.white, borderTop: `6px solid ${colors.black}` }}>
          <strong style={dashboardLabelStyle}>Kassastand</strong>
          <h2 style={dashboardNumberStyle}>{cashBalance.toFixed(2)} €</h2>
        </div>

        <div style={{ ...cardStyle, background: colors.white, borderTop: `6px solid ${colors.blue}` }}>
          <strong style={dashboardLabelStyle}>Einnahmen</strong>
          <h2 style={dashboardNumberStyle}>{incomeTotal.toFixed(2)} €</h2>
        </div>

        <div style={{ ...cardStyle, background: colors.white, borderTop: `6px solid ${colors.red}` }}>
          <strong style={dashboardLabelStyle}>Ausgaben</strong>
          <h2 style={dashboardNumberStyle}>{expenseTotal.toFixed(2)} €</h2>
        </div>

        <div style={{ ...cardStyle, background: colors.white, borderTop: `6px solid ${colors.navy}` }}>
          <strong style={dashboardLabelStyle}>Ergebnis</strong>
          <h2 style={dashboardNumberStyle}>{(incomeTotal - expenseTotal).toFixed(2)} €</h2>
        </div>

        <div style={{ ...cardStyle, background: colors.white, borderTop: `6px solid ${colors.black}` }}>
          <strong style={dashboardLabelStyle}>Inventarwert</strong>
          <h2 style={dashboardNumberStyle}>{inventoryTotalValue.toFixed(2)} €</h2>
        </div>

        <div style={{ ...cardStyle, background: colors.white, borderTop: `6px solid ${colors.red}` }}>
          <strong style={dashboardLabelStyle}>Testdaten</strong>
          <h2 style={dashboardNumberStyle}>{testMembersCount}</h2>
          <p style={mutedTextStyle}>Testmitglieder vorhanden</p>
        </div>
      </div>

      <br />

      <div style={cardStyle}>
        <strong>Offene Mitgliedsbeiträge</strong>
        <br />
        Anzahl offen: {openFeesCount}
        <br />
        Summe offen: {openFeesTotal.toFixed(2)} €
      </div>

      <br />

      <div style={cardStyle}>
        <strong>Nächstes Event</strong>
        <br />
        {nextEvent ? (
          <>
            {nextEvent.name}
            <br />
            {nextEvent.event_date}
            <br />
            Status: {nextEvent.status}
          </>
        ) : (
          'Kein Event vorhanden'
        )}
      </div>
    </>
  )
}
