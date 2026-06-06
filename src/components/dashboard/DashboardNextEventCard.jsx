import { cardStyle, colors, dashboardLabelStyle, mutedTextStyle, secondaryButtonStyle } from '../../styles/appStyles'

export function DashboardNextEventCard({ nextEvent, onNavigate }) {
  const safeEvent = nextEvent || null

  return (
      <div style={{ ...cardStyle, borderTop: `6px solid ${colors.red}` }}>
      <strong style={dashboardLabelStyle}>Nächstes Event</strong>

      {safeEvent ? (
        <div style={{ marginTop: 12 }}>
          <strong>{safeEvent.name}</strong>
          <div style={mutedTextStyle}>{safeEvent.event_date || '-'}</div>
          <div style={mutedTextStyle}>Status: {safeEvent.status || '-'}</div>
        </div>
      ) : (
        <p style={{ ...mutedTextStyle, marginTop: 12, marginBottom: 0 }}>Kein Event vorhanden.</p>
      )}

      <button type="button" onClick={() => onNavigate?.('events')} style={{ ...secondaryButtonStyle, width: 'auto', marginTop: 12 }}>
        Alle anzeigen
      </button>
    </div>
  )
}
