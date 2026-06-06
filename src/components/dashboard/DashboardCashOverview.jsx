import { cardStyle, colors, dashboardLabelStyle, dashboardNumberStyle, mutedTextStyle } from '../../styles/appStyles'

export function DashboardCashOverview({
  cashBalance,
  incomeTotal,
  expenseTotal,
  inventoryTotalValue,
  cashEntries,
  getDashboardBarHeight,
  monthlyData,
}) {
  const safeCashEntries = Array.isArray(cashEntries) ? cashEntries : []
  const safeMonthlyData = Array.isArray(monthlyData) ? monthlyData : []
  const safeGetDashboardBarHeight = typeof getDashboardBarHeight === 'function' ? getDashboardBarHeight : () => 0
  const latestCashEntries = safeCashEntries.slice(0, 5)

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ width: '100%', boxSizing: 'border-box', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <div style={{ ...cardStyle, marginBottom: 0, borderTop: `6px solid ${colors.black}` }}>
          <strong style={dashboardLabelStyle}>Kassastand</strong>
          <h2 style={dashboardNumberStyle}>{cashBalance.toFixed(2)} EUR</h2>
        </div>

        <div style={{ ...cardStyle, marginBottom: 0, borderTop: `6px solid ${colors.blue}` }}>
          <strong style={dashboardLabelStyle}>Einnahmen</strong>
          <h2 style={dashboardNumberStyle}>{incomeTotal.toFixed(2)} EUR</h2>
        </div>

        <div style={{ ...cardStyle, marginBottom: 0, borderTop: `6px solid ${colors.red}` }}>
          <strong style={dashboardLabelStyle}>Ausgaben</strong>
          <h2 style={dashboardNumberStyle}>{expenseTotal.toFixed(2)} EUR</h2>
        </div>

        <div style={{ ...cardStyle, marginBottom: 0, borderTop: `6px solid ${colors.navy}` }}>
          <strong style={dashboardLabelStyle}>Ergebnis</strong>
          <h2 style={dashboardNumberStyle}>{(incomeTotal - expenseTotal).toFixed(2)} EUR</h2>
        </div>

        <div style={{ ...cardStyle, marginBottom: 0, borderTop: `6px solid ${colors.black}` }}>
          <strong style={dashboardLabelStyle}>Inventarwert</strong>
          <h2 style={dashboardNumberStyle}>{inventoryTotalValue.toFixed(2)} EUR</h2>
        </div>
      </div>

      <div style={cardStyle}>
        <strong style={dashboardLabelStyle}>Jahresübersicht</strong>
        <div style={{ width: '100%', display: 'grid', gap: 10, marginTop: 14 }}>
          {safeMonthlyData.slice(0, 6).map((month, index) => {
            const monthItem = month || {}

            return (
            <div key={monthItem.label || index} style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: 10, alignItems: 'center' }}>
              <span style={mutedTextStyle}>{monthItem.label || '-'}</span>
              <div style={{ height: 12, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${safeGetDashboardBarHeight(monthItem)}%`,
                    background: (monthItem.balance || 0) >= 0 ? colors.blue : colors.red,
                  }}
                />
              </div>
              <strong>{(monthItem.balance || 0).toFixed(2)} EUR</strong>
            </div>
            )
          })}
        </div>
      </div>

      <div style={cardStyle}>
        <strong style={dashboardLabelStyle}>Letzte Buchungen</strong>
        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          {latestCashEntries.length === 0 ? (
            <span style={mutedTextStyle}>Keine Buchungen vorhanden.</span>
          ) : (
            latestCashEntries.map((entry) => (
              <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, paddingBottom: 8, borderBottom: `1px solid ${colors.border}` }}>
                <span>
                  {entry.entry_date} · {entry.description || entry.category || 'Buchung'}
                </span>
                <strong>{Number(entry.amount || 0).toFixed(2)} EUR</strong>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
