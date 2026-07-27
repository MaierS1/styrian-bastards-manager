const IOS_PLATFORM_PATTERN = /iPad|iPhone|iPod/
const importMetaEnv = import.meta.env || {}
const vapidPublicKey = importMetaEnv.VITE_VAPID_PUBLIC_KEY

function isBrowser() {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined'
}

function isLocalhost(hostname) {
  return ['localhost', '127.0.0.1', '[::1]'].includes(hostname)
}

function isHttpsContext() {
  if (!isBrowser()) return false

  return window.isSecureContext === true
    || window.location.protocol === 'https:'
    || isLocalhost(window.location.hostname)
}

function isNotificationApiSupported() {
  return isBrowser() && 'Notification' in window
}

function isServiceWorkerSupported() {
  return isBrowser() && 'serviceWorker' in navigator
}

function isPushManagerSupported() {
  return isBrowser() && 'PushManager' in window
}

function isIosDevice() {
  if (!isBrowser()) return false

  return IOS_PLATFORM_PATTERN.test(navigator.platform)
    || (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1)
}

function isStandaloneDisplayMode() {
  if (!isBrowser()) return false

  return window.matchMedia?.('(display-mode: standalone)').matches === true
    || window.navigator?.standalone === true
}

function logDev(message, details) {
  if (!importMetaEnv.DEV) return

  if (details === undefined) {
    console.info(`[PushService] ${message}`)
    return
  }

  console.info(`[PushService] ${message}`, details)
}

function getVapidPublicKey(override) {
  return typeof override === 'string' ? override : vapidPublicKey
}

function hasVapidPublicKey(override) {
  const publicKey = getVapidPublicKey(override)
  return typeof publicKey === 'string' && publicKey.trim().length > 0
}

function urlBase64ToUint8Array(value) {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const base64 = `${value}${padding}`.replaceAll('-', '+').replaceAll('_', '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index)
  }

  return outputArray
}

function createDeviceLabel() {
  if (!isBrowser()) return 'Unbekanntes Geraet'

  if (isIosDevice()) return 'iOS Geraet'
  if (navigator.userAgent.includes('Android')) return 'Android Geraet'
  if (navigator.userAgent.includes('Firefox')) return 'Firefox Browser'
  if (navigator.userAgent.includes('Edg/')) return 'Edge Browser'
  if (navigator.userAgent.includes('Chrome')) return 'Chrome Browser'
  if (navigator.userAgent.includes('Safari')) return 'Safari Browser'

  return 'Browser'
}

export function getPermission() {
  if (!isNotificationApiSupported()) return 'unsupported'

  return Notification.permission
}

export function getPermissionState() {
  return getPermission()
}

export function isSupported() {
  const support = {
    notification: isNotificationApiSupported(),
    serviceWorker: isServiceWorkerSupported(),
    pushManager: isPushManagerSupported(),
    secureContext: isHttpsContext(),
    ios: isIosDevice(),
    iosHomeScreenPwa: !isIosDevice() || isStandaloneDisplayMode(),
  }

  const supported = support.notification
    && support.serviceWorker
    && support.pushManager
    && support.secureContext
    && support.iosHomeScreenPwa

  logDev('capability check', { supported, support })

  return supported
}

export function canRequestPermission() {
  const permission = getPermission()

  const canRequest = isSupported() && permission === 'default'

  logDev('permission request capability', { canRequest, permission })

  return canRequest
}

export function getBrowserSupportStatus({ vapidPublicKeyOverride = null } = {}) {
  const support = {
    notification: isNotificationApiSupported(),
    serviceWorker: isServiceWorkerSupported(),
    pushManager: isPushManagerSupported(),
    secureContext: isHttpsContext(),
    ios: isIosDevice(),
    standalone: isStandaloneDisplayMode(),
    iosHomeScreenPwa: !isIosDevice() || isStandaloneDisplayMode(),
    vapidPublicKey: hasVapidPublicKey(vapidPublicKeyOverride),
    permission: getPermission(),
  }

  const supported = support.notification
    && support.serviceWorker
    && support.pushManager
    && support.secureContext
    && support.iosHomeScreenPwa

  const canSubscribe = supported
    && support.vapidPublicKey
    && support.permission !== 'denied'

  const reason = (() => {
    if (!support.notification) return 'notification_unsupported'
    if (!support.serviceWorker) return 'service_worker_unsupported'
    if (!support.pushManager) return 'push_manager_unsupported'
    if (!support.secureContext) return 'insecure_context'
    if (!support.iosHomeScreenPwa) return 'ios_home_screen_required'
    if (!support.vapidPublicKey) return 'vapid_public_key_missing'
    if (support.permission === 'denied') return 'permission_denied'
    return 'supported'
  })()

  const status = {
    ...support,
    supported,
    canSubscribe,
    reason,
  }

  logDev('browser support status', status)

  return status
}

