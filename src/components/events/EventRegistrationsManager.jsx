import { useEffect, useMemo, useState } from 'react'
import { buttonStyle, cardStyle, headingStyle, inputStyle, mutedTextStyle, secondaryButtonStyle } from '../../styles/appStyles'
import {
  createEventRegistration,
  deleteEventRegistration,
  fetchEventRegistrations,
  sendEventRegistrationNotification,
  updateEventRegistration,
} from '../../services/repositories/eventsRepository'
import {
  buildCancellationEmail,
  buildEventReminderEmail,
  buildRegistrationConfirmationEmail,
  buildWaitlistEmail,
} from '../../services/notifications/eventNotifications'

const emptyForm = {
  full_name: '',
  email: '',
  phone: '',
  member_status: 'unknown',
  participant_count: '1',
  note: '',
  status: 'registered',
}

const memberStatusLabels = {
  member: 'Mitglied',
  guest: 'Gast',
  unknown: 'Unbekannt',
}

const statusLabels = {
  registered: 'Angemeldet',
  waitlist: 'Warteliste',
  cancelled: 'Abgesagt',
}

export function EventRegistrationsManager({ event, onRegistrationsChanged }) {
  const [registrations, setRegistrations] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingById, setEditingById] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sendingId, setSendingId] = useState(null)
  const [emailPreview, setEmailPreview] = useState(null)

  const registeredCount = useMemo(
    () => getParticipantCount(registrations, 'registered'),
    [registrations]
  )
  const waitlistCount = useMemo(
    () => getParticipantCount(registrations, 'waitlist'),
    [registrations]
  )
  const cancelledCount = useMemo(
    () => getParticipantCount(registrations, 'cancelled'),
    [registrations]
  )

  useEffect(() => {
    setForm(emptyForm)
    setEditingById({})
    if (event?.id) {
      loadRegistrations()
    } else {
      setRegistrations([])
    }
  }, [event?.id])

  async function loadRegistrations() {
    if (!event?.id) return

    setLoading(true)
    const { data, error } = await fetchEventRegistrations(event.id)
    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    setRegistrations(data || [])
  }

  function updateFormValue(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function updateEditValue(registrationId, field, value) {
    setEditingById((current) => ({
      ...current,
      [registrationId]: {
        ...current[registrationId],
        [field]: value,
      },
    }))
  }

  function beginEdit(registration) {
    setEditingById((current) => ({
      ...current,
      [registration.id]: toEditableRegistration(registration),
    }))
  }

  async function sendConfirmation(registration) {
    const notification = getConfirmationNotification(registration)

    setEmailPreview({
      registrationId: registration.id,
      type: 'confirmation',
      email: notification.builder({ event, registration }),
    })

    await sendNotification(registration, notification.type)
  }

  async function sendReminder(registration) {
    setEmailPreview({
      registrationId: registration.id,
      type: 'reminder',
      email: buildEventReminderEmail({ event, registration }),
    })

    await sendNotification(registration, 'event_reminder')
  }

  async function sendNotification(registration, type) {
    setSendingId(registration.id)

    try {
      const { error } = await sendEventRegistrationNotification({
        type,
        registrationId: registration.id,
      })

      if (error) {
        alert(error.message || 'E-Mail konnte nicht gesendet werden.')
        await reloadAfterChange()
        return
      }

      alert('E-Mail wurde gesendet.')
      await reloadAfterChange()
    } finally {
      setSendingId(null)
    }
  }

  function cancelEdit(registrationId) {
    setEditingById((current) => {
      const next = { ...current }
      delete next[registrationId]
      return next
    })
  }

  function buildPayload(values) {
    const participantCount = Number.parseInt(values.participant_count, 10)

    return {
      event_id: event.id,
      full_name: values.full_name.trim(),
      email: values.email.trim().toLowerCase(),
      phone: values.phone.trim() || null,
      member_status: values.member_status,
      participant_count: Number.isNaN(participantCount) ? 1 : Math.max(1, participantCount),
      note: values.note.trim() || null,
      status: values.status,
    }
  }

  function validate(values) {
    if (!values.full_name.trim()) return 'Bitte einen Namen eingeben.'
    if (!values.email.trim()) return 'Bitte eine E-Mail-Adresse eingeben.'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email.trim())) return 'Bitte eine gültige E-Mail-Adresse eingeben.'

    const participantCount = Number.parseInt(values.participant_count, 10)
    if (Number.isNaN(participantCount) || participantCount < 1) return 'Teilnehmeranzahl muss mindestens 1 sein.'

    if (!['member', 'guest', 'unknown'].includes(values.member_status)) return 'Ungültiger Mitgliedsstatus.'
    if (!['registered', 'waitlist', 'cancelled'].includes(values.status)) return 'Ungültiger Anmeldestatus.'

    return ''
  }

  function resolveStatusForLimit(values, existingRegistrationId = null) {
    if (values.status !== 'registered' || !event.max_participants) return values.status

    const participantCount = Number.parseInt(values.participant_count, 10)
    const requestedCount = Number.isNaN(participantCount) ? 1 : Math.max(1, participantCount)
    const currentRegisteredCount = registrations
      .filter((registration) => registration.status === 'registered' && registration.id !== existingRegistrationId)
      .reduce((sum, registration) => sum + (Number(registration.participant_count) || 0), 0)

    if (currentRegisteredCount + requestedCount <= event.max_participants) return values.status

    const message = `Das Teilnehmerlimit ist voll (${currentRegisteredCount}/${event.max_participants}). Auf Warteliste setzen?`
    return window.confirm(message) ? 'waitlist' : ''
  }

  async function handleCreate(eventObject) {
    eventObject.preventDefault()

    const validationError = validate(form)
    if (validationError) return alert(validationError)

    const resolvedStatus = resolveStatusForLimit(form)
    if (!resolvedStatus) return

    setSaving(true)
    const { error } = await createEventRegistration({
      ...buildPayload({ ...form, status: resolvedStatus }),
    })
    setSaving(false)

    if (error) return alert(error.message)

    setForm(emptyForm)
    await reloadAfterChange()
  }

  async function handleUpdate(registrationId) {
    const values = editingById[registrationId]
    if (!values) return

    const validationError = validate(values)
    if (validationError) return alert(validationError)

    const resolvedStatus = resolveStatusForLimit(values, registrationId)
    if (!resolvedStatus) return

    setSaving(true)
    const { error } = await updateEventRegistration(registrationId, {
      ...buildPayload({ ...values, status: resolvedStatus }),
    })
    setSaving(false)

    if (error) return alert(error.message)

    cancelEdit(registrationId)
    await reloadAfterChange()
  }

  async function handleCancel(registration) {
    const { error } = await updateEventRegistration(registration.id, { status: 'cancelled' })
    if (error) return alert(error.message)

    await reloadAfterChange()
  }

  async function handleDelete(registration) {
    if (!window.confirm(`Teilnehmer endgültig löschen?\n\n${registration.full_name}`)) return

    const { error } = await deleteEventRegistration(registration.id)
    if (error) return alert(error.message)

    await reloadAfterChange()
  }

  async function reloadAfterChange() {
    await loadRegistrations()
    await onRegistrationsChanged?.()
  }

  if (!event?.id) {
    return (
      <section style={sectionBoxStyle}>
        <h3 style={headingStyle}>Teilnehmer verwalten</h3>
        <p style={mutedTextStyle}>Bitte zuerst ein Event auswählen.</p>
      </section>
    )
  }

  return (
    <section style={sectionBoxStyle}>
      <h3 style={headingStyle}>Teilnehmer verwalten</h3>

      <p style={summaryStyle}>
        Angemeldet: <strong>{registeredCount}</strong> · Warteliste: <strong>{waitlistCount}</strong> · Abgesagt: <strong>{cancelledCount}</strong>
        {event.max_participants ? <> · Limit: <strong>{event.max_participants}</strong></> : null}
      </p>

      <form onSubmit={handleCreate} style={formGridStyle}>
        <input
          placeholder="Name"
          value={form.full_name}
          onChange={(e) => updateFormValue('full_name', e.target.value)}
          style={inputStyle}
        />
        <input
          type="email"
          placeholder="E-Mail"
          value={form.email}
          onChange={(e) => updateFormValue('email', e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="Telefon optional"
          value={form.phone}
          onChange={(e) => updateFormValue('phone', e.target.value)}
          style={inputStyle}
        />
        <select
          value={form.member_status}
          onChange={(e) => updateFormValue('member_status', e.target.value)}
          style={inputStyle}
        >
          <option value="unknown">Unbekannt</option>
          <option value="member">Mitglied</option>
          <option value="guest">Gast</option>
        </select>
        <input
          type="number"
          min="1"
          value={form.participant_count}
          onChange={(e) => updateFormValue('participant_count', e.target.value)}
          style={inputStyle}
        />
        <select
          value={form.status}
          onChange={(e) => updateFormValue('status', e.target.value)}
          style={inputStyle}
        >
          <option value="registered">Angemeldet</option>
          <option value="waitlist">Warteliste</option>
          <option value="cancelled">Abgesagt</option>
        </select>
        <textarea
          placeholder="Notiz optional"
          value={form.note}
          onChange={(e) => updateFormValue('note', e.target.value)}
          style={{ ...inputStyle, minHeight: 84, resize: 'vertical', gridColumn: '1 / -1' }}
        />
        <button type="submit" disabled={saving} style={buttonStyle}>
          Teilnehmer hinzufügen
        </button>
      </form>

      {loading ? <p style={mutedTextStyle}>Teilnehmer werden geladen...</p> : null}
      {!loading && registrations.length === 0 ? <p style={mutedTextStyle}>Noch keine Teilnehmer erfasst.</p> : null}

      {emailPreview ? (
        <div style={previewStyle}>
          <strong>E-Mail-Vorschau</strong>
          <br />
          Typ: {emailPreview.type === 'reminder' ? 'Erinnerung' : 'Bestätigung'}
          <br />
          Betreff: {emailPreview.email.subject}
          <pre style={previewTextStyle}>{emailPreview.email.text}</pre>
        </div>
      ) : null}

      <div style={listStyle}>
        {registrations.map((registration) => {
          const editValues = editingById[registration.id]

          return (
            <div key={registration.id} style={cardStyle}>
              {editValues ? (
                <div style={formGridStyle}>
                  <input
                    value={editValues.full_name}
                    onChange={(e) => updateEditValue(registration.id, 'full_name', e.target.value)}
                    style={inputStyle}
                  />
                  <input
                    type="email"
                    value={editValues.email}
                    onChange={(e) => updateEditValue(registration.id, 'email', e.target.value)}
                    style={inputStyle}
                  />
                  <input
                    value={editValues.phone}
                    onChange={(e) => updateEditValue(registration.id, 'phone', e.target.value)}
                    style={inputStyle}
                  />
                  <select
                    value={editValues.member_status}
                    onChange={(e) => updateEditValue(registration.id, 'member_status', e.target.value)}
                    style={inputStyle}
                  >
                    <option value="unknown">Unbekannt</option>
                    <option value="member">Mitglied</option>
                    <option value="guest">Gast</option>
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={editValues.participant_count}
                    onChange={(e) => updateEditValue(registration.id, 'participant_count', e.target.value)}
                    style={inputStyle}
                  />
                  <select
                    value={editValues.status}
                    onChange={(e) => updateEditValue(registration.id, 'status', e.target.value)}
                    style={inputStyle}
                  >
                    <option value="registered">Angemeldet</option>
                    <option value="waitlist">Warteliste</option>
                    <option value="cancelled">Abgesagt</option>
                  </select>
                  <textarea
                    value={editValues.note}
                    onChange={(e) => updateEditValue(registration.id, 'note', e.target.value)}
                    style={{ ...inputStyle, minHeight: 84, resize: 'vertical', gridColumn: '1 / -1' }}
                  />
                  <button type="button" onClick={() => handleUpdate(registration.id)} disabled={saving} style={buttonStyle}>
                    Speichern
                  </button>
                  <button type="button" onClick={() => cancelEdit(registration.id)} style={secondaryButtonStyle}>
                    Abbrechen
                  </button>
                </div>
              ) : (
                <>
                  <strong>{registration.full_name}</strong>
                  <span style={statusBadgeStyle}>{statusLabels[registration.status] || registration.status}</span>
                  <br />
                  E-Mail: {registration.email}
                  <br />
                  Telefon: {registration.phone || '-'}
                  <br />
                  Mitgliedsstatus: {memberStatusLabels[registration.member_status] || registration.member_status}
                  <br />
                  Teilnehmeranzahl: {registration.participant_count}
                  <br />
                  Notiz: {registration.note || '-'}
                  <br />
                  Benachrichtigung: {getNotificationLabel(registration)}
                  {registration.notification_error ? <> · Fehler: {registration.notification_error}</> : null}
                  <br />
                  Erstellt: {formatDateTime(registration.created_at)}
                  <br />
                  <button type="button" onClick={() => beginEdit(registration)} style={buttonStyle}>
                    Bearbeiten
                  </button>
                  <button type="button" onClick={() => sendConfirmation(registration)} disabled={sendingId === registration.id} style={secondaryButtonStyle}>
                    Bestätigung senden
                  </button>
                  <button type="button" onClick={() => sendReminder(registration)} disabled={sendingId === registration.id} style={secondaryButtonStyle}>
                    Erinnerung senden
                  </button>
                  {registration.status !== 'cancelled' ? (
                    <button type="button" onClick={() => handleCancel(registration)} style={secondaryButtonStyle}>
                      Absagen
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleDelete(registration)}
                    style={{ ...secondaryButtonStyle, borderColor: '#b91c1c', color: '#b91c1c' }}
                  >
                    Löschen
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function getParticipantCount(registrations, status) {
  return registrations
    .filter((registration) => registration.status === status)
    .reduce((sum, registration) => sum + (Number(registration.participant_count) || 0), 0)
}

function getConfirmationNotification(registration) {
  if (registration.status === 'waitlist') {
    return {
      type: 'waitlist_confirmation',
      builder: buildWaitlistEmail,
    }
  }

  if (registration.status === 'cancelled') {
    return {
      type: 'cancellation_notification',
      builder: buildCancellationEmail,
    }
  }

  return {
    type: 'registration_confirmation',
    builder: buildRegistrationConfirmationEmail,
  }
}

function toEditableRegistration(registration) {
  return {
    full_name: registration.full_name || '',
    email: registration.email || '',
    phone: registration.phone || '',
    member_status: registration.member_status || 'unknown',
    participant_count: String(registration.participant_count || 1),
    note: registration.note || '',
    status: registration.status || 'registered',
  }
}

function formatDateTime(value) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getNotificationLabel(registration) {
  if (registration.notification_status === 'error') return 'Fehler'
  if (registration.notification_status === 'sent' || registration.confirmation_sent_at || registration.reminder_sent_at) return 'gesendet'
  return 'nicht gesendet'
}

const sectionBoxStyle = {
  marginTop: 20,
  padding: 16,
  border: '1px solid #d1d5db',
  borderRadius: 8,
  background: '#ffffff',
}

const summaryStyle = {
  ...mutedTextStyle,
  margin: '0 0 14px',
}

const formGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 10,
  alignItems: 'start',
  marginBottom: 16,
}

const listStyle = {
  display: 'grid',
  gap: 12,
}

const statusBadgeStyle = {
  display: 'inline-block',
  marginLeft: 8,
  padding: '2px 8px',
  borderRadius: 999,
  background: '#fef3c7',
  color: '#92400e',
  fontSize: 12,
  fontWeight: 800,
}

const previewStyle = {
  ...cardStyle,
  background: '#f8fafc',
  borderColor: '#cbd5e1',
  marginBottom: 16,
}

const previewTextStyle = {
  whiteSpace: 'pre-wrap',
  margin: '10px 0 0',
  fontFamily: 'inherit',
}
