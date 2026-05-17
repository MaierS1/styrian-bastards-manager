import { cardStyle, colors, dashboardLabelStyle, mutedTextStyle } from '../../styles/appStyles'

export function DashboardMonthlyChart({ monthlyData, getDashboardBarHeight }) {
  return (
    <div style={{ ...cardStyle, marginTop: 18 }}>
      <strong style={dashboardLabelStyle}>Monatsdiagramm Einnahmen / Ausgaben</strong>

      <div style={{ overflowX: 'auto', marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, minWidth: 850, height: 190 }}>
          {monthlyData.map((item) => (
            <div key={item.month} style={{ textAlign: 'center', width: 62 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 5, height: 140 }}>
                <div
                  title={`Einnahmen ${item.month}: ${item.income.toFixed(2)} €`}
                  style={{
                    width: 23,
                    height: getDashboardBarHeight(item.income),
                    background: colors.blue,
                    borderRadius: '6px 6px 0 0',
                  }}
                />
                <div
                  title={`Ausgaben ${item.month}: ${item.expense.toFixed(2)} €`}
                  style={{
                    width: 23,
                    height: getDashboardBarHeight(item.expense),
                    background: colors.red,
                    borderRadius: '6px 6px 0 0',
                  }}
                />
              </div>
              <strong style={{ color: colors.black }}>{item.month}</strong>
              <br />
              <span style={{ fontSize: 11, color: colors.blue }}>{item.income.toFixed(0)}€</span>
              {' / '}
              <span style={{ fontSize: 11, color: colors.red }}>{item.expense.toFixed(0)}€</span>
            </div>
          ))}
        </div>
      </div>

      <p style={mutedTextStyle}>
        <strong style={{ color: colors.blue }}>Blau = Einnahmen</strong>
        {' · '}
        <strong style={{ color: colors.red }}>Rot = Ausgaben</strong>
      </p>
    </div>
  )
}
