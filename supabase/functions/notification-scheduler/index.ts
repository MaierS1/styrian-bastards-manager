import { createClient } from 'npm:@supabase/supabase-js@2'
import { buildScheduledNotificationPayloads } from '../_shared/scheduledNotificationService.js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-notification-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type SupabaseClientLike = {
  from: (table: string) => any
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }>
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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const internalNotificationSecret = Deno.env.get('INTERNAL_NOTIFICATION_SECRET') || ''
    const internalHeader = req.headers.get('x-internal-notification-secret') || ''

    if (!internalNotificationSecret || internalHeader !== internalNotificationSecret) {
      return jsonResponse({ error: 'Nicht berechtigt.' }, 401)
    }

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('notification-scheduler configuration missing', {
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasServiceRoleKey: Boolean(serviceRoleKey),
      })
      return jsonResponse({ error: 'Benachrichtigungsplanung ist aktuell nicht verfuegbar.' }, 500)
    }

    const body = await readJsonBody(req)
    const now = parseNow(body?.now)
    const today = now.toISOString().slice(0, 10)
    const horizon = new Date(`${today}T00:00:00.000Z`)
    horizon.setUTCDate(horizon.getUTCDate() + 30)
    const sponsorHorizonDate = horizon.toISOString().slice(0, 10)
    const limit = clampLimit(body?.limit)

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }) as SupabaseClientLike

    const [
      templatesResult,
      eventsResult,
      invoicesResult,
      feeItemsResult,
      financingResult,
      sponsorContractsResult,
      eventRecipientsResult,
      sponsorRecipientsResult,
    ] = await Promise.all([
      adminClient
        .from('notification_templates')
        .select('key,type,category,default_channels,title_template,body_template,priority,icon,deep_link')
        .in('type', [
          'event_registration_deadline_reached',
          'invoice_overdue',
          'financing_liability_overdue',
          'membership_fee_due',
          'sponsorship_expiring',
        ]),
      adminClient
        .from('events')
        .select('id,name,title,public_title,registration_deadline,registration_enabled,status')
        .eq('registration_enabled', true)
        .not('registration_deadline', 'is', null)
        .lte('registration_deadline', now.toISOString())
        .neq('status', 'abgesagt')
        .neq('status', 'cancelled')
        .limit(limit),
      adminClient
        .from('invoices')
        .select('id,invoice_number,customer_email,customer_name,member_id,due_date,status,is_test')
        .not('due_date', 'is', null)
        .lt('due_date', today)
        .eq('is_test', false)
        .neq('status', 'bezahlt')
        .neq('status', 'storniert')
        .limit(limit),
      adminClient
        .from('membership_fee_items')
        .select('id,period_id,member_id,amount,status,due_date,membership_fee_periods:period_id(year,title,due_date)')
        .not('due_date', 'is', null)
        .lte('due_date', today)
        .in('status', ['open', 'reminded'])
        .limit(limit),
      adminClient
        .from('financing_liability_balances')
        .select('id,creditor_member_id,creditor_name,description,due_date,status,open_amount')
        .not('due_date', 'is', null)
        .lt('due_date', today)
        .in('status', ['open', 'partially_paid'])
        .limit(limit),
      adminClient
        .from('sponsor_contracts')
        .select('id,sponsor_id,title,ends_on,status,payment_status')
        .not('ends_on', 'is', null)
        .gte('ends_on', today)
        .lte('ends_on', sponsorHorizonDate)
        .eq('status', 'active')
        .limit(limit),
      adminClient.rpc('get_members_with_app_permission', {
        p_module: 'events',
        p_action: 'edit',
      }),
      adminClient.rpc('get_members_with_app_permission', {
        p_module: 'sponsoren',
        p_action: 'view',
      }),
    ])

    const dataLoadError = [
      templatesResult.error,
      eventsResult.error,
      invoicesResult.error,
      feeItemsResult.error,
      financingResult.error,
      sponsorContractsResult.error,
      eventRecipientsResult.error,
      sponsorRecipientsResult.error,
    ].find(Boolean)

    if (dataLoadError) {
      console.error('notification-scheduler data load failed', {
        error: dataLoadError.message,
      })
      return jsonResponse({ error: 'Faellige Benachrichtigungen konnten nicht geladen werden.' }, 500)
    }

    const scheduled = buildScheduledNotificationPayloads({
      now,
      templates: templatesResult.data || [],
      events: eventsResult.data || [],
      invoices: invoicesResult.data || [],
      membershipFeeItems: feeItemsResult.data || [],
      financingLiabilities: financingResult.data || [],
      sponsorContracts: sponsorContractsResult.data || [],
      permissionRecipients: {
        'events.edit': toMemberIds(eventRecipientsResult.data),
        'sponsoren.view': toMemberIds(sponsorRecipientsResult.data),
      },
    })

    const dispatchResults = []
    for (const payload of scheduled.payloads) {
      const response = await fetch(`${supabaseUrl}/functions/v1/notification-dispatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-notification-secret': internalNotificationSecret,
        },
        body: JSON.stringify(payload),
      })

      const result = await safeReadJson(response)
      dispatchResults.push({
        type: payload.type,
        idempotency_key: payload.idempotency_key,
        ok: response.ok && !result?.error,
        status: response.status,
        job_id: result?.job_id || null,
        existing: result?.existing === true,
        error: result?.error || null,
      })
    }

    return jsonResponse({
      success: dispatchResults.every((result) => result.ok),
      today,
      considered: {
        events: eventsResult.data?.length || 0,
        invoices: invoicesResult.data?.length || 0,
        membership_fee_items: feeItemsResult.data?.length || 0,
        financing_liabilities: financingResult.data?.length || 0,
        sponsor_contracts: sponsorContractsResult.data?.length || 0,
      },
      dispatched: dispatchResults,
      skipped: scheduled.skipped,
    })
  } catch (error) {
    console.error('notification-scheduler unexpected failure', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return jsonResponse({ error: 'Interner Fehler bei geplanten Benachrichtigungen.' }, 500)
  }
})

function toMemberIds(rows: unknown) {
  if (!Array.isArray(rows)) return []
  return [...new Set(rows.map((row: any) => row?.id).filter(Boolean))]
}

function parseNow(value: unknown) {
  if (!value) return new Date()
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? new Date() : date
}

function clampLimit(value: unknown) {
  const numberValue = Number(value || 100)
  if (!Number.isFinite(numberValue)) return 100
  return Math.min(Math.max(Math.trunc(numberValue), 1), 500)
}

async function readJsonBody(req: Request) {
  try {
    return await req.json()
  } catch {
    return {}
  }
}

async function safeReadJson(response: Response) {
  try {
    return await response.json()
  } catch {
    return null
  }
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
