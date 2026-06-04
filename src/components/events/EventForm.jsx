import { buttonStyle, headingStyle, inputStyle, mutedTextStyle, secondaryButtonStyle } from '../../styles/appStyles'
import { RichTextEditor } from '../common/RichTextEditor'
import { EVENT_CATEGORY_OPTIONS } from './eventCategories'

export function EventForm({
  editingEventId,
  newEventName,
  setNewEventName,
  newEventDate,
  setNewEventDate,
  newEventStartsAt,
  setNewEventStartsAt,
  newEventEndsAt,
  setNewEventEndsAt,
  newEventCategory,
  setNewEventCategory,
  newEventLocation,
  setNewEventLocation,
  newEventMeetingPoint,
  setNewEventMeetingPoint,
  newEventNotes,
  setNewEventNotes,
  newEventIsPublic,
  setNewEventIsPublic,
  newEventPublicStatus,
  setNewEventPublicStatus,
  newEventPublicTitle,
  setNewEventPublicTitle,
  newEventShortDescription,
  setNewEventShortDescription,
  newEventPublicDescription,
  setNewEventPublicDescription,
  newEventPublicDescriptionHtml,
  setNewEventPublicDescriptionHtml,
  newEventContactPerson,
  setNewEventContactPerson,
  newEventRegistrationDeadline,
  setNewEventRegistrationDeadline,
  newEventMaxParticipants,
  setNewEventMaxParticipants,
  newEventPublicSortOrder,
  setNewEventPublicSortOrder,
  newEventPublicPublishedAt,
  setNewEventPublicPublishedAt,
  newEventPublicImagePath,
  setNewEventPublicImagePath,
  newEventPublicImageUrl,
  setNewEventPublicImageUrl,
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

      <fieldset style={eventFieldsetStyle}>
        <legend style={eventLegendStyle}>Grunddaten</legend>

        <input
          placeholder="Titel, z.B. Cornhole Turnier 2026"
          value={newEventName}
          onChange={(e) => setNewEventName(e.target.value)}
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

        <textarea
          placeholder="Interne Notizen"
          value={newEventNotes}
          onChange={(e) => setNewEventNotes(e.target.value)}
          style={textareaStyle}
          rows={3}
        />
      </fieldset>

      <fieldset style={eventFieldsetStyle}>
        <legend style={eventLegendStyle}>Datum & Ort</legend>

        <label style={fieldLabelStyle}>
          Datum
          <input
            type="date"
            value={newEventDate}
            onChange={(e) => setNewEventDate(e.target.value)}
            style={{ ...inputStyle, marginTop: 6 }}
          />
        </label>

        <label style={fieldLabelStyle}>
          Start
          <input
            type="datetime-local"
            value={newEventStartsAt}
            onChange={(e) => setNewEventStartsAt(e.target.value)}
            style={{ ...inputStyle, marginTop: 6 }}
          />
        </label>

        <label style={fieldLabelStyle}>
          Ende
          <input
            type="datetime-local"
            value={newEventEndsAt}
            onChange={(e) => setNewEventEndsAt(e.target.value)}
            style={{ ...inputStyle, marginTop: 6 }}
          />
        </label>

        <input
          placeholder="Ort"
          value={newEventLocation}
          onChange={(e) => setNewEventLocation(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Treffpunkt"
          value={newEventMeetingPoint}
          onChange={(e) => setNewEventMeetingPoint(e.target.value)}
          style={inputStyle}
        />
      </fieldset>

      <fieldset style={eventFieldsetStyle}>
        <legend style={eventLegendStyle}>Öffentliche Anzeige</legend>

        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={newEventIsPublic}
            onChange={(e) => setNewEventIsPublic(e.target.checked)}
            style={checkboxInputStyle}
          />
          Auf Homepage anzeigen
        </label>

        <select
          value={newEventPublicStatus}
          onChange={(e) => setNewEventPublicStatus(e.target.value)}
          style={inputStyle}
        >
          <option value="draft">Entwurf</option>
          <option value="published">Veröffentlicht</option>
          <option value="hidden">Ausgeblendet</option>
        </select>

        <input
          placeholder="Öffentlicher Titel (optional, sonst Eventtitel)"
          value={newEventPublicTitle}
          onChange={(e) => setNewEventPublicTitle(e.target.value)}
          style={inputStyle}
        />

        <textarea
          placeholder="Kurzbeschreibung"
          value={newEventShortDescription}
          onChange={(e) => setNewEventShortDescription(e.target.value)}
          style={textareaStyle}
          rows={2}
        />

        <textarea
          placeholder="Beschreibung für die Homepage"
          value={newEventPublicDescription}
          onChange={(e) => setNewEventPublicDescription(e.target.value)}
          style={textareaStyle}
          rows={3}
        />

        <div style={richTextFieldStyle}>
          <p style={richTextHintStyle}>Formatierte Beschreibung fuer Homepage-Ausgaben</p>
          <RichTextEditor
            value={newEventPublicDescriptionHtml}
            onChange={setNewEventPublicDescriptionHtml}
            placeholder="Formatierte Event-Beschreibung"
            minHeight={160}
          />
        </div>

        <input
          type="number"
          min="0"
          placeholder="Öffentliche Sortierung"
          value={newEventPublicSortOrder}
          onChange={(e) => setNewEventPublicSortOrder(e.target.value)}
          style={inputStyle}
        />

        <label style={fieldLabelStyle}>
          Veröffentlichung ab
          <input
            type="datetime-local"
            value={newEventPublicPublishedAt}
            onChange={(e) => setNewEventPublicPublishedAt(e.target.value)}
            style={{ ...inputStyle, marginTop: 6 }}
          />
        </label>
      </fieldset>

      <fieldset style={eventFieldsetStyle}>
        <legend style={eventLegendStyle}>Anmeldung/Teilnehmer</legend>

        <input
          placeholder="Kontaktperson"
          value={newEventContactPerson}
          onChange={(e) => setNewEventContactPerson(e.target.value)}
          style={inputStyle}
        />

        <label style={fieldLabelStyle}>
          Anmeldeschluss
          <input
            type="datetime-local"
            value={newEventRegistrationDeadline}
            onChange={(e) => setNewEventRegistrationDeadline(e.target.value)}
            style={{ ...inputStyle, marginTop: 6 }}
          />
        </label>

        <input
          type="number"
          min="1"
          placeholder="Maximale Teilnehmer"
          value={newEventMaxParticipants}
          onChange={(e) => setNewEventMaxParticipants(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Anmelde-URL"
          value={newEventPublicRegistrationUrl}
          onChange={(e) => setNewEventPublicRegistrationUrl(e.target.value)}
          style={inputStyle}
        />
      </fieldset>

      <fieldset style={eventFieldsetStyle}>
        <legend style={eventLegendStyle}>Bild/Medien</legend>

        <input
          placeholder="Bild-URL"
          value={newEventPublicImageUrl}
          onChange={(e) => setNewEventPublicImageUrl(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="Storage-Pfad"
          value={newEventPublicImagePath}
          onChange={(e) => setNewEventPublicImagePath(e.target.value)}
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

const eventFieldsetStyle = {
  margin: '10px 0 16px',
  padding: 14,
  border: '1px solid #d1d5db',
  borderRadius: 8,
}

const eventLegendStyle = {
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

const richTextFieldStyle = {
  marginBottom: 12,
}

const richTextHintStyle = {
  ...mutedTextStyle,
  margin: '0 0 8px',
  fontWeight: 700,
}
