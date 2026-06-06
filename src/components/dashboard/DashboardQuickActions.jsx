import { cardStyle, colors, dashboardLabelStyle, mutedTextStyle, secondaryButtonStyle } from '../../styles/appStyles'

const quickActions = [
  { label: 'Mitglied anlegen', page: 'members' },
  { label: 'Kassa-Eintrag erfassen', page: 'cash' },
  { label: 'Event erstellen', page: 'events' },
  { label: 'Fanartikel anlegen', page: 'merch' },
  { label: 'Sponsor anlegen', page: 'sponsors' },
]

export function DashboardQuickActions({ onNavigate }) {
  return (
    <div style={{ ...cardStyle, borderTop: `6px solid ${colors.black}` }}>
      <strong style={dashboardLabelStyle}>Schnellaktionen</strong>
      <p style={{ ...mutedTextStyle, marginTop: 8, marginBottom: 0 }}>Direkte Sprünge zu den wichtigsten Erfassungsmasken.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginTop: 14 }}>
        {quickActions.map((action) => (
          <button
            key={action.page}
            type="button"
            onClick={() => onNavigate?.(action.page)}
            style={{ ...secondaryButtonStyle, margin: 0, width: '100%' }}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}
