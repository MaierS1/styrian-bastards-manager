import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  buildInvoiceEmail,
  maskEmail,
  validateInvoiceEmailPayload,
  validateInvoiceForSending,
} from './validation.js'

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
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'Styrian Bastards <noreply@example.com>'

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !resendApiKey) {
      console.error('invoice-email configuration missing', {
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasAnonKey: Boolean(anonKey),
        hasServiceRoleKey: Boolean(serviceRoleKey),
        hasResendApiKey: Boolean(resendApiKey),
      })
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
        pdf_url
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

    const message = buildInvoiceEmail({
      invoice,
      reminder: payload.reminder,
    })

    if (!message.ok) {
      await logInvoiceEmailAttempt({
        adminClient,
        status: 'failed',
        userId,
        invoiceId: payload.invoiceId,
        errorCode: 'invalid_invoice_content',
        startedAt,
      })
      return jsonResponse({ error: message.error }, message.status)
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [invoice.customer_email],
        subject: message.subject,
        html: message.html,
        attachments: [
          {
            filename: payload.filename,
            content: payload.pdfBase64,
          },
        ],
      }),
    })

    const resendResult = await safeReadJson(resendResponse)

    if (!resendResponse.ok) {
      console.error('invoice-email resend failed', {
        userId,
        invoiceId: payload.invoiceId,
        recipient: maskEmail(invoice.customer_email),
        httpStatus: resendResponse.status,
        providerCode: getProviderCode(resendResult),
        providerMessage: getProviderMessage(resendResult),
      })

      await logInvoiceEmailAttempt({
        adminClient,
        status: 'failed',
        userId,
        invoiceId: payload.invoiceId,
        recipientEmail: invoice.customer_email,
        errorCode: 'resend_failed',
        providerResponse: {
          http_status: resendResponse.status,
          code: getProviderCode(resendResult),
        },
        startedAt,
      })

      return jsonResponse({ error: 'E-Mail konnte nicht gesendet werden.' }, 500)
    }

    const resendMessageId = getResendMessageId(resendResult)
    const now = new Date().toISOString()
    const updatePayload = payload.reminder
      ? {
          last_reminder_at: now,
          reminder_count: Number(invoice.reminder_count || 0) + 1,
        }
      : {
          emailed_at: now,
        }

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

    await logInvoiceEmailAttempt({
      adminClient,
      status: 'sent',
      userId,
      invoiceId: payload.invoiceId,
      recipientEmail: invoice.customer_email,
      resendMessageId,
      startedAt,
    })

    return jsonResponse({
      success: true,
      invoice_id: payload.invoiceId,
      reminder: payload.reminder,
      resend_message_id: resendMessageId,
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

async function safeReadJson(response: Response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function getProviderCode(result: unknown) {
  return typeof result === 'object' && result && 'name' in result
    ? String((result as Record<string, unknown>).name || '')
    : null
}

function getProviderMessage(result: unknown) {
  return typeof result === 'object' && result && 'message' in result
    ? String((result as Record<string, unknown>).message || '')
    : null
}

function getResendMessageId(result: unknown) {
  if (!result || typeof result !== 'object') return null

  const id = (result as Record<string, unknown>).id
  return typeof id === 'string' && id.trim() ? id : null
}

async function logInvoiceEmailAttempt({
  adminClient,
  status,
  userId,
  invoiceId,
  recipientEmail,
  resendMessageId,
  errorCode,
  providerResponse,
  startedAt,
}: {
  adminClient: SupabaseClientLike
  status: 'sent' | 'failed'
  userId: string | null
  invoiceId: string | null
  recipientEmail?: string
  resendMessageId?: string | null
  errorCode?: string
  providerResponse?: Record<string, unknown>
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
      recipient_masked: recipientEmail ? maskEmail(recipientEmail) : null,
      error_code: errorCode || null,
      resend_message_id: resendMessageId || null,
      provider_response: providerResponse || null,
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
