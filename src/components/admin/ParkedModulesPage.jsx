import { buttonStyle, cardStyle, colors, headingStyle, mutedTextStyle, sectionStyle } from '../../styles/appStyles'

const parkedModules = [
  {
    title: 'Einkauf & Preisvergleich',
    status: 'Deaktiviert',
    reason:
      'METRO und Transgourmet bieten aktuell keine praktikable öffentliche Suchschnittstelle. Ohne API oder offiziellen Datenzugriff ist keine zuverlässige automatische Produktsuche möglich.',
    done: [
      'Datenbanktabellen',
      'Preisvergleich',
      'Favoriten',
      'Preis-Historie',
      'Einkaufslisten',
      'Event-Verknüpfung',
      'PDF-/CSV-Export',
      'Suchagent',
      'Edge Functions',
    ],
    reactivation:
      'Reaktivierung bei verfügbarer API, CSV-/Excel-Import oder offizieller Lieferanten-Schnittstelle.',
  },
  {
    title: 'Mitgliederbereich Homepage',
    status: 'Geparkt / Vorbereitung',
    reason:
      'Der Mitgliederbereich ist vorbereitet, soll aber erst später sauber mit Login, Rollenprüfung und Homepage-Anbindung verbunden werden.',
    done: [
      'Mitgliederbereich-Seite vorhanden',
      'Grundstruktur im App-Routing',
      'Berechtigungslogik vorbereitet',
    ],
    reactivation:
      'Reaktivierung, wenn Homepage-Login und Rollenprüfung final umgesetzt werden.',
  },
]

export function ParkedModulesPage({ canAccess = false, onNavigate }) {
  if (!canAccess) {
    return (
      <section style={sectionStyle}>
        <h2 style={headingStyle}>Geparkte Module</h2>
        <div style={cardStyle}>
          <strong>Kein Zugriff</strong>
          <br />
          Dieser Bereich ist nur für Admins und Vorstand sichtbar.
        </div>
      </section>
    )
  }

  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>Geparkte Module</h2>
      <p style={mutedTextStyle}>
        Hier werden vorläufig deaktivierte Projekte dokumentiert. Es werden keine Daten gelöscht.
      </p>

      {parkedModules.map((module) => (
        <div key={module.title} style={{ ...cardStyle, borderTop: `6px solid ${colors.red}` }}>
          <strong style={{ fontSize: 18 }}>{module.title}</strong>
          <br />
          Status: <strong>{module.status}</strong>
          <br />
          Grund: {module.reason}

          <div style={{ marginTop: 12 }}>
            <strong>Bereits umgesetzt:</strong>
            <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
              {module.done.map((item) => (
                <li key={item}>✓ {item}</li>
              ))}
            </ul>
          </div>

          <div style={{ marginTop: 12 }}>
            <strong>Reaktivierung:</strong> {module.reactivation}
          </div>
        </div>
      ))}

      {onNavigate && (
        <button type="button" onClick={() => onNavigate('dashboard')} style={buttonStyle}>
          Zurück zum Dashboard
        </button>
      )}
    </section>
  )
}
