import { supabase } from '../../lib/supabase'

export async function fetchEvents() {
  return supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: false })
    .order('created_at', { ascending: false })
}

export async function fetchEventCheckins() {
  return supabase
    .from('event_checkins')
    .select('*')
    .order('checkin_time', { ascending: false })
}

export async function createEventRecord({
  payload,
  createAuditLog,
  loadEvents,
  resetEventForm,
  setSelectedEventId,
  setEventName,
  alertFn = alert,
}) {
  const { data, error } = await supabase
    .from('events')
    .insert({
      ...payload,
      status: 'geplant',
    })
    .select()
    .single()

  if (error) return { error }

  await createAuditLog('insert', 'events', data?.id, null, data)

  resetEventForm()
  await loadEvents()

  if (data) {
    setSelectedEventId(data.id)
    setEventName(data.name)
  }

  alertFn('Event wurde angelegt.')
  return { ok: true }
}

export async function updateEventRecord({
  editingEventId,
  payload,
  events,
  createAuditLog,
  loadEvents,
  resetEventForm,
  selectedEventId,
  setEventName,
  alertFn = alert,
}) {
  const { error } = await supabase
    .from('events')
    .update(payload)
    .eq('id', editingEventId)

  if (error) return { error }

  await createAuditLog('update', 'events', editingEventId, events.find((event) => event.id === editingEventId), payload)

  if (selectedEventId === editingEventId) {
    setEventName(payload.name)
  }

  resetEventForm()
  await loadEvents()
  alertFn('Event wurde aktualisiert.')
  return { ok: true }
}

export async function updateEventStatusRecord({
  eventId,
  status,
  events,
  createAuditLog,
  loadEvents,
}) {
  const { error } = await supabase
    .from('events')
    .update({ status })
    .eq('id', eventId)

  if (error) return { error }

  await createAuditLog('status_change', 'events', eventId, events.find((event) => event.id === eventId), { status })

  await loadEvents()
  return { ok: true }
}

export async function deleteEventRecord({
  event,
  cashEntries,
  eventCheckins,
  createAuditLog,
  loadEvents,
  loadCashEntries,
  selectedEventId,
  editingEventId,
  setSelectedEventId,
  setCashEventId,
  setEventName,
  resetEventForm,
  alertFn = alert,
}) {
  const hasCashEntries = cashEntries.some((entry) => entry.event_id === event.id)
  const hasCheckins = eventCheckins.some((checkin) => checkin.event_name === event.name)

  const warning = [
    `Event wirklich löschen?`,
    ``,
    event.name || '',
    ``,
    hasCashEntries ? 'Achtung: Es gibt Kassa-Einträge zu diesem Event. Diese bleiben bestehen, verlieren aber die Event-Zuordnung.' : '',
    hasCheckins ? 'Achtung: Es gibt Check-ins zu diesem Event. Diese bleiben in der Datenbank, sind aber nicht mehr in der Eventliste sichtbar.' : '',
    ``,
    'Das kann nicht rückgängig gemacht werden.',
  ]
    .filter((line) => line !== '')
    .join('\n')

  const confirmed = window.confirm(warning)

  if (!confirmed) return { skipped: true }

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', event.id)

  if (error) return { error }

  await createAuditLog('delete', 'events', event.id, event, null)

  if (selectedEventId === event.id) {
    setSelectedEventId('')
    setCashEventId('')
    setEventName('')
  }

  if (editingEventId === event.id) {
    resetEventForm()
  }

  await loadEvents()
  await loadCashEntries()

  alertFn('Event wurde gelöscht.')
  return { ok: true }
}

export async function checkInMemberRecord({
  member,
  canUseCheckin,
  getActiveEventName,
  isCheckedInToday,
  getTodayDate,
  loadEventCheckins,
  alertFn = alert,
}) {
  if (!canUseCheckin()) return { blocked: true, reason: 'permissions' }

  const activeEventName = getActiveEventName()

  if (!activeEventName) {
    alertFn('Bitte zuerst ein Event auswählen oder anlegen.')
    return { blocked: true, reason: 'no-event' }
  }

  if (isCheckedInToday(member.id)) {
    alertFn(`${member.first_name} ${member.last_name} ist für dieses Event heute bereits eingecheckt.`)
    return { blocked: true, reason: 'already-checked-in' }
  }

  const { error } = await supabase.from('event_checkins').insert({
    member_id: member.id,
    event_name: activeEventName,
    checkin_date: getTodayDate(),
  })

  if (error) return { error }

  await loadEventCheckins()
  alertFn(`Check-in erfolgreich: ${member.first_name} ${member.last_name} für ${activeEventName}`)
  return { ok: true }
}
