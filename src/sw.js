/// <reference lib="webworker" />
/* global clients */

import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import {
  DEFAULT_PUSH_URL,
  isSameClientUrl,
  parsePushPayload,
  resolveSafeClientUrl,
} from './serviceWorker/pushNotificationCore.js'

const isDev = import.meta.env.DEV

function logDev(message, details) {
  if (!isDev) return

  if (details === undefined) {
    console.info(`[SW] ${message}`)
    return
  }

  console.info(`[SW] ${message}`, details)
}

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

self.skipWaiting()
clientsClaim()

const appShellHandler = createHandlerBoundToURL('/index.html')
registerRoute(new NavigationRoute(appShellHandler))

self.addEventListener('install', () => {
  logDev('install')
})

self.addEventListener('activate', (event) => {
  logDev('activate')

  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    logDev('navigation fetch prepared', event.request.url)
  }
})

self.addEventListener('push', (event) => {
  logDev('push event prepared')

  event.waitUntil((async () => {
    const rawPayload = (() => {
      try {
        return event.data?.json?.() || event.data?.text?.() || null
      } catch {
        try {
          return event.data?.text?.() || null
        } catch {
          return null
        }
      }
    })()

    const { title, options } = parsePushPayload(rawPayload)
    await self.registration.showNotification(title, options)
  })())
})

self.addEventListener('pushsubscriptionchange', (event) => {
  logDev('push subscription change prepared')

  // The service worker has no reliable Supabase auth session. The app reconciles
  // browser and database subscription state when an authenticated user opens it.
  event.waitUntil(Promise.resolve())
})

self.addEventListener('notificationclick', (event) => {
  logDev('notification click prepared', event.notification?.data)

  event.notification?.close()

  const targetUrl = resolveSafeClientUrl(event.notification?.data?.url || DEFAULT_PUSH_URL)

  event.waitUntil(focusOrOpenClient(targetUrl))
})

async function focusOrOpenClient(targetUrl) {
  const windowClients = await clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  })

  const matchingClient = windowClients.find((client) => (
    isSameClientUrl(client.url, targetUrl, self.location.origin)
    && 'focus' in client
  ))

  if (matchingClient) {
    await matchingClient.focus()
    matchingClient.postMessage?.({
      type: 'push-notification-click',
      url: targetUrl,
    })
    return
  }

  const visibleClient = windowClients.find((client) => 'focus' in client)

  if (visibleClient) {
    await visibleClient.focus()
    if ('navigate' in visibleClient) {
      await visibleClient.navigate(targetUrl)
    } else {
      visibleClient.postMessage?.({
        type: 'push-notification-click',
        url: targetUrl,
      })
    }
    return
  }

  await clients.openWindow(targetUrl)
}
