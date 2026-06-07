import { useState } from 'react'
import { cardStyle, colors, dashboardLabelStyle, mutedTextStyle, secondaryButtonStyle } from '../../styles/appStyles'

const alertPriorityOrder = {
  danger: 0,
  warning: 1,
  info: 2,
  default: 3,
}

const priorityGroups = [
  ['critical', 'Kritisch'],
  ['attention', 'Aufmerksamkeit'],
  ['info', 'Information'],
]

function getAlertPriority(alert) {
  if (alert?.priority) return alert.priority
  if (alert?.type === 'danger') return 'critical'
  if (alert?.type === 'warning') return 'attention'
  return 'info'
}

export function DashboardSmartAlerts({ alerts, getAlertStyle, onNavigate }) {
  const [showAll, setShowAll] = useState(false)
  const safeAlerts = Array.isArray(alerts) ? alerts : []
  const safeGetAlertStyle = typeof getAlertStyle === 'function' ? getAlertStyle : () => ({})

  const visibleAlerts = [...safeAlerts]
    .sort((a, b) => (alertPriorityOrder[a.type] ?? alertPriorityOrder.default) - (alertPriorityOrder[b.type] ?? alertPriorityOrder.default))
    .slice(0, showAll ? safeAlerts.length : 5)
  const hiddenCount = Math.max(0, safeAlerts.length - visibleAlerts.length)

  return (
    <div style={{ ...cardStyle, borderTop: '6px solid #dc2626' }}>
      <strong style={dashboardLabelStyle}>Smart Alerts</strong>
      <p style={{ ...mutedTextStyle, marginTop: 8, marginBottom: 0 }}>
        Priorisierte Hinweise zu Kassa, Beiträgen, Fanartikeln, Sponsoren und Events.
      </p>

      <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
        {priorityGroups.map(([priority, label]) => {
          const priorityAlerts = visibleAlerts.filter((alert) => getAlertPriority(alert) === priority)
          if (priorityAlerts.length === 0) return null

          return (
            <section key={priority}>
              <strong style={{ ...dashboardLabelStyle, fontSize: 13 }}>{label}</strong>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginTop: 8 }}>
                {priorityAlerts.map((alert, index) => {
                  const alertItem = alert || {}

                  return (
                    <button
                      key={alertItem.id || `${alertItem.title || 'alert'}-${index}`}
                      type="button"
                      onClick={() => alertItem.targetPage && onNavigate?.(alertItem.targetPage)}
                      style={{
                        border: '2px solid',
                        borderRadius: 12,
                        padding: 14,
                        textAlign: 'left',
                        cursor: alertItem.targetPage ? 'pointer' : 'default',
                        ...safeGetAlertStyle(alertItem.type),
                      }}
                    >
                      <strong style={{ color: 'inherit' }}>{alertItem.title || 'Hinweis'}</strong>
                      <br />
                      <span style={{ color: 'inherit' }}>{alertItem.message || ''}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      {safeAlerts.length > 5 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 12 }}>
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            style={{ ...secondaryButtonStyle, width: 'auto', marginTop: 0, marginBottom: 0 }}
          >
            {showAll ? 'Weniger Alerts anzeigen' : 'Alle Alerts anzeigen'}
          </button>
          {!showAll && (
            <span style={{ ...mutedTextStyle, color: colors.muted }}>
              {hiddenCount} weitere Hinweis(e) sind aktuell ausgeblendet.
            </span>
          )}
        </div>
      )}
    </div>
  )
}
