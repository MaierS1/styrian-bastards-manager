import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildNotificationEmail,
  maskEmail,
  normalizeProviderError,
  sendEmailWithResend,
  shouldDeliverEmail,
} from './emailAdapter.js'

const payload = {
  title: 'Wichtiger <Hinweis>',
  message: 'Bitte <script>alert(1)</script> pruefen.',
  category: 'system',
  priority: 'normal',
  url: '/dashboard',
}

const activeRecipient = {
  auth_user_id: 'user-1',
  member_id: 'member-1',
  email: 'User@Example.com',
  status: 'aktiv',
}

test('email delivery requires explicit preference by default', () => {
  assert.equal(shouldDeliverEmail({
    payload,
    recipient: activeRecipient,
    preference: null,
  }).errorCode, 'email_preference_disabled')

  assert.equal(shouldDeliverEmail({
    payload,
    recipient: activeRecipient,
    preference: { enabled: true },
  }).deliver, true)
})

test('email delivery skips disabled, missing, invalid, and inactive recipients', () => {
  assert.equal(shouldDeliverEmail({
    payload,
    recipient: activeRecipient,
    preference: { enabled: false },
  }).errorCode, 'email_preference_disabled')

  assert.equal(shouldDeliverEmail({
    payload,
    recipient: { ...activeRecipient, email: '' },
    preference: { enabled: true },
  }).errorCode, 'no_email_address')

  assert.equal(shouldDeliverEmail({
    payload,
    recipient: { ...activeRecipient, email: 'invalid' },
    preference: { enabled: true },
  }).errorCode, 'invalid_email_address')

  assert.equal(shouldDeliverEmail({
    payload,
    recipient: { ...activeRecipient, status: 'ausgetreten' },
    preference: { enabled: true },
  }).errorCode, 'inactive_recipient')
})

test('critical system email bypasses optional email preference but not inactive status', () => {
  assert.equal(shouldDeliverEmail({
    payload: { ...payload, priority: 'critical' },
    recipient: activeRecipient,
    preference: { enabled: false },
  }).deliver, true)

  assert.equal(shouldDeliverEmail({
    payload: { ...payload, priority: 'critical' },
    recipient: { ...activeRecipient, status: 'ausgetreten' },
    preference: { enabled: false },
  }).errorCode, 'inactive_recipient')
})

test('transactional event email bypasses optional email preference', () => {
  assert.equal(shouldDeliverEmail({
    payload: {
      ...payload,
      type: 'event_registration_confirmed',
      category: 'event',
      priority: 'high',
    },
    recipient: activeRecipient,
    preference: { enabled: false },
  }).deliver, true)

  assert.equal(shouldDeliverEmail({
    payload: {
      ...payload,
      type: 'event_reminder',
      category: 'event',
      priority: 'normal',
    },
    recipient: activeRecipient,
    preference: { enabled: false },
  }).errorCode, 'email_preference_disabled')
})

test('transactional membership fee email bypasses optional email preference', () => {
  assert.equal(shouldDeliverEmail({
    payload: {
      ...payload,
      type: 'membership_fee_reminder',
      category: 'membership_fee',
      priority: 'high',
    },
    recipient: activeRecipient,
    preference: { enabled: false },
  }).deliver, true)

  assert.equal(shouldDeliverEmail({
    payload: {
      ...payload,
      type: 'membership_fee_payment_confirmed',
      category: 'membership_fee',
      priority: 'normal',
    },
    recipient: activeRecipient,
    preference: null,
  }).deliver, true)
})

test('builds escaped html, plain text, and safe cta links', () => {
  const email = buildNotificationEmail({
    payload,
    appPublicUrl: 'https://app.example.test',
  })

  assert.match(email.html, /&lt;Hinweis&gt;/)
  assert.match(email.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
  assert.doesNotMatch(email.html, /<script>/)
  assert.match(email.html, /https:\/\/app.example.test\/dashboard/)
  assert.match(email.text, /Bitte <script>alert\(1\)<\/script> pruefen\./)
})

test('omits cta when app public url is missing or invalid', () => {
  assert.doesNotMatch(buildNotificationEmail({ payload, appPublicUrl: '' }).html, /href=/)
  assert.doesNotMatch(buildNotificationEmail({ payload, appPublicUrl: 'javascript:alert(1)' }).html, /href=/)
})

test('sends email through Resend with sanitized request shape and idempotency header', async () => {
  const email = buildNotificationEmail({ payload, appPublicUrl: 'https://app.example.test' })
  let requestBody = null
  let requestHeaders = null

  const result = await sendEmailWithResend({
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://api.resend.com/emails')
      requestHeaders = options.headers
      requestBody = JSON.parse(options.body)
      return {
        ok: true,
        status: 200,
        async json() {
          return { id: 'resend-1' }
        },
      }
    },
    resendApiKey: 'secret',
    fromEmail: 'Styrian Bastards <mail@example.test>',
    replyToEmail: 'reply@example.test',
    to: 'user@example.test',
    email,
    idempotencyKey: 'job-1:email:user-1',
  })

  assert.equal(result.ok, true)
  assert.equal(result.messageId, 'resend-1')
  assert.equal(requestHeaders.Authorization, 'Bearer secret')
  assert.equal(requestHeaders['Idempotency-Key'], 'job-1:email:user-1')
  assert.deepEqual(requestBody.to, ['user@example.test'])
  assert.equal(requestBody.reply_to, 'reply@example.test')
  assert.equal(requestBody.html, email.html)
  assert.equal(requestBody.text, email.text)
})

test('normalizes Resend configuration and provider failures', async () => {
  assert.equal((await sendEmailWithResend({
    resendApiKey: '',
    fromEmail: 'from@example.test',
    to: 'user@example.test',
    email: { subject: 'x', html: 'x', text: 'x' },
  })).errorCode, 'email_configuration_missing')

  const result = await sendEmailWithResend({
    fetchImpl: async () => ({
      ok: false,
      status: 429,
      async json() {
        return { name: 'rate_limit_exceeded', message: 'Too many requests' }
      },
    }),
    resendApiKey: 'secret',
    fromEmail: 'from@example.test',
    to: 'user@example.test',
    email: { subject: 'x', html: 'x', text: 'x' },
  })

  assert.equal(result.ok, false)
  assert.equal(result.errorCode, 'email_rate_limited')
  assert.deepEqual(result.providerResponse, {
    http_status: 429,
    code: 'rate_limit_exceeded',
  })
})

test('masks email addresses and maps provider errors', () => {
  assert.equal(maskEmail('max.mustermann@example.com'), 'ma***@ex***.com')
  assert.equal(normalizeProviderError(503), 'email_provider_unavailable')
  assert.equal(normalizeProviderError(504), 'timeout')
  assert.equal(normalizeProviderError(400), 'email_send_failed')
})
