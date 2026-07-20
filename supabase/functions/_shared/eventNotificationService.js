export const EVENT_NOTIFICATION_TYPES = {
  registration_confirmation: 'event_registration_confirmed',
  waitlist_confirmation: 'event_registration_waitlisted',
  cancellation_notification: 'event_registration_cancelled',
  event_reminder: 'event_reminder',
}

export const LEGACY_EVENT_NOTIFICATION_TYPES = Object.keys(EVENT_NOTIFICATION_TYPES)

export function buildEventNotificationPayload({ type, event, registration }) {
  const notificationType = EVENT_NOTIFICATION_TYPES[type]
  if (!notificationType) {
    return { ok: false, status: 400, error: 'Ungueltiger Benachrichtigungstyp.' }
  }

  const message = buildEventMessage(type, event, registration)
  const idempotencyKey = buildEventIdempotencyKey(type, event, registration)

  return {
    ok: true,
    value: {
      type: notificationType,
      category: 'event',
      title: message.title,
      message: message.message,
      channels: ['in_app', 'email'],
      recipient_event_registration_id: registration.id,
      source: {
        module: 'events',
        entity_type: 'event_registration',
        entity_id: registration.id,
      },
      url: buildEventUrl(event),
      priority: type === 'event_reminder' ? 'normal' : 'high',
      idempotency_key: idempotencyKey,
      metadata: {
        legacy_type: type,
        event_id: event.id,
      },
    },
  }
}

