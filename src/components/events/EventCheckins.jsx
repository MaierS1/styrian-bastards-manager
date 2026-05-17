import { buttonStyle, cardStyle, headingStyle, secondaryButtonStyle, sectionStyle } from '../../styles/appStyles'

export function EventCheckins({
  canUseCheckin,
  getActiveEventName,
  scanning,
  setScanning,
  exportCheckinsPdf,
  getTodayCheckins,
  getMemberName,
}) {
  if (!canUseCheckin()) return null

  return (
    <section style={sectionStyle}>
      <h2 style={headingStyle}>Event Check-in / QR-Code Scanner</h2>

      <p>
        Aktives Event für Check-in:{' '}
        <strong>{getActiveEventName() || 'kein Event ausgewählt'}</strong>
      </p>

      <button onClick={() => setScanning(true)} style={buttonStyle}>
        QR-Code scannen & einchecken
      </button>

      <button onClick={() => setScanning(false)} style={buttonStyle}>
        Scanner stoppen
      </button>

      <button onClick={exportCheckinsPdf} style={secondaryButtonStyle}>
        Anwesenheitsliste PDF
      </button>

      {scanning && (
        <div
          id="reader"
          style={{
            marginTop: 20,
            maxWidth: 400,
            width: '100%',
          }}
        />
      )}

      <h3 style={headingStyle}>Heute für dieses Event eingecheckt: {getTodayCheckins().length}</h3>

      {getTodayCheckins().map((checkin) => (
        <div key={checkin.id} style={cardStyle}>
          <strong>{getMemberName(checkin.member_id)}</strong>
          <br />
          {checkin.event_name} · {checkin.checkin_time ? new Date(checkin.checkin_time).toLocaleTimeString('de-AT') : ''}
        </div>
      ))}
    </section>
  )
}
