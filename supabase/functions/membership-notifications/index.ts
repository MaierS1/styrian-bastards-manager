import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'Styrian Bastards <mail@styrian-bastards.at>'

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'Server secrets fehlen.' }, 500)
    }

    if (!resendApiKey) {
      return jsonResponse({ error: 'RESEND_API_KEY fehlt in den Supabase Function Secrets.' }, 500)
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
    })

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
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

    if (callerMember?.app_role !== 'admin') {
      return jsonResponse({ error: 'Nur Admins dürfen Beitragsmails versenden.' }, 403)
    }

    const body = await req.json()
    const type = String(body.type || '')
    const feeItemId = String(body.fee_item_id || '')

    if (!['fee_reminder', 'fee_paid_confirmation'].includes(type)) {
      return jsonResponse({ error: 'Ungültiger Mailtyp.' }, 400)
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
      return jsonResponse({ error: feeItemError.message }, 500)
    }

    if (!feeItem) {
      return jsonResponse({ error: 'Beitragsposition nicht gefunden.' }, 404)
    }

    if (type === 'fee_reminder' && !['open', 'reminded'].includes(feeItem.status)) {
      await adminClient
        .from('membership_fee_items')
        .update({
          notification_status: 'error',
          notification_error: 'Erinnerungen sind nur für offene Beiträge zulässig.',
        })
        .eq('id', feeItemId)

      return jsonResponse({ error: 'Erinnerungen sind nur für offene Beiträge zulässig.' }, 400)
    }

    if (type === 'fee_paid_confirmation' && feeItem.status !== 'paid') {
      await adminClient
        .from('membership_fee_items')
        .update({
          notification_status: 'error',
          notification_error: 'Zahlungsbestätigungen sind nur für bezahlte Beiträge zulässig.',
        })
        .eq('id', feeItemId)

      return jsonResponse({ error: 'Zahlungsbestätigungen sind nur für bezahlte Beiträge zulässig.' }, 400)
    }

    const { data: member, error: memberError } = await adminClient
      .from('members')
      .select('*')
      .eq('id', feeItem.member_id)
      .maybeSingle()

    if (memberError) {
      return jsonResponse({ error: memberError.message }, 500)
    }

    if (!member?.email) {
      await adminClient
        .from('membership_fee_items')
        .update({
          notification_status: 'error',
          notification_error: 'Mitglied hat keine E-Mail-Adresse.',
        })
        .eq('id', feeItemId)

      return jsonResponse({ error: 'Mitglied hat keine E-Mail-Adresse.' }, 400)
    }

    const { data: period, error: periodError } = await adminClient
      .from('membership_fee_periods')
      .select('*')
      .eq('id', feeItem.period_id)
      .maybeSingle()

    if (periodError) {
      return jsonResponse({ error: periodError.message }, 500)
    }

    const memberName = `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Mitglied'
    const periodLabel = period?.title
      ? `${period.year} · ${period.title}`
      : String(period?.year || 'Mitgliedsbeitrag')
    const amount = Number(feeItem.amount || 0).toFixed(2)

    const message = buildMessage({
      type,
      memberName,
      periodLabel,
      amount,
      dueDate: feeItem.due_date || period?.due_date || null,
    })

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [member.email],
        subject: message.subject,
        html: message.html,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      const errorMessage = result?.message || 'E-Mail konnte nicht gesendet werden.'

      await adminClient
        .from('membership_fee_items')
        .update({
          notification_status: 'error',
          notification_error: errorMessage,
        })
        .eq('id', feeItemId)

      return jsonResponse({ error: errorMessage, detail: result }, 400)
    }

    const updatePayload: Record<string, unknown> = {
      notification_status: 'sent',
      notification_error: null,
    }

    if (type === 'fee_reminder') {
      updatePayload.reminder_sent_at = new Date().toISOString()
      if (feeItem.status === 'open') {
        updatePayload.status = 'reminded'
      }
    }

    await adminClient
      .from('membership_fee_items')
      .update(updatePayload)
      .eq('id', feeItemId)

    return jsonResponse({
      success: true,
      result,
    })
  } catch (error) {
    return jsonResponse({ error: error.message || 'Unbekannter Fehler.' }, 500)
  }
})

function buildMessage({
  type,
  memberName,
  periodLabel,
  amount,
  dueDate,
}: {
  type: string
  memberName: string
  periodLabel: string
  amount: string
  dueDate: string | null
}) {
  if (type === 'fee_paid_confirmation') {
    return {
      subject: `Zahlungsbestätigung: ${periodLabel}`,
      html: `
        <p>Hallo ${escapeHtml(memberName)},</p>
        <p>dein Mitgliedsbeitrag für <strong>${escapeHtml(periodLabel)}</strong> über <strong>${escapeHtml(amount)} EUR</strong> wurde als bezahlt markiert.</p>
        <p>Vielen Dank.</p>
      `,
    }
  }

  return {
    subject: `Erinnerung: ${periodLabel}`,
    html: `
      <p>Hallo ${escapeHtml(memberName)},</p>
      <p>für <strong>${escapeHtml(periodLabel)}</strong> ist ein Mitgliedsbeitrag über <strong>${escapeHtml(amount)} EUR</strong> offen.</p>
      ${dueDate ? `<p>Fällig am: <strong>${escapeHtml(dueDate)}</strong></p>` : ''}
      <p>Bitte um zeitnahe Erledigung.</p>
    `,
  }
}

function escapeHtml(value: string) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
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
