import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  validateInvoiceEmailPayload,
  validateInvoiceForSending,
} from './validation.js'
import {
  buildInvoiceNotificationPayload,
  buildInvoiceUpdatePayload,
  dispatchInvoiceNotification,
} from '../_shared/invoiceNotificationService.js'

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

  const startedAt = new Date().toISOString()
  let userId: string | null = null
  let invoiceIdForLog: string | null = null

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const internalNotificationSecret = Deno.env.get('INTERNAL_NOTIFICATION_SECRET') || ''

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error('invoice-email configuration missing', {
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasAnonKey: Boolean(anonKey),
        hasServiceRoleKey: Boolean(serviceRoleKey),
      })
      return jsonResponse({ error: 'E-Mail-Versand ist aktuell nicht verfuegbar.' }, 500)
    }

    if (!internalNotificationSecret) {
      console.error('invoice-email internal notification secret missing')
      return jsonResponse({ error: 'E-Mail-Versand ist aktuell nicht verfuegbar.' }, 500)
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
      return jsonResponse({ error: 'Nicht angemeldet.' }, 401)
    }

    userId = user.id

    const canSendInvoices = await hasAnyPermission(userClient, [
      ['rechnungen', 'edit'],
      ['kassa', 'edit'],
    ])

    if (!canSendInvoices) {
      await logInvoiceEmailAttempt({
        adminClient,
        status: 'failed',
        userId,
        invoiceId: null,
        errorCode: 'forbidden',
        startedAt,
      })
      return jsonResponse({ error: 'Keine Berechtigung fuer Rechnungsversand.' }, 403)
    }

    const body = await readJsonBody(req)
    const payloadResult = validateInvoiceEmailPayload(body)

    if (!payloadResult.ok) {
      await logInvoiceEmailAttempt({
        adminClient,
        status: 'failed',
        userId,
        invoiceId: null,
        errorCode: 'invalid_payload',
        startedAt,
      })
      return jsonResponse({ error: payloadResult.error }, payloadResult.status)
    }

    const payload = payloadResult.value
    invoiceIdForLog = payload.invoiceId

    const { data: invoice, error: invoiceError } = await adminClient
      .from('invoices')
      .select(`
        id,
        invoice_number,
        customer_id,
        customer_name,
        customer_email,
        status,
        is_test,
        invoice_type,
        original_invoice_id,
        created_by,
        member_id,
        membership_fee_id,
        emailed_at,
        last_reminder_at,
        reminder_count,
        pdf_url,
        issue_date,
        due_date,
        total_amount,
        updated_at
      `)
      .eq('id', payload.invoiceId)
      .maybeSingle()

    if (invoiceError) {
      console.error('invoice-email invoice lookup failed', {
        userId,
        invoiceId: payload.invoiceId,
        error: invoiceError.message,
      })
      return jsonResponse({ error: 'Rechnung konnte nicht geprueft werden.' }, 500)
    }

    const invoiceValidation = validateInvoiceForSending({
      invoice,
      reminder: payload.reminder,
      allowResend: payload.allowResend,
    })

    if (!invoiceValidation.ok) {
      await logInvoiceEmailAttempt({
        adminClient,
        status: 'failed',
        userId,
        invoiceId: payload.invoiceId,
        errorCode: `invoice_${invoiceValidation.status}`,
        startedAt,
      })
      return jsonResponse({ error: invoiceValidation.error }, invoiceValidation.status)
    }

    const payloadResult = buildInvoiceNotificationPayload({
      invoice,
      reminder: payload.reminder,
      allowResend: payload.allowResend,
      pdfBase64: payload.pdfBase64,
      mimeType: payload.mimeType,
    })

    if (!payloadResult.ok) {
      await logInvoiceEmailAttempt({
        adminClient,
        status: 'failed',
        userId,
        invoiceId: payload.invoiceId,
        errorCode: 'invalid_invoice_content',
        startedAt,
      })
      return jsonResponse({ error: payloadResult.error }, payloadResult.status)
    }

    const dispatchResult = await dispatchInvoiceNotification({
      notificationDispatchUrl: `${supabaseUrl}/functions/v1/notification-dispatch`,
      internalSecret: internalNotificationSecret,
      actorUserId: user.id,
      payload: payloadResult.value,
    })

    if (
      !dispatchResult.ok
      || Number(dispatchResult.data?.failed_count || 0) > 0
      || (dispatchResult.data?.existing !== true && Number(dispatchResult.data?.delivered_count || 0) === 0)
    ) {
      console.error('invoice-email notification dispatch failed', {
        userId,
        invoiceId: payload.invoiceId,
        status: dispatchResult.status,
        failedCount: dispatchResult.data?.failed_count || 0,
        skippedCount: dispatchResult.data?.skipped_count || 0,
      })

      await logInvoiceEmailAttempt({
        adminClient,
        status: 'failed',
        userId,
        invoiceId: payload.invoiceId,
        errorCode: 'notification_dispatch_failed',
        startedAt,
      })

      return jsonResponse({ error: 'E-Mail konnte nicht gesendet werden.' }, 500)
    }

    const updatePayload = buildInvoiceUpdatePayload({ invoice, reminder: payload.reminder, dispatchResult })
    if (updatePayload) {
      const { error: updateError } = await adminClient
        .from('invoices')
        .update(updatePayload)
        .eq('id', payload.invoiceId)

      if (updateError) {
        console.error('invoice-email status update failed', {
          userId,
          invoiceId: payload.invoiceId,
          error: updateError.message,
        })
      }
    }

    await logInvoiceEmailAttempt({
      adminClient,
      status: 'sent',
      userId,
      invoiceId: payload.invoiceId,
      startedAt,
    })

    return jsonResponse({
      success: true,
      invoice_id: payload.invoiceId,
      reminder: payload.reminder,
      notification_type: payloadResult.value.type,
      notification_job_id: dispatchResult.data?.job_id || null,
      existing: dispatchResult.data?.existing === true,
      recipient_count: dispatchResult.data?.recipient_count || 0,
      delivered_count: dispatchResult.data?.delivered_count || 0,
      skipped_count: dispatchResult.data?.skipped_count || 0,
      failed_count: dispatchResult.data?.failed_count || 0,
    })
  } catch (error) {
    console.error('invoice-email unexpected failure', {
      userId,
      invoiceId: invoiceIdForLog,
      error: error instanceof Error ? error.message : 'unknown',
    })
    return jsonResponse({ error: 'Interner Fehler beim E-Mail-Versand.' }, 500)
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

async function logInvoiceEmailAttempt({
  adminClient,
  status,
  userId,
  invoiceId,
  errorCode,
  startedAt,
}: {
  adminClient: SupabaseClientLike
  status: 'sent' | 'failed'
  userId: string | null
  invoiceId: string | null
  errorCode?: string
  startedAt: string
}) {
  const logPayload = {
    action: status === 'sent' ? 'send_invoice_email_success' : 'send_invoice_email_failed',
    table_name: 'invoices',
    record_id: invoiceId,
    old_data: null,
    new_data: {
      channel: 'email',
      status,
      user_id: userId,
      recipient_masked: null,
      error_code: errorCode || null,
      attempted_at: startedAt,
    },
    user_id: userId,
    user_email: null,
  }

  const { error } = await adminClient.from('audit_logs').insert(logPayload)

  if (error) {
    console.error('invoice-email audit log failed', {
      userId,
      invoiceId,
      status,
      error: error.message,
    })
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
