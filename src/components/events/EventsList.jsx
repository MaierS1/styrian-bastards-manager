import { buttonStyle, cardStyle, headingStyle, secondaryButtonStyle } from '../../styles/appStyles'
import { getEventCategoryLabel } from './eventCategories'

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
          <span style={categoryBadgeStyle}>{getEventCategoryLabel(event.event_category)}</span>
          <br />
          Datum: {event.event_date || '-'}
          <br />
          Start: {event.starts_at || '-'}
          {event.ends_at && <> · Ende: {event.ends_at}</>}
          <br />
          Ort: {event.location || '-'}
          <br />
          Treffpunkt: {event.meeting_point || '-'}
          <br />
          Status: {event.status || '-'}
          <br />
          Homepage: {event.is_public ? 'Ja' : 'Nein'} · {getPublicStatusLabel(event.public_status)}
          {event.is_public && (
            <>
              {' '}· Titel: {event.public_title || event.title || event.name || '-'}
            </>
          )}
          <br />
          Anmeldung: {event.registration_enabled ? 'aktiv' : 'inaktiv'} · Status: {getRegistrationStatusLabel(event.registration_status)} · Teams: {event.registered_count || 0} · Warteliste: {event.waitlist_count || 0}
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

function getPublicStatusLabel(status) {
  if (status === 'published') return 'Veröffentlicht'
  if (status === 'hidden') return 'Ausgeblendet'
  return 'Entwurf'
}

function getRegistrationStatusLabel(status) {
  if (status === 'open') return 'offen'
  if (status === 'waitlist') return 'Warteliste'
  if (status === 'full') return 'voll'
  if (status === 'closed') return 'geschlossen'
  return 'deaktiviert'
}

const categoryBadgeStyle = {
  display: 'inline-block',
  marginLeft: 8,
  padding: '2px 8px',
  borderRadius: 999,
  background: '#e0f2fe',
  color: '#075985',
  fontSize: 12,
  fontWeight: 800,
  lineHeight: 1.5,
  verticalAlign: 'middle',
}
