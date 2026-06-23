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
    const allowedTypes = [
      'fee_reminder',
      'fee_paid_confirmation',
      'fee_reminder_test',
      'fee_paid_confirmation_test',
    ]
    const isTest = type.endsWith('_test')
    const baseType = isTest ? type.replace('_test', '') : type

    if (!allowedTypes.includes(type)) {
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

    if (!isTest && type === 'fee_reminder' && !['open', 'reminded'].includes(feeItem.status)) {
      await adminClient
        .from('membership_fee_items')
        .update({
          notification_status: 'error',
          notification_error: 'Erinnerungen sind nur für offene Beiträge zulässig.',
        })
        .eq('id', feeItemId)

      return jsonResponse({ error: 'Erinnerungen sind nur für offene Beiträge zulässig.' }, 400)
    }

    if (!isTest && type === 'fee_paid_confirmation' && feeItem.status !== 'paid') {
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

    if (!isTest && member?.status !== 'aktiv') {
      await adminClient
        .from('membership_fee_items')
        .update({
          notification_status: 'error',
          notification_error: 'Mitglied ist nicht aktiv.',
        })
        .eq('id', feeItemId)

      return jsonResponse({ error: 'Mitglied ist nicht aktiv.' }, 400)
    }

    if (!isTest && type === 'fee_reminder' && (member?.member_type === 'ehrenmitglied' || Number(feeItem.amount || 0) <= 0)) {
      await adminClient
        .from('membership_fee_items')
        .update({
          notification_status: 'error',
          notification_error: 'Für Ehrenmitglieder oder 0-Euro-Beiträge wird keine Zahlungsaufforderung versendet.',
        })
        .eq('id', feeItemId)

      return jsonResponse({ error: 'Für Ehrenmitglieder oder 0-Euro-Beiträge wird keine Zahlungsaufforderung versendet.' }, 400)
    }

    if (!isTest && !member?.email) {
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

    const { data: paymentSettings, error: paymentSettingsError } = await adminClient
      .from('club_payment_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()

    if (paymentSettingsError) {
      return jsonResponse({ error: paymentSettingsError.message }, 500)
    }

    const memberName = `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Mitglied'
    const periodLabel = period?.title
      ? `${period.year} · ${period.title}`
      : String(period?.year || 'Mitgliedsbeitrag')
    const amount = Number(feeItem.amount || 0).toFixed(2)
    const recipientEmail = getRecipientEmail({
      body,
      callerEmail: user.email || callerMember.email || '',
      memberEmail: member?.email || '',
      isTest,
    })

    if (!recipientEmail) {
      return jsonResponse({ error: 'Keine zulaessige Empfaengeradresse vorhanden.' }, 400)
    }

    const message = buildMessage({
      type: baseType,
      memberName,
      periodLabel,
      amount,
      dueDate: feeItem.due_date || period?.due_date || null,
      paymentSettings,
      isTest,
    })

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipientEmail],
        subject: message.subject,
        html: message.html,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      const errorMessage = result?.message || 'E-Mail konnte nicht gesendet werden.'

      if (!isTest) {
        await adminClient
          .from('membership_fee_items')
          .update({
            notification_status: 'error',
            notification_error: errorMessage,
          })
          .eq('id', feeItemId)
      }

      return jsonResponse({ error: errorMessage, detail: result }, 400)
    }

    if (isTest) {
      return jsonResponse({
        success: true,
        test: true,
        result,
      })
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
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler.'
    const status = message === 'Testadresse ist nicht erlaubt.' ? 403 : 500
    return jsonResponse({ error: message }, status)
  }
})

function buildMessage({
  type,
  memberName,
  periodLabel,
  amount,
  dueDate,
  paymentSettings,
  isTest,
}: {
  type: string
  memberName: string
  periodLabel: string
  amount: string
  dueDate: string | null
  paymentSettings: Record<string, unknown> | null
  isTest: boolean
}) {
  if (type === 'fee_paid_confirmation') {
    return {
      subject: formatSubject(`Zahlungsbestätigung: ${periodLabel}`, isTest),
      html: `
        <p>Hallo ${escapeHtml(memberName)},</p>
        <p>dein Mitgliedsbeitrag für <strong>${escapeHtml(periodLabel)}</strong> über <strong>${escapeHtml(amount)} EUR</strong> wurde als bezahlt markiert.</p>
        <p>Vielen Dank.</p>
      `,
    }
  }

  return {
    subject: formatSubject(`Erinnerung: ${periodLabel}`, isTest),
    html: `
      <p>Hallo ${escapeHtml(memberName)},</p>
      <p>für <strong>${escapeHtml(periodLabel)}</strong> ist ein Mitgliedsbeitrag über <strong>${escapeHtml(amount)} EUR</strong> offen.</p>
      ${dueDate ? `<p>Fällig am: <strong>${escapeHtml(dueDate)}</strong></p>` : ''}
      <p>Bitte um zeitnahe Erledigung.</p>
      ${buildPaymentBlocks({ memberName, periodLabel, paymentSettings })}
    `,
  }
}

function buildPaymentBlocks({
  memberName,
  periodLabel,
  paymentSettings,
}: {
  memberName: string
  periodLabel: string
  paymentSettings: Record<string, unknown> | null
}) {
  const blocks: string[] = []
  const paymentPurpose = `Mitgliedsbeitrag ${periodLabel} – ${memberName}`

  if (hasText(paymentSettings?.iban)) {
    blocks.push(`
      <h4>E-Banking</h4>
      <p>
        ${hasText(paymentSettings?.account_holder) ? `Kontoinhaber: <strong>${escapeHtml(String(paymentSettings?.account_holder))}</strong><br />` : ''}
        IBAN: <strong>${escapeHtml(String(paymentSettings?.iban))}</strong><br />
        ${hasText(paymentSettings?.bic) ? `BIC: <strong>${escapeHtml(String(paymentSettings?.bic))}</strong><br />` : ''}
        ${hasText(paymentSettings?.bank_name) ? `Bank: <strong>${escapeHtml(String(paymentSettings?.bank_name))}</strong><br />` : ''}
        Verwendungszweck: <strong>${escapeHtml(paymentPurpose)}</strong>
      </p>
    `)
  }

  if (paymentSettings?.cash_enabled === true) {
    blocks.push(`
      <h4>Barzahlung</h4>
      <p>Der Beitrag kann bei einem Vereinstreffen oder direkt bei einem Vorstandsmitglied bezahlt werden.</p>
    `)
  }

  if (
    paymentSettings?.paypal_enabled === true &&
    (hasText(paymentSettings?.paypal_address) || hasText(paymentSettings?.paypal_link))
  ) {
    const paypalTarget = String(paymentSettings?.paypal_link || paymentSettings?.paypal_address || '')
    blocks.push(`
      <h4>PayPal</h4>
      <p>Zahlung per PayPal an <strong>${escapeHtml(paypalTarget)}</strong>.</p>
      <p>Bitte im Verwendungszweck Namen und Saison angeben.</p>
    `)
  }

  if (blocks.length === 0) {
    return '<p><strong>Keine Zahlungsoptionen hinterlegt.</strong></p>'
  }

  return blocks.join('')
}

function hasText(value: unknown) {
  return String(value || '').trim().length > 0
}

function getRecipientEmail({
  body,
  callerEmail,
  memberEmail,
  isTest,
}: {
  body: Record<string, unknown>
  callerEmail: string
  memberEmail: string
  isTest: boolean
}) {
  if (!isTest) return memberEmail

  const requestedEmail = String(body.test_email || '').trim().toLowerCase()
  const adminEmail = String(callerEmail || '').trim().toLowerCase()

  if (!requestedEmail) return adminEmail

  const allowedEmails = String(Deno.env.get('ALLOWED_TEST_EMAILS') || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)

  if (allowedEmails.includes(requestedEmail)) {
    return requestedEmail
  }

  throw new Error('Testadresse ist nicht erlaubt.')
}

function formatSubject(subject: string, isTest: boolean) {
  return isTest ? `[TEST] Styrian Bastards - ${subject}` : subject
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
