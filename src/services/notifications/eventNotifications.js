const clubName = 'Styrian Bastards'

export function buildRegistrationConfirmationEmail({ event, registration }) {
  const eventTitle = getEventTitle(event)
  const greetingName = getGreetingName(registration)

  return buildEmail({
    subject: `Anmeldung bestätigt: ${eventTitle}`,
    previewText: `Deine Anmeldung für ${eventTitle} wurde eingetragen.`,
    text: [
      `Hallo ${greetingName},`,
      '',
      `deine Anmeldung für ${eventTitle} wurde eingetragen.`,
      buildEventLine(event),
      buildParticipantLine(registration),
      '',
      'Danke und sportliche Grüße',
      clubName,
    ],
  })
}

export function buildWaitlistEmail({ event, registration }) {
  const eventTitle = getEventTitle(event)
  const greetingName = getGreetingName(registration)

  return buildEmail({
    subject: `Warteliste: ${eventTitle}`,
    previewText: `Du wurdest für ${eventTitle} auf die Warteliste gesetzt.`,
    text: [
      `Hallo ${greetingName},`,
      '',
      `das Event ${eventTitle} ist aktuell voll. Du wurdest auf die Warteliste gesetzt.`,
      buildEventLine(event),
      buildParticipantLine(registration),
      '',
      'Wir melden uns, sobald ein Platz frei wird.',
      '',
      'Sportliche Grüße',
      clubName,
    ],
  })
}

export function buildCancellationEmail({ event, registration }) {
  const eventTitle = getEventTitle(event)
  const greetingName = getGreetingName(registration)

  return buildEmail({
    subject: `Anmeldung storniert: ${eventTitle}`,
    previewText: `Deine Anmeldung für ${eventTitle} wurde storniert.`,
    text: [
      `Hallo ${greetingName},`,
      '',
      `deine Anmeldung für ${eventTitle} wurde storniert.`,
      buildEventLine(event),
      '',
      'Falls das nicht korrekt ist, melde dich bitte direkt beim Verein.',
      '',
      'Sportliche Grüße',
      clubName,
    ],
  })
}

export function buildEventReminderEmail({ event, registration }) {
  const eventTitle = getEventTitle(event)
  const greetingName = getGreetingName(registration)

  return buildEmail({
    subject: `Erinnerung: ${eventTitle}`,
    previewText: `Erinnerung an ${eventTitle}.`,
    text: [
      `Hallo ${greetingName},`,
      '',
      `kurze Erinnerung an deine Anmeldung für ${eventTitle}.`,
      buildEventLine(event),
      event?.meeting_point ? `Treffpunkt: ${event.meeting_point}` : '',
      buildParticipantLine(registration),
      '',
      'Bis bald und sportliche Grüße',
      clubName,
    ],
  })
}

function buildEmail({ subject, previewText, text }) {
  const textBody = text.filter(Boolean).join('\n')

  return {
    subject,
    previewText,
    text: textBody,
    html: textBody
      .split('\n')
      .map((line) => line ? `<p>${escapeHtml(line)}</p>` : '<br />')
      .join(''),
  }
}

function getEventTitle(event) {
  return event?.public_title || event?.title || event?.name || 'Event'
}

function getGreetingName(registration) {
  return registration?.full_name || 'zusammen'
}

function buildEventLine(event) {
  const parts = [
    event?.starts_at || event?.event_date ? `Termin: ${formatDateTime(event.starts_at || event.event_date)}` : '',
    event?.location ? `Ort: ${event.location}` : '',
  ].filter(Boolean)

  return parts.join(' · ')
}

function buildParticipantLine(registration) {
  const participantCount = Number(registration?.participant_count) || 1
  return `Teilnehmeranzahl: ${participantCount}`
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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
