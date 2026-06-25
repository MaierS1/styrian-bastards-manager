import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const fromEmail = 'Styrian Bastards <mail@styrian-bastards.at>'
const allowedTypes = [
  'registration_confirmation',
  'waitlist_confirmation',
  'cancellation_notification',
  'event_reminder',
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'Supabase Function Secrets fehlen.' }, 500)
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const body = await req.json()
    const type = String(body.type || '').trim()
    const registrationId = String(body.registration_id || '').trim()
    const source = String(body.source || '').trim()
    const isPublicRegistrationNotification = source === 'public_registration'

    if (!allowedTypes.includes(type)) {
      return jsonResponse({ error: 'Ungültiger Benachrichtigungstyp.' }, 400)
    }

    if (!registrationId) {
      return jsonResponse({ error: 'registration_id ist Pflicht.' }, 400)
    }

    if (isPublicRegistrationNotification) {
      if (!['registration_confirmation', 'waitlist_confirmation'].includes(type)) {
        return jsonResponse({ error: 'Ungültiger öffentlicher Benachrichtigungstyp.' }, 400)
      }
    } else {
      const authHeader = req.headers.get('Authorization') || ''

      if (!authHeader.startsWith('Bearer ')) {
        return jsonResponse({ error: 'Nicht angemeldet.' }, 401)
      }

      const userClient = createClient(supabaseUrl, anonKey, {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      })

      const {
        data: { user },
        error: userError,
      } = await userClient.auth.getUser()

      if (userError || !user) {
        return jsonResponse({ error: 'Benutzer konnte nicht geprüft werden.' }, 401)
      }

      const { data: callerMember, error: callerError } = await adminClient
        .from('members')
        .select('id, app_role, email')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      if (callerError) {
        return jsonResponse({ error: callerError.message }, 500)
      }

      if (!callerMember || !['admin', 'super_admin', 'administrator', 'vorstand'].includes(callerMember.app_role)) {
        return jsonResponse({ error: 'Keine Berechtigung für Event-Benachrichtigungen.' }, 403)
      }
    }

    const { data: registration, error: registrationError } = await adminClient
      .from('event_registrations')
      .select('*')
      .eq('id', registrationId)
      .maybeSingle()

    if (registrationError) {
      return jsonResponse({ error: registrationError.message }, 500)
    }

    if (!registration) {
      return jsonResponse({ error: 'Anmeldung nicht gefunden.' }, 404)
    }

    if (isPublicRegistrationNotification) {
      const expectedStatus = type === 'waitlist_confirmation' ? 'waitlist' : 'registered'

      if (
        registration.status !== expectedStatus ||
        registration.notification_status !== 'pending' ||
        registration.confirmation_sent_at
      ) {
        return jsonResponse({ error: 'Öffentliche Benachrichtigung ist für diese Anmeldung nicht zulässig.' }, 409)
      }
    }

    const { data: event, error: eventError } = await adminClient
      .from('events')
      .select('*')
      .eq('id', registration.event_id)
      .maybeSingle()

    if (eventError) {
      await markNotificationError(adminClient, registrationId, eventError.message)
      return jsonResponse({ error: eventError.message }, 500)
    }

    if (!event) {
      const message = 'Event nicht gefunden.'
      await markNotificationError(adminClient, registrationId, message)
      return jsonResponse({ error: message }, 404)
    }

    if (!registration.email) {
      const message = 'Für diese Anmeldung ist keine E-Mail-Adresse hinterlegt.'
      await markNotificationError(adminClient, registrationId, message)
      return jsonResponse({ error: message }, 400)
    }

    if (!resendApiKey) {
      const message = 'RESEND_API_KEY fehlt in den Supabase Function Secrets.'
      await markNotificationError(adminClient, registrationId, message)
      return jsonResponse({ error: message }, 500)
    }

    const email = buildEmail(type, event, registration)

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [registration.email],
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      const message = result?.message || 'E-Mail konnte nicht gesendet werden.'
      await markNotificationError(adminClient, registrationId, message)
      return jsonResponse({ error: message, detail: result }, 400)
    }

    const updatePayload = type === 'event_reminder'
      ? {
        reminder_sent_at: new Date().toISOString(),
        notification_status: 'sent',
        notification_error: null,
      }
      : {
        confirmation_sent_at: new Date().toISOString(),
        notification_status: 'sent',
        notification_error: null,
      }

    const { error: updateError } = await adminClient
      .from('event_registrations')
      .update(updatePayload)
      .eq('id', registrationId)

    if (updateError) {
      return jsonResponse({ error: updateError.message }, 500)
    }

    return jsonResponse({
      success: true,
      type,
      registration_id: registrationId,
      to: registration.email,
      result,
    })
  } catch (error) {
    return jsonResponse({ error: getErrorMessage(error, 'Unbekannter Fehler.') }, 500)
  }
})

