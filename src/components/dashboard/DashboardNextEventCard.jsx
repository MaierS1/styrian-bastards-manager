import { cardStyle, colors, dashboardLabelStyle, mutedTextStyle, secondaryButtonStyle } from '../../styles/appStyles'

export function DashboardNextEventCard({ nextEvent, onNavigate }) {
  return (
    <div style={{ ...cardStyle, borderTop: `6px solid ${colors.red}` }}>
      <strong style={dashboardLabelStyle}>Nächstes Event</strong>

      {nextEvent ? (
        <div style={{ marginTop: 12 }}>
          <strong>{nextEvent.name}</strong>
          <div style={mutedTextStyle}>{nextEvent.event_date || '-'}</div>
          <div style={mutedTextStyle}>Status: {nextEvent.status || '-'}</div>
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