export async function requestPermission() {
  if (!isNotificationApiSupported()) {
    logDev('permission request skipped: notification unsupported')
    return 'unsupported'
  }

  if (Notification.permission === 'denied') {
    logDev('permission request skipped: already denied')
    return 'denied'
  }

  if (Notification.permission === 'granted') {
    logDev('permission request skipped: already granted')
    return 'granted'
  }

  try {
    const permission = await Notification.requestPermission()
    logDev('permission request completed', permission)
    return permission
  } catch (error) {
    logDev('permission request failed', error)
    return 'default'
  }
}

export async function getServiceWorkerRegistration({ waitForReady = true } = {}) {
  if (!isServiceWorkerSupported()) {
    logDev('service worker unsupported')
    return null
  }

  try {
    const existingRegistration = await navigator.serviceWorker.getRegistration()

    if (existingRegistration) {
      logDev('service worker registration found', existingRegistration.scope)
      return existingRegistration
    }

    if (!waitForReady && !navigator.serviceWorker.controller) {
      logDev('service worker registration not available yet')
      return null
    }

    const readyRegistration = await navigator.serviceWorker.ready
    logDev('service worker registration ready', readyRegistration.scope)
    return readyRegistration
  } catch (error) {
    logDev('service worker registration failed', error)
    return null
  }
}

export const getRegistration = getServiceWorkerRegistration

export async function getCurrentSubscription() {
  const registration = await getServiceWorkerRegistration()

  if (!registration?.pushManager) {
    logDev('current subscription unavailable: push manager missing')
    return null
  }

  const subscription = await registration.pushManager.getSubscription()
  logDev('current subscription read', { hasSubscription: Boolean(subscription) })
  return subscription
}

export const getExistingSubscription = getCurrentSubscription

export function normalizeSubscription(subscription) {
  if (!subscription) return null

  const jsonSubscription = subscription.toJSON()
  const keys = jsonSubscription.keys || {}

  return {
    endpoint: jsonSubscription.endpoint || subscription.endpoint,
    p256dh: keys.p256dh || '',
    auth: keys.auth || '',
    content_encoding: 'aes128gcm',
    user_agent: isBrowser() ? navigator.userAgent : null,
    platform: isBrowser() ? navigator.platform : null,
    device_label: createDeviceLabel(),
    permission: getPermission() === 'granted' ? 'granted' : getPermission(),
    is_active: true,
    last_seen_at: new Date().toISOString(),
  }
}

export async function subscribe({ currentMember = null, saveSubscription = null, vapidPublicKeyOverride = null } = {}) {
  const supportStatus = getBrowserSupportStatus({ vapidPublicKeyOverride })

  if (!supportStatus.supported) {
    return {
      subscription: null,
      error: supportStatus.reason,
      supportStatus,
    }
  }

  if (!supportStatus.vapidPublicKey) {
    return {
      subscription: null,
      error: 'vapid_public_key_missing',
      supportStatus,
    }
  }

  if (supportStatus.permission !== 'granted') {
    return {
      subscription: null,
      error: 'permission_not_granted',
      supportStatus,
    }
  }

  const registration = await getServiceWorkerRegistration({ waitForReady: true })

  if (!registration?.pushManager) {
    return {
      subscription: null,
      error: 'push_manager_unavailable',
      supportStatus,
    }
  }

  const existingSubscription = await registration.pushManager.getSubscription()

  if (existingSubscription) {
    logDev('using existing subscription')
    return persistSubscription({
      subscription: existingSubscription,
      supportStatus,
      currentMember,
      saveSubscription,
    })
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(getVapidPublicKey(vapidPublicKeyOverride).trim()),
  })

  logDev('subscription created')

  return persistSubscription({
    subscription,
    supportStatus,
    currentMember,
    saveSubscription,
  })
}

