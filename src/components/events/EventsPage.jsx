import { cardStyle, headingStyle, inputStyle, sectionStyle } from '../../styles/appStyles'
import { EventCheckins } from './EventCheckins'
import { EventForm } from './EventForm'
import { EventsList } from './EventsList'

export function EventsPage({
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
  selectedEventId,
  setSelectedEventId,
  setEventName,
  events,
  getActiveEventName,
  getSelectedEventIncomeTotal,
  getSelectedEventExpenseTotal,
  getSelectedEventBalance,
  getEventIncomeTotal,
  getEventExpenseTotal,
  getEventBalance,
  updateEventStatus,
  editEvent,
  deleteEvent,
  isAdmin,
  exportEventFinancePdf,
  canUseCheckin,
  scanning,
  setScanning,
  exportCheckinsPdf,
  getTodayCheckins,
  getMemberName,
}) {
  return (
    <>
      <section style={sectionStyle}>
        <h2 style={headingStyle}>Event-Verwaltung</h2>

        <EventForm
          editingEventId={editingEventId}
          newEventName={newEventName}
          setNewEventName={setNewEventName}
          newEventDate={newEventDate}
          setNewEventDate={setNewEventDate}
          newEventCategory={newEventCategory}
          setNewEventCategory={setNewEventCategory}
          newEventLocation={newEventLocation}
          setNewEventLocation={setNewEventLocation}
          newEventNotes={newEventNotes}
          setNewEventNotes={setNewEventNotes}
          newEventIsPublic={newEventIsPublic}
          setNewEventIsPublic={setNewEventIsPublic}
          newEventPublicTitle={newEventPublicTitle}
          setNewEventPublicTitle={setNewEventPublicTitle}
          newEventPublicDescription={newEventPublicDescription}
          setNewEventPublicDescription={setNewEventPublicDescription}
          newEventPublicSortOrder={newEventPublicSortOrder}
          setNewEventPublicSortOrder={setNewEventPublicSortOrder}
          newEventPublicPublishedAt={newEventPublicPublishedAt}
          setNewEventPublicPublishedAt={setNewEventPublicPublishedAt}
          newEventPublicImagePath={newEventPublicImagePath}
          setNewEventPublicImagePath={setNewEventPublicImagePath}
          newEventPublicRegistrationUrl={newEventPublicRegistrationUrl}
          setNewEventPublicRegistrationUrl={setNewEventPublicRegistrationUrl}
          newEventPublicExternalUrl={newEventPublicExternalUrl}
          setNewEventPublicExternalUrl={setNewEventPublicExternalUrl}
          createEvent={createEvent}
          updateEvent={updateEvent}
          resetEventForm={resetEventForm}
        />

        <h3 style={headingStyle}>Event auswählen</h3>

        <select
          value={selectedEventId}
          onChange={(e) => {
            const eventId = e.target.value
            setSelectedEventId(eventId)
            const selectedEvent = events.find((event) => event.id === eventId)
            setEventName(selectedEvent?.name || '')
          }}
          style={inputStyle}
        >
          <option value="">Event auswählen</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name} · {event.event_date} · {event.status}
            </option>
          ))}
        </select>

        <p>
          Aktives Event:{' '}
          <strong>{getActiveEventName() || 'kein Event ausgewählt'}</strong>
        </p>

        {selectedEventId && (
          <div style={{ ...cardStyle, background: '#ecfdf5', color: '#065f46' }}>
            <strong>Finanzen für aktives Event</strong>
            <br />
            Einnahmen: {getSelectedEventIncomeTotal().toFixed(2)} €
            <br />
            Ausgaben: {getSelectedEventExpenseTotal().toFixed(2)} €
            <br />
            Ergebnis: {getSelectedEventBalance().toFixed(2)} €
          </div>
        )}

        <EventsList
          events={events}
          getEventIncomeTotal={getEventIncomeTotal}
          getEventExpenseTotal={getEventExpenseTotal}
          getEventBalance={getEventBalance}
          updateEventStatus={updateEventStatus}
          editEvent={editEvent}
          deleteEvent={deleteEvent}
          isAdmin={isAdmin}
          exportEventFinancePdf={exportEventFinancePdf}
        />
      </section>

      <EventCheckins
        canUseCheckin={canUseCheckin}
        getActiveEventName={getActiveEventName}
        scanning={scanning}
        setScanning={setScanning}
        exportCheckinsPdf={exportCheckinsPdf}
        getTodayCheckins={getTodayCheckins}
        getMemberName={getMemberName}
      />
    </>
  )
}
