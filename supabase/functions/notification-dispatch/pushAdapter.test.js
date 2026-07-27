import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildPushPayload,
  createVapidKeyJwk,
  normalizePushSendError,
  resolveSafePushUrl,
  sanitizeProviderText,
  sendWebPushNotification,
  shouldDeliverPush,
} from './pushAdapter.js'

const publicKey = 'BPZPxvVGQJEedb2eBn2dwMJuD-oCYkglXIIWI3RCVPnlkRl3QcRuWLrN9RL6p2fV1cFpknrGUkwK6Jf1Vd7uh6M'
const privateKey = 'NN0W_iPzBmUa4Pq0F-8Gmf1bBvAA0nR1xCXvqkpO4HM'

test('push delivery requires enabled preference and active subscriptions', () => {
  const payload = { category: 'system', priority: 'normal' }
  const recipient = { auth_user_id: 'auth-1', member_id: 'member-1', status: 'aktiv' }

  assert.equal(shouldDeliverPush({
    payload,
    recipient,
    preference: { enabled: false, required: false },
    subscriptions: [{ id: 'sub-1' }],
  }).errorCode, 'push_preference_disabled')

  assert.equal(shouldDeliverPush({
    payload,
    recipient,
    preference: { enabled: true, required: false },
    subscriptions: [],
  }).errorCode, 'no_push_subscription')

  assert.equal(shouldDeliverPush({
    payload,
    recipient,
    preference: { enabled: true, required: false },
    subscriptions: [{ id: 'sub-1' }, { id: 'sub-2' }],
  }).deliver, true)
})

test('builds compact safe push payloads and falls back from unsafe urls', () => {
  const payload = buildPushPayload({
    appPublicUrl: 'https://staging.app.styrian-bastards.at',
    payload: {
      type: 'staging_push_test',
      category: 'system',
      title: 'Staging Push-Test',
      message: 'Der Push-Kanal der Notification Engine funktioniert.',
      url: 'https://evil.example.test/phish',
      priority: 'high',
      metadata: { source: 'test' },
    },
    notificationId: 'job-1:sub-1',
  })

  assert.equal(payload.title, 'Staging Push-Test')
  assert.equal(payload.url, '/notifications')
  assert.equal(payload.data.url, '/notifications')
  assert.equal(payload.requireInteraction, true)
  assert.equal(JSON.stringify(payload).includes('evil.example.test'), false)
})

test('allows relative and same-origin push deep links only', () => {
  assert.equal(resolveSafePushUrl('/notifications?id=1', 'https://staging.app.styrian-bastards.at'), '/notifications?id=1')
  assert.equal(resolveSafePushUrl('https://staging.app.styrian-bastards.at/events?id=1', 'https://staging.app.styrian-bastards.at'), '/events?id=1')
  assert.equal(resolveSafePushUrl('javascript:alert(1)', 'https://staging.app.styrian-bastards.at'), '/notifications')
  assert.equal(resolveSafePushUrl('data:text/plain,x', 'https://staging.app.styrian-bastards.at'), '/notifications')
  assert.equal(resolveSafePushUrl('https://example.test/x', 'https://staging.app.styrian-bastards.at'), '/notifications')
})

test('converts web-push base64url VAPID keys into JWK without exposing secrets', () => {
  const jwk = createVapidKeyJwk({ publicKey, privateKey })

  assert.equal(jwk.publicKey.kty, 'EC')
  assert.equal(jwk.privateKey.crv, 'P-256')
  assert.equal(jwk.privateKey.d.length > 20, true)
})

test('sends through injected Deno-compatible webpush module', async () => {
  const calls = []
  const webpush = {
    async importVapidKeys(jwk) {
      calls.push(['import', jwk.publicKey.kty])
      return { publicKey: {}, privateKey: {} }
    },
    ApplicationServer: {
      async new(config) {
        calls.push(['server', config.contactInformation])
        return {
          subscribe(subscription) {
            calls.push(['subscribe', subscription.keys.p256dh])
            return {
              async pushTextMessage(message, options) {
                calls.push(['push', JSON.parse(message).title, options.urgency])
              },
            }
          },
        }
      },
    },
  }

  const result = await sendWebPushNotification({
    webpush,
    subscription: {
      endpoint: 'https://push.example.test/send/123',
      p256dh: 'p256dh',
      auth: 'auth',
    },
    payload: { title: 'Test', priority: 'high' },
    vapidPublicKey: publicKey,
    vapidPrivateKey: privateKey,
    vapidSubject: 'mailto:test@example.test',
  })

  assert.equal(result.ok, true)
  assert.deepEqual(calls.map((call) => call[0]), ['import', 'server', 'subscribe', 'push'])
})

test('classifies push provider and network failures without full endpoint text', async () => {
  const gone = await normalizePushSendError({
    response: new Response('gone https://push.example.test/full-endpoint', { status: 410 }),
  })
  assert.equal(gone.errorCode, 'push_subscription_expired')
  assert.equal(gone.deactivateSubscription, true)
  assert.equal(JSON.stringify(gone).includes('https://push.example.test/full-endpoint'), false)

  const limited = await normalizePushSendError({
    response: new Response('slow down', {
      status: 429,
      headers: { 'retry-after': '60' },
    }),
  })
  assert.equal(limited.errorCode, 'push_rate_limited')
  assert.equal(limited.deactivateSubscription, false)

  const unavailable = await normalizePushSendError({ response: new Response('down', { status: 500 }) })
  assert.equal(unavailable.errorCode, 'push_provider_unavailable')
  assert.equal(unavailable.deactivateSubscription, false)

  const network = await normalizePushSendError(new Error('network https://push.example.test/full-endpoint'))
  assert.equal(network.errorCode, 'push_send_failed')
  assert.equal(JSON.stringify(network).includes('https://push.example.test/full-endpoint'), false)

  const config = await normalizePushSendError(new Error('vapid_private_key_invalid'))
  assert.equal(config.errorCode, 'push_configuration_invalid')
  assert.equal(config.globalConfigurationError, true)
  assert.equal(config.deactivateSubscription, false)
})

test('sanitizes provider response snippets', () => {
  const sanitized = sanitizeProviderText(`error ${'x'.repeat(300)} https://push.example.test/endpoint`)

  assert.equal(sanitized.length, 180)
  assert.equal(sanitized.includes('https://push.example.test/endpoint'), false)
})