async function persistSubscription({
  subscription,
  supportStatus,
  currentMember,
  saveSubscription,
}) {
  const normalizedSubscription = normalizeSubscription(subscription)

  if (!saveSubscription || !normalizedSubscription) {
    return {
      subscription,
      normalizedSubscription,
      savedSubscription: null,
      error: null,
      supportStatus,
    }
  }

  const saveResult = await saveSubscription({
    ...normalizedSubscription,
    member_id: currentMember?.id || null,
  })

  if (saveResult.error) {
    return {
      subscription,
      normalizedSubscription,
      savedSubscription: null,
      error: 'subscription_save_failed',
      saveError: saveResult.error,
      supportStatus,
    }
  }

  return {
    subscription,
    normalizedSubscription,
    savedSubscription: saveResult.data || null,
    error: null,
    supportStatus,
  }
}

export async function unsubscribe({ subscriptionId = null, endpoint = null, deactivateSubscription = null } = {}) {
  const subscription = await getCurrentSubscription()
  let browserUnsubscribed = false
  let browserError = null

  if (subscription) {
    try {
      browserUnsubscribed = await subscription.unsubscribe()
      logDev('browser subscription unsubscribed', { unsubscribed: browserUnsubscribed })
    } catch (error) {
      browserError = error
      logDev('browser subscription unsubscribe failed', error)
    }
  }

  if (!deactivateSubscription) {
    return {
      browserUnsubscribed,
      deactivatedSubscription: null,
      error: browserError ? 'browser_unsubscribe_failed' : null,
      browserError,
    }
  }

  const deactivateResult = await deactivateSubscription({
    id: subscriptionId,
    endpoint: endpoint || subscription?.endpoint || null,
  })

  return {
    browserUnsubscribed,
    deactivatedSubscription: deactivateResult.data || null,
    error: deactivateResult.error ? 'subscription_deactivate_failed' : (browserError ? 'browser_unsubscribe_failed' : null),
    browserError,
    deactivateError: deactivateResult.error || null,
  }
}

export async function reconcileSubscription({
  currentMember = null,
  fetchSubscriptions = null,
  saveSubscription = null,
  markSeen = null,
} = {}) {
  const supportStatus = getBrowserSupportStatus()
  const permission = getPermission()
  const browserSubscription = await getCurrentSubscription()
  const subscriptionsResult = fetchSubscriptions
    ? await fetchSubscriptions({
      authUserId: currentMember?.auth_user_id || null,
      memberId: currentMember?.id || null,
    })
    : { data: [], error: null }

  if (subscriptionsResult.error) {
    return {
      supportStatus,
      permission,
      browserSubscription,
      subscriptions: [],
      currentSavedSubscription: null,
      error: subscriptionsResult.error,
    }
  }

  const subscriptions = subscriptionsResult.data || []
  let currentSavedSubscription = browserSubscription
    ? subscriptions.find((subscription) => subscription.endpoint === browserSubscription.endpoint) || null
    : null
  let nextSubscriptions = subscriptions

  if (browserSubscription && permission === 'granted' && saveSubscription) {
    const normalizedSubscription = normalizeSubscription(browserSubscription)
    const saveResult = await saveSubscription({
      ...normalizedSubscription,
      member_id: currentMember?.id || null,
    })

    if (!saveResult.error && saveResult.data) {
      currentSavedSubscription = saveResult.data
      nextSubscriptions = [
        saveResult.data,
        ...subscriptions.filter((subscription) => subscription.id !== saveResult.data.id),
      ]
    }
  } else if (currentSavedSubscription?.id && markSeen) {
    await markSeen({ id: currentSavedSubscription.id })
  }

  return {
    supportStatus,
    permission,
    browserSubscription,
    subscriptions: nextSubscriptions,
    currentSavedSubscription,
    error: null,
  }
}

export const PushService = {
  isSupported,
  getPermission,
  getPermissionState,
  canRequestPermission,
  getBrowserSupportStatus,
  requestPermission,
  getServiceWorkerRegistration,
  getRegistration,
  getCurrentSubscription,
  getExistingSubscription,
  subscribe,
  unsubscribe,
  reconcileSubscription,
  normalizeSubscription,
}
