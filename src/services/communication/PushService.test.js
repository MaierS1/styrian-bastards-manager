import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import test from 'node:test'
import { PushService } from './PushService.js'

const TEST_VAPID_KEY = 'BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

function installBrowser({
  permission = 'default',
  serviceWorker = true,
  pushManager = true,
  secureContext = true,
  existingSubscription = null,
} = {}) {
  const state = {
    permission,
    requestedPermission: false,
    subscribedOptions: null,
    unsubscribed: false,
    existingSubscription,
  }

  const pushManagerObject = pushManager
    ? {
      async getSubscription() {
        return state.existingSubscription
      },
      async subscribe(options) {
        state.subscribedOptions = options
        state.existingSubscription = createSubscription('https://push.example/new')
        return state.existingSubscription
      },
    }
    : null

  const registration = pushManagerObject ? { scope: '/', pushManager: pushManagerObject } : { scope: '/' }

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      isSecureContext: secureContext,
      location: { protocol: secureContext ? 'https:' : 'http:', hostname: 'app.example.test' },
      matchMedia: () => ({ matches: false }),
      atob: (value) => Buffer.from(value, 'base64').toString('binary'),
      Notification: function Notification() {},
      PushManager: pushManager ? function PushManager() {} : undefined,
    },
  })
  if (!pushManager) delete globalThis.window.PushManager

  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      platform: 'Win32',
      userAgent: 'Chrome',
      serviceWorker: serviceWorker
        ? {
          controller: {},
          async getRegistration() {
            return registration
          },
          ready: Promise.resolve(registration),
        }
        : undefined,
    },
  })
  if (!serviceWorker) delete globalThis.navigator.serviceWorker

  Object.defineProperty(globalThis, 'Notification', {
    configurable: true,
    value: {
      get permission() {
        return state.permission
      },
      async requestPermission() {
        state.requestedPermission = true
        return state.permission
      },
    },
  })

  Object.defineProperty(globalThis, 'PushManager', {
    configurable: true,
    value: pushManager ? function PushManager() {} : undefined,
  })
  if (!pushManager) delete globalThis.PushManager

  return state
}

function cleanupBrowser() {
  delete globalThis.window
  delete globalThis.navigator
  delete globalThis.Notification
  delete globalThis.PushManager
}

function createSubscription(endpoint) {
  return {
    endpoint,
    async unsubscribe() {
      return true
    },
    toJSON() {
      return {
        endpoint,
        keys: {
          p256dh: 'p256dh-key',
          auth: 'auth-key',
        },
      }
    },
  }
}

test.afterEach(() => {
  cleanupBrowser()
})

test('reports unsupported browser without throwing', () => {
  cleanupBrowser()

  const status = PushService.getBrowserSupportStatus()

  assert.equal(status.supported, false)
  assert.equal(PushService.getPermissionState(), 'unsupported')
})

test('reports default, granted and denied permission states', () => {
  const state = installBrowser({ permission: 'default' })
  assert.equal(PushService.getPermissionState(), 'default')

  state.permission = 'granted'
  assert.equal(PushService.getPermissionState(), 'granted')

  state.permission = 'denied'
  assert.equal(PushService.getPermissionState(), 'denied')
})

test('does not request denied permission again', async () => {
  const state = installBrowser({ permission: 'denied' })

  const permission = await PushService.requestPermission()

  assert.equal(permission, 'denied')
  assert.equal(state.requestedPermission, false)
})

test('subscribe refuses missing VAPID key before prompting or subscribing', async () => {
  const state = installBrowser({ permission: 'granted' })

  const result = await PushService.subscribe()

  assert.equal(result.error, 'vapid_public_key_missing')
  assert.equal(state.subscribedOptions, null)
})

test('detects an existing browser subscription without creating a duplicate', async () => {
  const existingSubscription = createSubscription('https://push.example/existing')
  const state = installBrowser({ permission: 'granted', existingSubscription })

  const result = await PushService.subscribe({ vapidPublicKeyOverride: TEST_VAPID_KEY })

  assert.equal(result.subscription, existingSubscription)
  assert.equal(state.subscribedOptions, null)
})

test('creates and normalizes a new subscription', async () => {
  const state = installBrowser({ permission: 'granted' })

  const result = await PushService.subscribe({ vapidPublicKeyOverride: TEST_VAPID_KEY })

  assert.equal(result.error, null)
  assert.equal(state.subscribedOptions.userVisibleOnly, true)
  assert.ok(state.subscribedOptions.applicationServerKey instanceof Uint8Array)
  assert.equal(result.normalizedSubscription.endpoint, 'https://push.example/new')
  assert.equal(result.normalizedSubscription.p256dh, 'p256dh-key')
})

test('unsubscribe reports browser success and can deactivate the saved subscription', async () => {
  installBrowser({ permission: 'granted', existingSubscription: createSubscription('https://push.example/device') })

  const result = await PushService.unsubscribe({
    deactivateSubscription: async ({ endpoint }) => ({
      data: { endpoint, is_active: false },
      error: null,
    }),
  })

  assert.equal(result.browserUnsubscribed, true)
  assert.equal(result.deactivatedSubscription.is_active, false)
})

test('reconcile reads existing state without requesting permission', async () => {
  const state = installBrowser({ permission: 'default' })

  const result = await PushService.reconcileSubscription({
    currentMember: { id: 'member-1', auth_user_id: 'auth-1' },
    fetchSubscriptions: async () => ({ data: [], error: null }),
    saveSubscription: async () => {
      throw new Error('must not save without browser subscription')
    },
  })

  assert.equal(result.permission, 'default')
  assert.equal(state.requestedPermission, false)
})

test('reconcile keeps multiple saved devices', async () => {
  installBrowser({ permission: 'granted', existingSubscription: createSubscription('https://push.example/current') })

  const result = await PushService.reconcileSubscription({
    currentMember: { id: 'member-1', auth_user_id: 'auth-1' },
    fetchSubscriptions: async () => ({
      data: [
        { id: 'old', endpoint: 'https://push.example/old' },
        { id: 'current', endpoint: 'https://push.example/current' },
      ],
      error: null,
    }),
    saveSubscription: async (payload) => ({
      data: { id: 'current', endpoint: payload.endpoint, is_active: true },
      error: null,
    }),
  })

  assert.deepEqual(result.subscriptions.map((subscription) => subscription.id), ['current', 'old'])
})
