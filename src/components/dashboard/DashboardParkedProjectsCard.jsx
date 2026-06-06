import { buttonStyle, cardStyle, colors, dashboardLabelStyle, mutedTextStyle } from '../../styles/appStyles'

export function DashboardParkedProjectsCard({ onNavigate }) {
  return (
    <div style={{ ...cardStyle, borderTop: `6px solid ${colors.red}` }}>
      <strong style={dashboardLabelStyle}>Geparkte Projekte</strong>
      <div style={{ marginTop: 10 }}>
        <strong>Einkauf & Preisvergleich</strong>
        <br />
        Status: <strong>Deaktiviert</strong>
        <p style={{ ...mutedTextStyle, marginBottom: 0 }}>
          Das Modul ist dokumentiert und technisch erhalten, aber vorläufig aus dem normalen Menü entfernt.
        </p>
      </div>

      <button type="button" onClick={() => onNavigate && onNavigate('parkedModules')} style={{ ...buttonStyle, marginTop: 12 }}>
        Details anzeigen
      </button>
    </div>
  )
}
