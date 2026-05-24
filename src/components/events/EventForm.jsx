import { buttonStyle, headingStyle, inputStyle, secondaryButtonStyle } from '../../styles/appStyles'
import { EVENT_CATEGORY_OPTIONS } from './eventCategories'

export function EventForm({
  editingEventId,
  newEventName,
  setNewEventName,
  newEventDate,
  setNewEventDate,
  newEventCategory,
  setNewEventCategory,
  newEventLocation,
  setNewEventLocation,
  newEventNotes,
  setNewEventNotes,
  newEventIsPublic,
  setNewEventIsPublic,
  newEventPublicTitle,
  setNewEventPublicTitle,
  newEventPublicDescription,
  setNewEventPublicDescription,
  newEventPublicSortOrder,
  setNewEventPublicSortOrder,
  newEventPublicPublishedAt,
  setNewEventPublicPublishedAt,
  newEventPublicImagePath,
  setNewEventPublicImagePath,
  newEventPublicRegistrationUrl,
  setNewEventPublicRegistrationUrl,
  newEventPublicExternalUrl,
  setNewEventPublicExternalUrl,
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

      <select
        value={newEventCategory}
        onChange={(e) => setNewEventCategory(e.target.value)}
        style={inputStyle}
      >
        {EVENT_CATEGORY_OPTIONS.map((category) => (
          <option key={category.value} value={category.value}>
            {category.label}
          </option>
        ))}
      </select>

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

      <fieldset style={publicEventFieldsetStyle}>
        <legend style={publicEventLegendStyle}>Homepage</legend>

        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={newEventIsPublic}
            onChange={(e) => setNewEventIsPublic(e.target.checked)}
            style={checkboxInputStyle}
          />
          Öffentlich anzeigen
        </label>

        <input
          placeholder="Öffentlicher Titel"
          value={newEventPublicTitle}
          onChange={(e) => setNewEventPublicTitle(e.target.value)}
          style={inputStyle}
        />

        <textarea
          placeholder="Öffentliche Beschreibung"
          value={newEventPublicDescription}
          onChange={(e) => setNewEventPublicDescription(e.target.value)}
          style={textareaStyle}
          rows={3}
        />

        <input
          type="number"
          min="0"
          placeholder="Öffentliche Sortierung"
          value={newEventPublicSortOrder}
          onChange={(e) => setNewEventPublicSortOrder(e.target.value)}
          style={inputStyle}
        />

        <label style={fieldLabelStyle}>
          Veröffentlichungsdatum
          <input
            type="datetime-local"
            value={newEventPublicPublishedAt}
            onChange={(e) => setNewEventPublicPublishedAt(e.target.value)}
            style={{ ...inputStyle, marginTop: 6 }}
          />
        </label>

        <input
          placeholder="Bild-URL oder Storage-Pfad"
          value={newEventPublicImagePath}
          onChange={(e) => setNewEventPublicImagePath(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Anmelde-URL"
          value={newEventPublicRegistrationUrl}
          onChange={(e) => setNewEventPublicRegistrationUrl(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Externe URL"
          value={newEventPublicExternalUrl}
          onChange={(e) => setNewEventPublicExternalUrl(e.target.value)}
          style={inputStyle}
        />
      </fieldset>

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

const publicEventFieldsetStyle = {
  margin: '10px 0 16px',
  padding: 14,
  border: '1px solid #d1d5db',
  borderRadius: 10,
}

const publicEventLegendStyle = {
  padding: '0 6px',
  fontWeight: 800,
}

const checkboxLabelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 12,
  fontWeight: 700,
}

const checkboxInputStyle = {
  width: 18,
  height: 18,
}

const fieldLabelStyle = {
  display: 'block',
  marginBottom: 12,
  fontWeight: 700,
}

const textareaStyle = {
  ...inputStyle,
  minHeight: 92,
  resize: 'vertical',
}
