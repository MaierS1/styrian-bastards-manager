import { buttonStyle, headingStyle, inputStyle, secondaryButtonStyle } from '../../styles/appStyles'

export function EventForm({
  editingEventId,
  newEventName,
  setNewEventName,
  newEventDate,
  setNewEventDate,
  newEventLocation,
  setNewEventLocation,
  newEventNotes,
  setNewEventNotes,
  createEvent,
  updateEvent,
  resetEventForm,
}) {
  return (
    <>
      <h3 style={headingStyle}>{editingEventId ? 'Event bearbeiten' : 'Neues Event anlegen'}</h3>

      <input
        placeholder="Eventname, z.B. Cornhole Turnier 2026"
        value={newEventName}
        onChange={(e) => setNewEventName(e.target.value)}
        style={inputStyle}
      />

      <input
        type="date"
        value={newEventDate}
        onChange={(e) => setNewEventDate(e.target.value)}
        style={inputStyle}
      />

      <input
        placeholder="Ort"
        value={newEventLocation}
        onChange={(e) => setNewEventLocation(e.target.value)}
        style={inputStyle}
      />

      <input
        placeholder="Notizen"
        value={newEventNotes}
        onChange={(e) => setNewEventNotes(e.target.value)}
        style={inputStyle}
      />

      {editingEventId ? (
        <>
          <button onClick={updateEvent} style={buttonStyle}>
            Änderungen speichern
          </button>
          <button onClick={resetEventForm} style={secondaryButtonStyle}>
            Bearbeiten abbrechen
          </button>
        </>
      ) : (
        <button onClick={createEvent} style={buttonStyle}>
          Event anlegen
        </button>
      )}
    </>
  )
}
