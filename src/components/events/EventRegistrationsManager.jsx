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
  team_name: '',
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

const checkinStatusLabels = {
  not_checked_in: 'Nicht eingecheckt',
  checked_in: 'Eingecheckt',
  no_show: 'Nicht erschienen',
}

export function EventRegistrationsManager({ event, onRegistrationsChanged }) {
  const [registrations, setRegistrations] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [sendConfirmationOnCreate, setSendConfirmationOnCreate] = useState(false)
  const [editingById, setEditingById] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sendingId, setSendingId] = useState(null)
  const [sendingBulk, setSendingBulk] = useState(false)
  const [updatingCheckinId, setUpdatingCheckinId] = useState(null)
  const [emailPreview, setEmailPreview] = useState(null)

  const stats = useMemo(() => buildStats(registrations), [registrations])

  useEffect(() => {
    setForm(emptyForm)
    setSendConfirmationOnCreate(false)
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

    if (registration.confirmation_sent_at && !window.confirm('Bestätigung wurde bereits gesendet. Jetzt erneut senden?')) {
      return
    }

    setEmailPreview({
      registrationId: registration.id,
      type: notification.type,
      email: notification.builder({ event, registration }),
    })

    await sendNotification(registration, notification.type)
  }

  async function sendCancellation(registration) {
    setEmailPreview({
      registrationId: registration.id,
      type: 'cancellation_notification',
      email: buildCancellationEmail({ event, registration }),
    })

    await sendNotification(registration, 'cancellation_notification')
  }

  async function sendReminder(registration) {
    if (registration.reminder_sent_at && !window.confirm('Erinnerung wurde bereits gesendet. Jetzt erneut senden?')) {
      return
    }

    setEmailPreview({
      registrationId: registration.id,
      type: 'event_reminder',
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
        return { error }
      }

      await reloadAfterChange()
      return { ok: true }
    } finally {
      setSendingId(null)
    }
  }

  async function sendAllReminders() {
    const registeredRegistrations = registrations.filter((registration) => registration.status === 'registered')
    const unsent = registeredRegistrations.filter((registration) => !registration.reminder_sent_at)
    const alreadySent = registeredRegistrations.filter((registration) => registration.reminder_sent_at)

    if (registeredRegistrations.length === 0) {
      alert('Keine angemeldeten Teams gefunden.')
      return
    }

    let targets = unsent

    if (alreadySent.length > 0) {
      const includeResend = window.confirm(
        `${unsent.length} offene Erinnerung(en), ${alreadySent.length} bereits gesendet. Bereits gesendete Erinnerungen erneut senden?`
      )
      targets = includeResend ? registeredRegistrations : unsent
    }

    if (targets.length === 0) {
      alert('Keine offenen Erinnerungen zu senden.')
      return
    }

    if (!window.confirm(`Erinnerungen an ${targets.length} angemeldete Teams senden?`)) return

    setSendingBulk(true)
    let successCount = 0
    let errorCount = 0

    for (const registration of targets) {
      const { error } = await sendEventRegistrationNotification({
        type: 'event_reminder',
        registrationId: registration.id,
      })

      if (error) {
        errorCount += 1
      } else {
        successCount += 1
      }
    }

    setSendingBulk(false)
    await reloadAfterChange()
    alert(`Erinnerungen gesendet: ${successCount}. Fehler: ${errorCount}.`)
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
      team_name: values.team_name.trim() || null,
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
    if (Number.isNaN(participantCount) || participantCount < 1) return 'Teamgröße muss mindestens 1 sein.'

    if (!['member', 'guest', 'unknown'].includes(values.member_status)) return 'Ungültiger Mitgliedsstatus.'
    if (!['registered', 'waitlist', 'cancelled'].includes(values.status)) return 'Ungültiger Anmeldestatus.'

    return ''
  }

  function resolveStatusForLimit(values, existingRegistrationId = null) {
    if (values.status !== 'registered' || !event.max_participants) return values.status

    const currentRegisteredCount = registrations
      .filter((registration) => registration.status === 'registered' && registration.id !== existingRegistrationId)
      .length

    if (currentRegisteredCount + 1 <= event.max_participants) return values.status

    const message = `Das Teamlimit ist voll (${currentRegisteredCount}/${event.max_participants}). Auf Warteliste setzen?`
    return window.confirm(message) ? 'waitlist' : ''
  }

  async function handleCreate(eventObject) {
    eventObject.preventDefault()

    const validationError = validate(form)
    if (validationError) return alert(validationError)

    const resolvedStatus = resolveStatusForLimit(form)
    if (!resolvedStatus) return

    setSaving(true)
    const { data, error } = await createEventRegistration({
      ...buildPayload({ ...form, status: resolvedStatus }),
    })

    if (!error && sendConfirmationOnCreate && ['registered', 'waitlist'].includes(resolvedStatus)) {
      const notificationType = resolvedStatus === 'waitlist' ? 'waitlist_confirmation' : 'registration_confirmation'
      const { error: notificationError } = await sendEventRegistrationNotification({
        type: notificationType,
        registrationId: data.id,
      })

      if (notificationError) {
        alert(`Team gespeichert, E-Mail aber nicht gesendet: ${notificationError.message}`)
      }
    }

    setSaving(false)

    if (error) return alert(error.message)

    setForm(emptyForm)
    setSendConfirmationOnCreate(false)
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

  async function updateCheckin(registration, checkinStatus) {
    const payload = checkinStatus === 'checked_in'
      ? { checkin_status: 'checked_in', checked_in_at: new Date().toISOString() }
      : { checkin_status: checkinStatus, checked_in_at: null }

    setUpdatingCheckinId(registration.id)
    const { error } = await updateEventRegistration(registration.id, payload)
    setUpdatingCheckinId(null)

    if (error) return alert(error.message)

    await reloadAfterChange()
  }

  async function handleDelete(registration) {
    if (!window.confirm(`Team/Anmeldung endgültig löschen?\n\n${registration.team_name || registration.full_name}`)) return

    const { error } = await deleteEventRegistration(registration.id)
    if (error) return alert(error.message)

    await reloadAfterChange()
  }

  async function reloadAfterChange() {
    await loadRegistrations()
    await onRegistrationsChanged?.()
  }

  function exportCsv() {
    if (!event?.id) return

    const headers = [
      'Eventname',
      'Teamname',
      'Name',
      'E-Mail',
      'Telefon',
      'Mitgliedsstatus',
      'Teamgröße',
      'Status',
      'Check-in Status',
      'Check-in Zeit',
      'Notiz',
      'Erstellt am',
    ]

    const rows = registrations.map((registration) => [
      getEventTitle(event),
      registration.team_name || '',
      registration.full_name,
      registration.email,
      registration.phone || '',
      memberStatusLabels[registration.member_status] || registration.member_status,
      registration.participant_count,
      statusLabels[registration.status] || registration.status,
      checkinStatusLabels[registration.checkin_status] || registration.checkin_status || checkinStatusLabels.not_checked_in,
      formatDateTime(registration.checked_in_at),
      registration.note || '',
      formatDateTime(registration.created_at),
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map(formatCsvValue).join(';'))
      .join('\r\n')

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = buildCsvFilename(event)
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  function printCheckinList() {
    const printableRows = registrations
      .filter((registration) => registration.status === 'registered')
      .map((registration) => `
        <tr>
          <td class="box"></td>
          <td>${escapeHtml(registration.team_name || '')}</td>
          <td>${escapeHtml(registration.full_name)}</td>
          <td>${escapeHtml(String(registration.participant_count || 1))}</td>
          <td>${escapeHtml(registration.note || '')}</td>
        </tr>
      `)
      .join('')

    const printWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (!printWindow) return alert('Druckfenster konnte nicht geöffnet werden.')

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Check-in-Liste ${escapeHtml(getEventTitle(event))}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { font-size: 22px; margin: 0 0 4px; }
            p { margin: 0 0 18px; color: #4b5563; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border-bottom: 1px solid #d1d5db; padding: 10px 8px; text-align: left; }
            th { background: #f3f4f6; }
            .box { width: 22px; }
            .box::before { content: ''; display: inline-block; width: 16px; height: 16px; border: 2px solid #111827; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(getEventTitle(event))}</h1>
          <p>${escapeHtml(formatEventDate(event))}</p>
          <table>
            <thead>
              <tr><th></th><th>Team</th><th>Name</th><th>Teamgröße</th><th>Notiz</th></tr>
            </thead>
            <tbody>${printableRows}</tbody>
          </table>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  if (!event?.id) {
    return (
      <section style={sectionBoxStyle}>
        <h3 style={headingStyle}>Teams verwalten</h3>
        <p style={mutedTextStyle}>Bitte zuerst ein Event auswählen.</p>
      </section>
    )
  }

  return (
    <section style={sectionBoxStyle}>
      <h3 style={headingStyle}>Teams verwalten</h3>

      <div style={statsGridStyle}>
        <StatCard label="Angemeldete Teams" value={stats.registered} />
        <StatCard label="Warteliste" value={stats.waitlist} />
        <StatCard label="Abgesagt" value={stats.cancelled} />
        <StatCard label="Eingecheckt" value={stats.checkedIn} />
        <StatCard label="Nicht erschienen" value={stats.noShow} />
        <StatCard label="Teams gesamt" value={stats.registeredTeams} />
      </div>

      <div style={toolbarStyle}>
        <button type="button" onClick={sendAllReminders} disabled={sendingBulk || registrations.length === 0} style={buttonStyle}>
          {sendingBulk ? 'Erinnerungen laufen...' : 'Erinnerungen an alle senden'}
        </button>
        <button type="button" onClick={exportCsv} disabled={registrations.length === 0} style={secondaryButtonStyle}>
          Teams exportieren CSV
        </button>
        <button type="button" onClick={printCheckinList} disabled={registrations.length === 0} style={secondaryButtonStyle}>
          Check-in-Liste drucken
        </button>
      </div>

      <form onSubmit={handleCreate} style={formGridStyle}>
        <input
          placeholder="Teamname optional"
          value={form.team_name}
          onChange={(e) => updateFormValue('team_name', e.target.value)}
          style={inputStyle}
        />
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
        <label style={checkboxStyle}>
          <input
            type="checkbox"
            checked={sendConfirmationOnCreate}
            onChange={(e) => setSendConfirmationOnCreate(e.target.checked)}
          />
          Bestätigung sofort senden
        </label>
        <button type="submit" disabled={saving} style={buttonStyle}>
          Team hinzufügen
        </button>
      </form>

      {loading ? <p style={mutedTextStyle}>Teams werden geladen...</p> : null}
      {!loading && registrations.length === 0 ? <p style={mutedTextStyle}>Noch keine Teams erfasst.</p> : null}

      {emailPreview ? (
        <div style={previewStyle}>
          <strong>E-Mail-Vorschau</strong>
          <br />
          Typ: {getEmailPreviewLabel(emailPreview.type)}
          <br />
          Betreff: {emailPreview.email.subject}
          <pre style={previewTextStyle}>{emailPreview.email.text}</pre>
        </div>
      ) : null}

      <div style={listStyle}>
        {registrations.map((registration) => {
          const editValues = editingById[registration.id]
          const isBusy = sendingId === registration.id || updatingCheckinId === registration.id

          return (
            <div key={registration.id} style={cardStyle}>
              {editValues ? (
                <div style={formGridStyle}>
                  <input
                    value={editValues.team_name}
                    onChange={(e) => updateEditValue(registration.id, 'team_name', e.target.value)}
                    placeholder="Teamname optional"
                    style={inputStyle}
                  />
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
                  {registration.team_name ? <> · Team: <strong>{registration.team_name}</strong></> : null}
                  <span style={statusBadgeStyle}>{statusLabels[registration.status] || registration.status}</span>
                  <span style={checkinBadgeStyle}>{checkinStatusLabels[registration.checkin_status] || checkinStatusLabels.not_checked_in}</span>
                  <br />
                  E-Mail: {registration.email}
                  <br />
                  Telefon: {registration.phone || '-'}
                  <br />
                  Mitgliedsstatus: {memberStatusLabels[registration.member_status] || registration.member_status}
                  <br />
                  Teamgröße: {registration.participant_count}
                  <br />
                  Check-in-Zeit: {formatDateTime(registration.checked_in_at)}
                  <br />
                  Notiz: {registration.note || '-'}
                  <br />
                  Benachrichtigung: {getNotificationLabel(registration)}
                  {registration.notification_error ? <> · Fehler: {registration.notification_error}</> : null}
                  <br />
                  Erstellt: {formatDateTime(registration.created_at)}
                  <div style={actionRowStyle}>
                    <button type="button" onClick={() => beginEdit(registration)} style={buttonStyle}>
                      Bearbeiten
                    </button>
                    <button type="button" onClick={() => sendConfirmation(registration)} disabled={isBusy} style={secondaryButtonStyle}>
                      {registration.confirmation_sent_at ? 'Bestätigung erneut senden' : 'Bestätigung senden'}
                    </button>
                    {registration.status === 'cancelled' ? (
                      <button type="button" onClick={() => sendCancellation(registration)} disabled={isBusy} style={secondaryButtonStyle}>
                        Stornierungs-Mail senden
                      </button>
                    ) : null}
                    {registration.status === 'registered' ? (
                      <button type="button" onClick={() => sendReminder(registration)} disabled={isBusy} style={secondaryButtonStyle}>
                        {registration.reminder_sent_at ? 'Erinnerung erneut senden' : 'Erinnerung senden'}
                      </button>
                    ) : null}
                    {registration.status !== 'cancelled' ? (
                      <button type="button" onClick={() => handleCancel(registration)} style={secondaryButtonStyle}>
                        Absagen
                      </button>
                    ) : null}
                    <button type="button" onClick={() => updateCheckin(registration, 'checked_in')} disabled={isBusy} style={secondaryButtonStyle}>
                      Einchecken
                    </button>
                    <button type="button" onClick={() => updateCheckin(registration, 'no_show')} disabled={isBusy} style={secondaryButtonStyle}>
                      Nicht erschienen
                    </button>
                    <button type="button" onClick={() => updateCheckin(registration, 'not_checked_in')} disabled={isBusy} style={secondaryButtonStyle}>
                      Check-in zurücksetzen
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(registration)}
                      style={{ ...secondaryButtonStyle, borderColor: '#b91c1c', color: '#b91c1c' }}
                    >
                      Löschen
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function StatCard({ label, value }) {
  return (
    <div style={statCardStyle}>
      <span style={statLabelStyle}>{label}</span>
      <strong style={statValueStyle}>{value}</strong>
    </div>
  )
}

function buildStats(registrations) {
  return {
    registered: registrations.filter((registration) => registration.status === 'registered').length,
    waitlist: registrations.filter((registration) => registration.status === 'waitlist').length,
    cancelled: registrations.filter((registration) => registration.status === 'cancelled').length,
    checkedIn: registrations.filter((registration) => registration.checkin_status === 'checked_in').length,
    noShow: registrations.filter((registration) => registration.checkin_status === 'no_show').length,
    registeredTeams: registrations.filter((registration) => registration.status === 'registered').length,
  }
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
    team_name: registration.team_name || '',
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

function formatEventDate(event) {
  return formatDateTime(event?.starts_at || event?.event_date)
}

function getNotificationLabel(registration) {
  const parts = []

  if (registration.confirmation_sent_at) parts.push(`Bestätigung ${formatDateTime(registration.confirmation_sent_at)}`)
  if (registration.reminder_sent_at) parts.push(`Erinnerung ${formatDateTime(registration.reminder_sent_at)}`)
  if (parts.length > 0) return parts.join(' | ')
  if (registration.notification_status === 'pending') return 'ausstehend'
  if (registration.notification_status === 'error') return 'Fehler'
  if (registration.notification_status === 'sent') return 'gesendet'
  return 'nicht gesendet'
}

function getEmailPreviewLabel(type) {
  if (type === 'event_reminder') return 'Erinnerung'
  if (type === 'cancellation_notification') return 'Stornierung'
  if (type === 'waitlist_confirmation') return 'Warteliste'
  return 'Bestätigung'
}

function getEventTitle(event) {
  return event?.public_title || event?.title || event?.name || 'Event'
}

function formatCsvValue(value) {
  const normalized = value == null ? '' : String(value)
  return `"${normalized.replaceAll('"', '""')}"`
}

function buildCsvFilename(event) {
  const yearSource = event?.starts_at || event?.event_date || new Date().toISOString()
  const year = new Date(yearSource).getFullYear() || new Date().getFullYear()
  const slug = slugify(getEventTitle(event))
  return `event-teams-${slug}-${year}.csv`
}

function slugify(value) {
  return String(value || 'event')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'event'
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

const sectionBoxStyle = {
  marginTop: 20,
  padding: 16,
  border: '1px solid #d1d5db',
  borderRadius: 8,
  background: '#ffffff',
}

const formGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 10,
  alignItems: 'start',
  marginBottom: 16,
}

const statsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: 10,
  marginBottom: 14,
}

const statCardStyle = {
  padding: 12,
  border: '1px solid #d1d5db',
  borderRadius: 8,
  background: '#f9fafb',
}

const statLabelStyle = {
  display: 'block',
  color: '#6b7280',
  fontSize: 12,
  fontWeight: 700,
}

const statValueStyle = {
  display: 'block',
  marginTop: 4,
  fontSize: 22,
}

const toolbarStyle = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  marginBottom: 16,
}

const checkboxStyle = {
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  color: '#374151',
  fontWeight: 700,
}

const listStyle = {
  display: 'grid',
  gap: 12,
}

const actionRowStyle = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  marginTop: 12,
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

const checkinBadgeStyle = {
  display: 'inline-block',
  marginLeft: 8,
  padding: '2px 8px',
  borderRadius: 999,
  background: '#dbeafe',
  color: '#1d4ed8',
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
