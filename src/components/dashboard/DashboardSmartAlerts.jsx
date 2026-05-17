import { cardStyle, dashboardLabelStyle } from '../../styles/appStyles'

export function DashboardSmartAlerts({ alerts, getAlertStyle }) {
  return (
    <div style={{ ...cardStyle, borderTop: '6px solid #dc2626' }}>
      <strong style={dashboardLabelStyle}>Smart Alerts</strong>

      <div style={{ width: '100%', boxSizing: 'border-box', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 14 }}>
        {alerts.map((alert, index) => (
          <div
            key={`${alert.title}-${index}`}
            style={{
              border: '2px solid',
              borderRadius: 12,
              padding: 14,
              ...getAlertStyle(alert.type),
            }}
          >
            <strong style={{ color: 'inherit' }}>{alert.title}</strong>
            <br />
            <span style={{ color: 'inherit' }}>{alert.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
