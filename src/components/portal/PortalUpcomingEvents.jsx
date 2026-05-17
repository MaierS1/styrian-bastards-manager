import { cardStyle, headingStyle, mutedTextStyle } from '../../styles/appStyles'

export function PortalUpcomingEvents({ getUpcomingEvents }) {
  const upcomingEvents = getUpcomingEvents(60)

  return (
    <>
      <h3 style={headingStyle}>Aktuelle Events</h3>

      {upcomingEvents.length === 0 && (
        <p style={mutedTextStyle}>Keine kommenden Events in den nächsten 60 Tagen.</p>
      )}

      {upcomingEvents.map((event) => (
        <div key={event.id} style={cardStyle}>
          <strong>{event.name}</strong>
          <br />
          Datum: {event.event_date || '-'}
          <br />
          Ort: {event.location || '-'}
          <br />
          Status: {event.status || '-'}
        </div>
      ))}
    </>
  )
}
