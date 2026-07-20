import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  buildEventNotificationPayload,
  buildRegistrationUpdatePayload,
  dispatchEventNotification,
  LEGACY_EVENT_NOTIFICATION_TYPES,
  validateEventNotificationState,
} from '../_shared/eventNotificationService.js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type SupabaseClientLike = {
  from: (table: string) => any
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }>
  auth?: {
    getUser?: () => Promise<{ data: { user: { id: string; email?: string } | null }; error: Error | null }>
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Nur POST ist erlaubt.' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const internalNotificationSecret = Deno.env.get('INTERNAL_NOTIFICATION_SECRET') || ''

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'Supabase Function Secrets fehlen.' }, 500)
    }

    if (!internalNotificationSecret) {
      console.error('event-notifications internal notification secret missing')
      return jsonResponse({ error: 'Benachrichtigungen sind aktuell nicht verfuegbar.' }, 500)
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }) as SupabaseClientLike

    const body = await readJsonBody(req)
    const type = String(body?.type || '').trim()
    const registrationId = String(body?.registration_id || '').trim()
    const eventId = String(body?.event_id || '').trim()
    const source = String(body?.source || '').trim()
    const isPublicRegistrationNotification = source === 'public_registration'

    if (!LEGACY_EVENT_NOTIFICATION_TYPES.includes(type)) {
      return jsonResponse({ error: 'Ungueltiger Benachrichtigungstyp.' }, 400)
    }

    if (!registrationId) {
      return jsonResponse({ error: 'registration_id ist Pflicht.' }, 400)
    }

    const authContext = isPublicRegistrationNotification
      ? { actorUserId: null }
      : await authenticateEventNotificationCaller({
          req,
          supabaseUrl,
          anonKey,
          adminClient,
          type,
        })

    if ('error' in authContext) {
      return jsonResponse({ error: authContext.error }, authContext.status)
    }

    const { data: registration, error: registrationError } = await adminClient
      .from('event_registrations')
      .select('*')
      .eq('id', registrationId)
      .maybeSingle()

    if (registrationError) {
      return jsonResponse({ error: 'Anmeldung konnte nicht geladen werden.' }, 500)
    }

    if (!registration) {
      return jsonResponse({ error: 'Anmeldung nicht gefunden.' }, 404)
    }

    if (eventId && registration.event_id !== eventId) {
      return jsonResponse({ error: 'Anmeldung gehoert nicht zum angegebenen Event.' }, 409)
    }

    const stateValidation = validateEventNotificationState({
      type,
      registration,
      isPublicRegistrationNotification,
    })

    if (!stateValidation.ok) {
      if (stateValidation.status >= 500) {
        await markNotificationError(adminClient, registrationId, stateValidation.error)
      }
      return jsonResponse({ error: stateValidation.error }, stateValidation.status)
    }

    const { data: event, error: eventError } = await adminClient
      .from('events')
      .select('*')
      .eq('id', registration.event_id)
      .maybeSingle()

    if (eventError) {
      await markNotificationError(adminClient, registrationId, 'Event konnte nicht geladen werden.')
      return jsonResponse({ error: 'Event konnte nicht geladen werden.' }, 500)
    }

    if (!event) {
      const message = 'Event nicht gefunden.'
      await markNotificationError(adminClient, registrationId, message)
      return jsonResponse({ error: message }, 404)
    }

    const payloadResult = buildEventNotificationPayload({ type, event, registration })
    if (!payloadResult.ok) {
      return jsonResponse({ error: payloadResult.error }, payloadResult.status)
    }

    const dispatchResult = await dispatchEventNotification({
      notificationDispatchUrl: `${supabaseUrl}/functions/v1/notification-dispatch`,
      internalSecret: internalNotificationSecret,
      actorUserId: authContext.actorUserId,
      payload: payloadResult.value,
    })

    const updatePayload = buildRegistrationUpdatePayload({ type, dispatchResult })
    const { error: updateError } = await adminClient
      .from('event_registrations')
      .update(updatePayload)
      .eq('id', registrationId)

    if (updateError) {
      return jsonResponse({ error: 'Benachrichtigungsstatus konnte nicht gespeichert werden.' }, 500)
    }

    if (!dispatchResult.ok) {
      return jsonResponse({ error: 'Benachrichtigung konnte nicht versendet werden.' }, 500)
    }

    return jsonResponse({
      success: true,
      type,
      notification_type: payloadResult.value.type,
      registration_id: registrationId,
      notification_job_id: dispatchResult.data?.job_id || null,
      existing: dispatchResult.data?.existing === true,
      recipient_count: dispatchResult.data?.recipient_count || 0,
      delivered_count: dispatchResult.data?.delivered_count || 0,
      skipped_count: dispatchResult.data?.skipped_count || 0,
      failed_count: dispatchResult.data?.failed_count || 0,
    })
  } catch (error) {
    console.error('event-notifications unexpected failure', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return jsonResponse({ error: 'Interner Fehler beim Event-Benachrichtigungsversand.' }, 500)
  }
})

async function authenticateEventNotificationCaller({
  req,
  supabaseUrl,
  anonKey,
  adminClient,
  type,
}: {
  req: Request
  supabaseUrl: string
  anonKey: string
  adminClient: SupabaseClientLike
  type: string
}) {
  const authHeader = req.headers.get('Authorization') || ''

  if (!authHeader.startsWith('Bearer ')) {
    return { error: 'Nicht angemeldet.', status: 401 }
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  }) as SupabaseClientLike

  const {
    data: { user },
    error: userError,
  } = await userClient.auth!.getUser!()

  if (userError || !user) {
    return { error: 'Benutzer konnte nicht geprueft werden.', status: 401 }
  }

  const canEditEvents = await hasPermission(userClient, 'events', 'edit')
  const canCreateCommunication = await hasPermission(userClient, 'kommunikation', 'create')

  if (type === 'event_reminder') {
    if (!canEditEvents || !canCreateCommunication) {
      return { error: 'Keine Berechtigung fuer Event-Erinnerungen.', status: 403 }
    }
  } else if (!canEditEvents) {
    return { error: 'Keine Berechtigung fuer Event-Benachrichtigungen.', status: 403 }
  }

  const { data: callerMember, error: callerError } = await adminClient
    .from('members')
    .select('id, app_role')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (callerError) {
    return { error: 'Benutzerrolle konnte nicht geprueft werden.', status: 500 }
  }

  if (!callerMember) {
    return { error: 'Keine Berechtigung fuer Event-Benachrichtigungen.', status: 403 }
  }

  return { actorUserId: user.id }
}

async function hasPermission(client: SupabaseClientLike, module: string, action: string) {
  const { data, error } = await client.rpc('has_app_permission', {
    p_module: module,
    p_action: action,
  })

  return !error && data === true
}

async function readJsonBody(req: Request) {
  try {
    return await req.json()
  } catch {
    return null
  }
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