function buildEmail(type: string, event: Record<string, unknown>, registration: Record<string, unknown>) {
  if (type === 'waitlist_confirmation') return buildWaitlistEmail(event, registration)
  if (type === 'cancellation_notification') return buildCancellationEmail(event, registration)
  if (type === 'event_reminder') return buildEventReminderEmail(event, registration)
  return buildRegistrationConfirmationEmail(event, registration)
}

function buildRegistrationConfirmationEmail(event: Record<string, unknown>, registration: Record<string, unknown>) {
  const eventTitle = getEventTitle(event)
  const greetingName = getGreetingName(registration)

  return formatEmail({
    subject: `Anmeldung bestätigt: ${eventTitle}`,
    previewText: `Deine Anmeldung für ${eventTitle} wurde eingetragen.`,
    text: [
      `Hallo ${greetingName},`,
      '',
      `deine Anmeldung für ${eventTitle} wurde eingetragen.`,
      buildEventLine(event),
      buildTeamLine(registration),
      buildParticipantLine(registration),
      '',
      'Danke und sportliche Grüße',
      'Styrian Bastards',
    ],
  })
}

function buildWaitlistEmail(event: Record<string, unknown>, registration: Record<string, unknown>) {
  const eventTitle = getEventTitle(event)
  const greetingName = getGreetingName(registration)

  return formatEmail({
    subject: `Warteliste: ${eventTitle}`,
    previewText: `Du wurdest für ${eventTitle} auf die Warteliste gesetzt.`,
    text: [
      `Hallo ${greetingName},`,
      '',
      `das Event ${eventTitle} ist aktuell voll. Du wurdest auf die Warteliste gesetzt.`,
      buildEventLine(event),
      buildTeamLine(registration),
      buildParticipantLine(registration),
      '',
      'Wir melden uns, sobald ein Platz frei wird.',
      '',
      'Sportliche Grüße',
      'Styrian Bastards',
    ],
  })
}

function buildCancellationEmail(event: Record<string, unknown>, registration: Record<string, unknown>) {
  const eventTitle = getEventTitle(event)
  const greetingName = getGreetingName(registration)

  return formatEmail({
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
      'Styrian Bastards',
    ],
  })
}

function buildEventReminderEmail(event: Record<string, unknown>, registration: Record<string, unknown>) {
  const eventTitle = getEventTitle(event)
  const greetingName = getGreetingName(registration)

  return formatEmail({
    subject: `Erinnerung: ${eventTitle}`,
    previewText: `Erinnerung an ${eventTitle}.`,
    text: [
      `Hallo ${greetingName},`,
      '',
      `kurze Erinnerung an deine Anmeldung für ${eventTitle}.`,
      buildEventLine(event),
      event.meeting_point ? `Treffpunkt: ${event.meeting_point}` : '',
      buildTeamLine(registration),
      buildParticipantLine(registration),
      '',
      'Bis bald und sportliche Grüße',
      'Styrian Bastards',
    ],
  })
}

function formatEmail({ subject, previewText, text }: { subject: string; previewText: string; text: string[] }) {
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

function getEventTitle(event: Record<string, unknown>) {
  return String(event.public_title || event.title || event.name || 'Event')
}

function getGreetingName(registration: Record<string, unknown>) {
  return String(registration.full_name || 'zusammen')
}

function buildEventLine(event: Record<string, unknown>) {
  const startsAt = event.starts_at || event.event_date
  const parts = [
    startsAt ? `Termin: ${formatDateTime(String(startsAt))}` : '',
    event.location ? `Ort: ${event.location}` : '',
  ].filter(Boolean)

  return parts.join(' · ')
}

function buildParticipantLine(registration: Record<string, unknown>) {
  const participantCount = Number(registration.participant_count) || 1
  return `Teamgröße: ${participantCount}`
}

function buildTeamLine(registration: Record<string, unknown>) {
  return registration.team_name ? `Team: ${registration.team_name}` : ''
}

function formatDateTime(value: string) {
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

function escapeHtml(value: string) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

async function markNotificationError(
  adminClient: { from: (table: string) => any },
  registrationId: string,
  message: string,
) {
  await adminClient
    .from('event_registrations')
    .update({
      notification_status: 'error',
      notification_error: message,
    })
    .eq('id', registrationId)
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}
