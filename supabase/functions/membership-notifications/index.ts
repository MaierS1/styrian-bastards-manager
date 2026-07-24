import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  buildMembershipNotificationPayload,
  buildMembershipUpdatePayload,
  dispatchMembershipNotification,
  LEGACY_MEMBERSHIP_NOTIFICATION_TYPES,
  validateMembershipNotificationState,
} from '../_shared/membershipNotificationService.js'

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
      return jsonResponse({ error: 'Server secrets fehlen.' }, 500)
    }

    if (!internalNotificationSecret) {
      console.error('membership-notifications internal notification secret missing')
      return jsonResponse({ error: 'Benachrichtigungen sind aktuell nicht verfuegbar.' }, 500)
    }

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
    }) as SupabaseClientLike

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }) as SupabaseClientLike

    const {
      data: { user },
      error: userError,
    } = await userClient.auth!.getUser!()

    if (userError || !user) {
      return jsonResponse({ error: 'Benutzer konnte nicht geprueft werden.' }, 401)
    }

    const canSendMembershipNotifications = await hasAnyPermission(userClient, [
      ['beitraege', 'edit'],
      ['kassa', 'edit'],
    ])

    if (!canSendMembershipNotifications) {
      return jsonResponse({ error: 'Keine Berechtigung fuer Beitragsbenachrichtigungen.' }, 403)
    }

    const body = await readJsonBody(req)
    const type = String(body?.type || '')
    const feeItemId = String(body?.fee_item_id || '')

    if (!LEGACY_MEMBERSHIP_NOTIFICATION_TYPES.includes(type)) {
      return jsonResponse({ error: 'Ungueltiger Mailtyp.' }, 400)
    }

    if (!feeItemId) {
      return jsonResponse({ error: 'fee_item_id ist erforderlich.' }, 400)
    }

    const { data: feeItem, error: feeItemError } = await adminClient
      .from('membership_fee_items')
      .select('*')
      .eq('id', feeItemId)
      .maybeSingle()

    if (feeItemError) {
      return jsonResponse({ error: 'Beitragsposition konnte nicht geladen werden.' }, 500)
    }

    if (!feeItem) {
      return jsonResponse({ error: 'Beitragsposition nicht gefunden.' }, 404)
    }

    const { data: member, error: memberError } = await adminClient
      .from('members')
      .select('*')
      .eq('id', feeItem.member_id)
      .maybeSingle()

    if (memberError) {
      return jsonResponse({ error: 'Mitglied konnte nicht geladen werden.' }, 500)
    }

    const stateValidation = validateMembershipNotificationState({ type, feeItem, member })
    if (!stateValidation.ok) {
      if (!type.endsWith('_test')) {
        await markMembershipNotificationError(adminClient, feeItemId, stateValidation.error)
      }
      return jsonResponse({ error: stateValidation.error }, stateValidation.status)
    }

    const { data: period, error: periodError } = await adminClient
      .from('membership_fee_periods')
      .select('*')
      .eq('id', feeItem.period_id)
      .maybeSingle()

    if (periodError) {
      return jsonResponse({ error: 'Beitragsperiode konnte nicht geladen werden.' }, 500)
    }

    const { data: paymentSettings, error: paymentSettingsError } = await adminClient
      .from('club_payment_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()

    if (paymentSettingsError) {
      return jsonResponse({ error: 'Zahlungseinstellungen konnten nicht geladen werden.' }, 500)
    }

    const payloadResult = buildMembershipNotificationPayload({
      type,
      feeItem,
      period,
      member,
      paymentSettings,
      actorUserId: user.id,
    })

    if (!payloadResult.ok) {
      return jsonResponse({ error: payloadResult.error }, payloadResult.status)
    }

    const dispatchResult = await dispatchMembershipNotification({
      notificationDispatchUrl: `${supabaseUrl}/functions/v1/notification-dispatch`,
      internalSecret: internalNotificationSecret,
      actorUserId: user.id,
      payload: payloadResult.value,
    })

    const updatePayload = buildMembershipUpdatePayload({ type, feeItem, dispatchResult })
    if (updatePayload) {
      const { error: updateError } = await adminClient
        .from('membership_fee_items')
        .update(updatePayload)
        .eq('id', feeItemId)

      if (updateError) {
        return jsonResponse({ error: 'Benachrichtigungsstatus konnte nicht gespeichert werden.' }, 500)
      }
    }

    if (!dispatchResult.ok) {
      return jsonResponse({ error: 'Benachrichtigung konnte nicht versendet werden.' }, 500)
    }

    return jsonResponse({
      success: true,
      test: type.endsWith('_test'),
      type,
      notification_type: payloadResult.value.type,
      fee_item_id: feeItemId,
      notification_job_id: dispatchResult.data?.job_id || null,
      existing: dispatchResult.data?.existing === true,
      recipient_count: dispatchResult.data?.recipient_count || 0,
      delivered_count: dispatchResult.data?.delivered_count || 0,
      skipped_count: dispatchResult.data?.skipped_count || 0,
      failed_count: dispatchResult.data?.failed_count || 0,
    })
  } catch (error) {
    console.error('membership-notifications unexpected failure', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return jsonResponse({ error: 'Interner Fehler beim Beitragsbenachrichtigungsversand.' }, 500)
  }
})

async function hasAnyPermission(client: SupabaseClientLike, checks: Array<[string, string]>) {
  for (const [module, action] of checks) {
    const { data, error } = await client.rpc('has_app_permission', {
      p_module: module,
      p_action: action,
    })

    if (!error && data === true) return true
  }

  return false
}

async function readJsonBody(req: Request) {
  try {
    return await req.json()
  } catch {
    return null
  }
}

async function markMembershipNotificationError(
  adminClient: { from: (table: string) => any },
  feeItemId: string,
  message: string,
) {
  await adminClient
    .from('membership_fee_items')
    .update({
      notification_status: 'error',
      notification_error: message,
    })
    .eq('id', feeItemId)
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
