export const MAX_EMAIL_RECIPIENTS = 100

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value) {
  const email = normalizeEmail(value)
  return email.length <= 254 && EMAIL_PATTERN.test(email)
}

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

export function maskEmail(value) {
  const email = normalizeEmail(value)
  const [local, domain] = email.split('@')
  if (!local || !domain) return null

  const visibleLocal = local.length <= 2 ? `${local[0] || '*'}*` : `${local.slice(0, 2)}***`
  const domainParts = domain.split('.')
  const domainName = domainParts[0] || ''
  const suffix = domainParts.slice(1).join('.')
  const visibleDomain = domainName.length <= 2 ? `${domainName[0] || '*'}*` : `${domainName.slice(0, 2)}***`

  return `${visibleLocal}@${visibleDomain}${suffix ? `.${suffix}` : ''}`
}

export function isRequiredEmailNotification(payload) {
  return payload.category === 'system' && payload.priority === 'critical'
}

export function shouldDeliverEmail({ payload, recipient, preference }) {
  if (recipient.status && recipient.status !== 'aktiv') {
    return { deliver: false, status: 'skipped', errorCode: 'inactive_recipient' }
  }

  if (!recipient.email) {
    return { deliver: false, status: 'skipped', errorCode: 'no_email_address' }
  }

  if (!isValidEmail(recipient.email)) {
    return { deliver: false, status: 'skipped', errorCode: 'invalid_email_address' }
  }

  if (isRequiredEmailNotification(payload)) {
    return { deliver: true, status: 'delivered', errorCode: null }
  }

  if (preference?.enabled === true || preference?.required === true) {
    return { deliver: true, status: 'delivered', errorCode: null }
  }

  return { deliver: false, status: 'skipped', errorCode: 'email_preference_disabled' }
}

export function buildNotificationEmail({ payload, appPublicUrl }) {
  const title = payload.title
  const message = payload.message
  const ctaUrl = buildCtaUrl(payload.url, appPublicUrl)
  const priorityLabel = formatPriority(payload.priority)
  const subject = priorityLabel ? `[${priorityLabel}] ${title}` : title
  const escapedTitle = escapeHtml(title)
  const escapedMessage = escapeHtml(message).replaceAll('\n', '<br />')
  const ctaHtml = ctaUrl
    ? `<p style="margin:24px 0 0;"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 16px;border-radius:6px;font-weight:600;">In der App oeffnen</a></p>`
    : ''
  const ctaText = ctaUrl ? `\n\nIn der App oeffnen: ${ctaUrl}` : ''

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f7f9;color:#111827;font-family:Arial,sans-serif;">
    <div style="max-width:640px;margin:0 auto;padding:24px;">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:24px;">
        <p style="margin:0 0 16px;color:#6b7280;font-size:13px;">Styrian Bastards Vereinsmanager</p>
        <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#111827;">${escapedTitle}</h1>
        <p style="margin:0;font-size:16px;line-height:1.55;color:#1f2937;">${escapedMessage}</p>
        ${ctaHtml}
      </div>
      <p style="margin:16px 0 0;color:#6b7280;font-size:12px;line-height:1.5;">
        Dies ist eine automatische Vereinsnachricht. Bitte antworte nur, wenn eine Reply-To-Adresse angegeben ist.
      </p>
    </div>
  </body>
</html>`

  const text = [
    'Styrian Bastards Vereinsmanager',
    '',
    title,
    '',
    message,
    ctaText,
    '',
    'Dies ist eine automatische Vereinsnachricht.',
  ].filter((line) => line !== null && line !== undefined).join('\n')

  return { subject, html, text }
}

export async function sendEmailWithResend({
  fetchImpl = fetch,
  resendApiKey,
  fromEmail,
  replyToEmail,
  to,
  email,
  idempotencyKey,
}) {
  if (!resendApiKey || !fromEmail) {
    return {
      ok: false,
      status: 500,
      errorCode: 'email_configuration_missing',
      errorMessage: 'E-Mail-Konfiguration fehlt.',
    }
  }

  const headers = {
    Authorization: `Bearer ${resendApiKey}`,
    'Content-Type': 'application/json',
  }

  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey

  const response = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject: email.subject,
      html: email.html,
      text: email.text,
      ...(replyToEmail ? { reply_to: replyToEmail } : {}),
    }),
  })

  const result = await safeReadJson(response)

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      errorCode: normalizeProviderError(response.status),
      errorMessage: 'E-Mail konnte nicht gesendet werden.',
      providerResponse: {
        http_status: response.status,
        code: getProviderCode(result),
      },
    }
  }

  return {
    ok: true,
    status: response.status,
    messageId: getResendMessageId(result),
  }
}

export function normalizeProviderError(status) {
  if (status === 429) return 'email_rate_limited'
  if (status === 408 || status === 504) return 'timeout'
  if (status >= 500) return 'email_provider_unavailable'
  return 'email_send_failed'
}

function buildCtaUrl(path, appPublicUrl) {
  if (!path || !appPublicUrl) return null

  try {
    const base = new URL(appPublicUrl)
    if (!['http:', 'https:'].includes(base.protocol)) return null
    return new URL(path, base).toString()
  } catch {
    return null
  }
}

function formatPriority(priority) {
  if (priority === 'critical') return 'KRITISCH'
  if (priority === 'high') return 'WICHTIG'
  return ''
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

async function safeReadJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function getProviderCode(result) {
  return typeof result === 'object' && result && 'name' in result
    ? String(result.name || '')
    : null
}

function getResendMessageId(result) {
  if (!result || typeof result !== 'object') return null

  const id = result.id
  return typeof id === 'string' && id.trim() ? id : null
}
