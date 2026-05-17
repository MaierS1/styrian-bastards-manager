import { buttonStyle, cardStyle, headingStyle, inputStyle, mutedTextStyle, sectionStyle, secondaryButtonStyle } from '../../styles/appStyles'

export function MobileScannerPage({
  mobileScanMode,
  setMobileScanMode,
  mobileScanning,
  setMobileScanning,
  canManageMembers,
  isAdmin,
}) {
  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>Mobile Scanner-Ansicht</h2>

      <p style={mutedTextStyle}>
        Optimiert für Handy: Mitglieder-QR für Check-in oder Inventar-QR scannen.
      </p>

      <select value={mobileScanMode} onChange={(e) => setMobileScanMode(e.target.value)} style={inputStyle}>
        <option value="member">Mitglied / Check-in scannen</option>
        {(canManageMembers() || isAdmin()) && (
          <option value="member_edit">Mitglied scannen & bearbeiten</option>
        )}
        <option value="inventory">Inventar scannen</option>
      </select>

      <button onClick={() => setMobileScanning(true)} style={buttonStyle}>
        Scanner starten
      </button>

      <button onClick={() => setMobileScanning(false)} style={secondaryButtonStyle}>
        Scanner stoppen
      </button>

      {mobileScanning && (
        <div
          id="mobile-reader"
          style={{
            marginTop: 20,
            maxWidth: 420,
            width: '100%',
          }}
        />
      )}

      <div style={cardStyle}>
        <strong>Hinweis</strong>
        <br />
        Bei Mitgliedern wird der Check-in für das aktive Event durchgeführt.
        Bei Inventar wird direkt zur Inventaransicht gewechselt und der Gegenstand gesucht.
      </div>
    </section>
  )
}
