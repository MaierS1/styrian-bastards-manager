import { cardStyle, dashboardLabelStyle } from '../../styles/appStyles'

export function DashboardStats({ memberTypeStats, feeStats, getStatsMax }) {
  return (
    <div style={{ width: '100%', boxSizing: 'border-box', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 15 }}>
      <div style={cardStyle}>
        <strong style={dashboardLabelStyle}>Mitglieder nach Art</strong>

        <div style={{ marginTop: 14 }}>
          {memberTypeStats.map((item) => (
            <div key={item.value} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ color: '#111827' }}>{item.label}</span>
                <strong style={{ color: '#111827' }}>{item.count}</strong>
              </div>
              <div style={{ height: 10, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${(item.count / getStatsMax(memberTypeStats)) * 100}%`,
                    background: '#111827',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        <strong style={dashboardLabelStyle}>Beitragsstatus</strong>

        <div style={{ marginTop: 14 }}>
          {feeStats.map((item) => (
            <div key={item.label} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ color: '#111827' }}>{item.label}</span>
                <strong style={{ color: '#111827' }}>{item.count}</strong>
              </div>
              <div style={{ height: 10, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${(item.count / getStatsMax(feeStats)) * 100}%`,
                    background: item.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