export async function dispatchEventNotification({
  notificationDispatchUrl,
  internalSecret,
  actorUserId,
  fetchImpl = fetch,
  payload,
}) {
  if (!notificationDispatchUrl || !internalSecret) {
    return {
      ok: false,
      status: 500,
      error: 'Interne Benachrichtigungskonfiguration fehlt.',
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    'x-internal-notification-secret': internalSecret,
  }

  if (actorUserId) headers['x-internal-actor-user-id'] = actorUserId

  const response = await fetchImpl(notificationDispatchUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  const result = await safeReadJson(response)
  if (!response.ok || result?.error) {
    return {
      ok: false,
      status: response.status,
      error: result?.error || 'Benachrichtigung konnte nicht versendet werden.',
    }
  }

  return {
    ok: true,
    status: response.status,
    data: result,
  }
}

export function validateEventNotificationState({ type, registration, isPublicRegistrationNotification }) {
  if (!registration) return { ok: false, status: 404, error: 'Anmeldung nicht gefunden.' }

  if (isPublicRegistrationNotification) {
    if (!['registration_confirmation', 'waitlist_confirmation'].includes(type)) {
      return { ok: false, status: 400, error: 'Ungueltiger oeffentlicher Benachrichtigungstyp.' }
    }

    const expectedStatus = type === 'waitlist_confirmation' ? 'waitlist' : 'registered'
    if (
      registration.status !== expectedStatus
      || registration.notification_status !== 'pending'
      || registration.confirmation_sent_at
    ) {
      return { ok: false, status: 409, error: 'Oeffentliche Benachrichtigung ist fuer diese Anmeldung nicht zulaessig.' }
    }
  }

  if (type === 'registration_confirmation' && registration.status !== 'registered') {
    return { ok: false, status: 409, error: 'Bestaetigung ist nur fuer angemeldete Teams zulaessig.' }
  }

  if (type === 'waitlist_confirmation' && registration.status !== 'waitlist') {
    return { ok: false, status: 409, error: 'Wartelistenbestaetigung ist nur fuer Wartelisteneintraege zulaessig.' }
  }

  if (type === 'cancellation_notification' && registration.status !== 'cancelled') {
    return { ok: false, status: 409, error: 'Stornobenachrichtigung ist nur fuer stornierte Teams zulaessig.' }
  }

  if (type === 'event_reminder' && registration.status !== 'registered') {
    return { ok: false, status: 409, error: 'Erinnerungen sind nur fuer angemeldete Teams zulaessig.' }
  }

  return { ok: true }
}

export function buildRegistrationUpdatePayload({ type, dispatchResult }) {
  if (!dispatchResult.ok || Number(dispatchResult.data?.failed_count || 0) > 0) {
    return {
      notification_status: 'error',
      notification_error: dispatchResult.error || 'Benachrichtigung konnte nicht vollstaendig versendet werden.',
    }
  }

  const now = new Date().toISOString()
  if (type === 'event_reminder') {
    return {
      reminder_sent_at: now,
      notification_status: 'sent',
      notification_error: null,
    }
  }

  return {
    confirmation_sent_at: now,
    notification_status: 'sent',
    notification_error: null,
  }
}

export function buildEventMessage(type, event, registration) {
  if (type === 'waitlist_confirmation') return buildWaitlistMessage(event, registration)
  if (type === 'cancellation_notification') return buildCancellationMessage(event, registration)
  if (type === 'event_reminder') return buildReminderMessage(event, registration)
  return buildRegistrationMessage(event, registration)
}

export function buildEventIdempotencyKey(type, event, registration) {
  if (type === 'event_reminder') {
    return `event-reminder:${event.id}:${registration.id}:${registration.reminder_sent_at || 'initial'}`
  }

  if (type === 'cancellation_notification') {
    return `event-registration-cancelled:${registration.id}:${registration.updated_at || registration.status || 'cancelled'}`
  }

  if (type === 'waitlist_confirmation') {
    return `event-registration-waitlisted:${registration.id}:${registration.confirmation_sent_at || 'initial'}`
  }

  return `event-registration-confirmed:${registration.id}:${registration.confirmation_sent_at || 'initial'}`
}

function buildRegistrationMessage(event, registration) {
  const eventTitle = getEventTitle(event)
  return {
    title: `Anmeldung bestaetigt: ${eventTitle}`,
    message: [
      `Hallo ${getGreetingName(registration)},`,
      '',
      `deine Anmeldung fuer ${eventTitle} wurde eingetragen.`,
      buildEventLine(event),
      buildTeamLine(registration),
      buildParticipantLine(registration),
      '',
      'Danke und sportliche Gruesse',
      'Styrian Bastards',
    ].filter(Boolean).join('\n'),
  }
}

function buildWaitlistMessage(event, registration) {
  const eventTitle = getEventTitle(event)
  return {
    title: `Warteliste: ${eventTitle}`,
    message: [
      `Hallo ${getGreetingName(registration)},`,
      '',
      `das Event ${eventTitle} ist aktuell voll. Du wurdest auf die Warteliste gesetzt.`,
      buildEventLine(event),
      buildTeamLine(registration),
      buildParticipantLine(registration),
      '',
      'Wir melden uns, sobald ein Platz frei wird.',
      '',
      'Sportliche Gruesse',
      'Styrian Bastards',
    ].filter(Boolean).join('\n'),
  }
}

function buildCancellationMessage(event, registration) {
  const eventTitle = getEventTitle(event)
  return {
    title: `Anmeldung storniert: ${eventTitle}`,
    message: [
      `Hallo ${getGreetingName(registration)},`,
      '',
      `deine Anmeldung fuer ${eventTitle} wurde storniert.`,
      buildEventLine(event),
      '',
      'Falls das nicht korrekt ist, melde dich bitte direkt beim Verein.',
      '',
      'Sportliche Gruesse',
      'Styrian Bastards',
    ].filter(Boolean).join('\n'),
  }
}

function buildReminderMessage(event, registration) {
  const eventTitle = getEventTitle(event)
  return {
    title: `Erinnerung: ${eventTitle}`,
    message: [
      `Hallo ${getGreetingName(registration)},`,
      '',
      `kurze Erinnerung an deine Anmeldung fuer ${eventTitle}.`,
      buildEventLine(event),
      event?.meeting_point ? `Treffpunkt: ${event.meeting_point}` : '',
      buildTeamLine(registration),
      buildParticipantLine(registration),
      '',
      'Bis bald und sportliche Gruesse',
      'Styrian Bastards',
    ].filter(Boolean).join('\n'),
  }
}

function buildEventUrl(event) {
  return event?.id ? `/events/${event.id}` : '/events'
}

function getEventTitle(event) {
  return String(event?.public_title || event?.title || event?.name || 'Event')
}

function getGreetingName(registration) {
  return String(registration?.full_name || 'zusammen')
}

function buildEventLine(event) {
  const parts = [
    event?.starts_at || event?.event_date ? `Termin: ${formatDateTime(event.starts_at || event.event_date)}` : '',
    event?.location ? `Ort: ${event.location}` : '',
  ].filter(Boolean)

  return parts.join(' - ')
}

function buildParticipantLine(registration) {
  const participantCount = Number(registration?.participant_count) || 1
  return `Teamgroesse: ${participantCount}`
}

function buildTeamLine(registration) {
  return registration?.team_name ? `Team: ${registration.team_name}` : ''
}

function formatDateTime(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return new Intl.DateTimeFormat('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

async function safeReadJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}
