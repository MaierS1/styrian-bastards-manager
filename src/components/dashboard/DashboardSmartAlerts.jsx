import { cardStyle, dashboardLabelStyle, mutedTextStyle } from '../../styles/appStyles'

const alertPriorityOrder = {
  danger: 0,
  warning: 1,
  info: 2,
  default: 3,
}

export function DashboardSmartAlerts({ alerts, getAlertStyle }) {
  const safeAlerts = Array.isArray(alerts) ? alerts : []
  const safeGetAlertStyle = typeof getAlertStyle === 'function' ? getAlertStyle : () => ({})

  const visibleAlerts = [...safeAlerts]
    .sort((a, b) => (alertPriorityOrder[a.type] ?? alertPriorityOrder.default) - (alertPriorityOrder[b.type] ?? alertPriorityOrder.default))
    .slice(0, 5)
  const hiddenCount = Math.max(0, safeAlerts.length - visibleAlerts.length)

  return (
    <div style={{ ...cardStyle, borderTop: '6px solid #dc2626' }}>
      <strong style={dashboardLabelStyle}>Smart Alerts</strong>
      <p style={{ ...mutedTextStyle, marginTop: 8, marginBottom: 0 }}>
        Priorisierte Hinweise zu Kassa, Beiträgen, Fanartikeln, Sponsoren und Events.
      </p>

      <div style={{ width: '100%', boxSizing: 'border-box', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 14 }}>
        {visibleAlerts.map((alert, index) => {
          const alertItem = alert || {}

          return (
          <div
            key={`${alertItem.title || 'alert'}-${index}`}
            style={{
              border: '2px solid',
              borderRadius: 12,
              padding: 14,
              ...safeGetAlertStyle(alertItem.type),
            }}
          >
            <strong style={{ color: 'inherit' }}>{alertItem.title || 'Hinweis'}</strong>
            <br />
            <span style={{ color: 'inherit' }}>{alertItem.message || ''}</span>
          </div>
          )
        })}
      </div>

      {hiddenCount > 0 && (
        <p style={{ ...mutedTextStyle, marginTop: 12, marginBottom: 0 }}>
          {hiddenCount} weitere Hinweis(e) sind aktuell ausgeblendet.
        </p>
      )}
    </div>
  )
}
