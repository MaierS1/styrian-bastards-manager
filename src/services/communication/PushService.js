const IOS_PLATFORM_PATTERN = /iPad|iPhone|iPod/

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
    || window.navigator.standalone === true
}

function logDev(message, details) {
  if (!import.meta.env.DEV) return

  if (details === undefined) {
    console.info(`[PushService] ${message}`)
    return
  }

  console.info(`[PushService] ${message}`, details)
}

export function getPermission() {
  if (!isNotificationApiSupported()) return 'unsupported'

  return Notification.permission
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

export async function getServiceWorkerRegistration() {
  if (!isServiceWorkerSupported()) {
    logDev('service worker unsupported')
    return null
  }

  const existingRegistration = await navigator.serviceWorker.getRegistration()

  if (existingRegistration) {
    logDev('service worker registration found', existingRegistration.scope)
    return existingRegistration
  }

  if (navigator.serviceWorker.controller) {
    const readyRegistration = await navigator.serviceWorker.ready
    logDev('service worker registration ready', readyRegistration.scope)
    return readyRegistration
  }

  logDev('service worker registration not available yet')
  return null
}

export const PushService = {
  isSupported,
  getPermission,
  canRequestPermission,
  getServiceWorkerRegistration,
}
