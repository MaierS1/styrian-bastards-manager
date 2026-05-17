import { buttonStyle, cardStyle, headingStyle, secondaryButtonStyle } from '../../styles/appStyles'

export function EventsList({
  events,
  getEventIncomeTotal,
  getEventExpenseTotal,
  getEventBalance,
  updateEventStatus,
  editEvent,
  deleteEvent,
  isAdmin,
  exportEventFinancePdf,
}) {
  return (
    <>
      <h3 style={headingStyle}>Event-Liste</h3>

      {events.length === 0 && <p>Noch keine Events angelegt.</p>}

      {events.map((event) => (
        <div key={event.id} style={cardStyle}>
          <strong>{event.name}</strong>
          <br />
          Datum: {event.event_date || '-'}
          <br />
          Ort: {event.location || '-'}
          <br />
          Status: {event.status || '-'}
          <br />
          Notizen: {event.notes || '-'}
          <br />
          Einnahmen: {getEventIncomeTotal(event.id).toFixed(2)} € · Ausgaben: {getEventExpenseTotal(event.id).toFixed(2)} € · Ergebnis: {getEventBalance(event.id).toFixed(2)} €
          <br />
          <button onClick={() => updateEventStatus(event.id, 'geplant')} style={buttonStyle}>
            Geplant
          </button>
          <button onClick={() => updateEventStatus(event.id, 'laufend')} style={buttonStyle}>
            Laufend
          </button>
          <button onClick={() => updateEventStatus(event.id, 'abgeschlossen')} style={buttonStyle}>
            Abgeschlossen
          </button>
          <button onClick={() => exportEventFinancePdf(event)} style={buttonStyle}>
            Finanzbericht PDF
          </button>

          <button onClick={() => editEvent(event)} style={secondaryButtonStyle}>
            Event bearbeiten
          </button>

          {isAdmin() && (
            <button
              onClick={() => deleteEvent(event)}
              style={{ ...secondaryButtonStyle, borderColor: '#b91c1c', color: '#b91c1c' }}
            >
              Event löschen
            </button>
          )}
        </div>
      ))}
    </>
  )
}
