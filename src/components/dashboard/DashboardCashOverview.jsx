import { cardStyle, colors, dashboardLabelStyle, dashboardNumberStyle, mutedTextStyle } from '../../styles/appStyles'

export function DashboardCashOverview({
  cashBalance,
  incomeTotal,
  expenseTotal,
  inventoryTotalValue,
  cashEntries,
  monthlyData,
}) {
  const safeCashEntries = Array.isArray(cashEntries) ? cashEntries : []
  const safeMonthlyData = Array.isArray(monthlyData) ? monthlyData : []
  const latestCashEntries = safeCashEntries.slice(0, 5)

  function getMonthlyBalance(month) {
    const income = Number(month?.income || 0)
    const expense = Number(month?.expense || 0)
    const balance = Number(month?.balance)

    return Number.isFinite(balance) ? balance : income - expense
  }

  function getMonthlyBarWidth(value) {
    if (monthlyBalanceMax <= 0) return '0%'
    return `${(Math.abs(value) / monthlyBalanceMax) * 100}%`
  }

  const monthlyBalanceMax = Math.max(
    ...safeMonthlyData.map((month) => Math.abs(getMonthlyBalance(month))),
    0
  )

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
          {safeMonthlyData.map((month, index) => {
            const monthItem = month || {}
            const income = Number(monthItem.income || 0)
            const expense = Number(monthItem.expense || 0)
            const balance = getMonthlyBalance(monthItem)

            return (
              <div key={monthItem.month || monthItem.label || index} style={{ display: 'grid', gridTemplateColumns: '64px minmax(160px, 1fr) minmax(220px, auto)', gap: 10, alignItems: 'center' }}>
                <span style={mutedTextStyle}>{monthItem.month || monthItem.label || '-'}</span>
                <div style={{ height: 12, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: getMonthlyBarWidth(balance),
                      background: balance >= 0 ? colors.blue : colors.red,
                    }}
                  />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: colors.blue }}>{income.toFixed(2)} EUR</span>
                  {' / '}
                  <span style={{ color: colors.red }}>{expense.toFixed(2)} EUR</span>
                  {' / '}
                  <strong>{balance.toFixed(2)} EUR</strong>
                </div>
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
