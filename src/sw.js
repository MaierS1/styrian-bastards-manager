/// <reference lib="webworker" />
/* global clients */

import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

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

  event.waitUntil(Promise.resolve())
})

self.addEventListener('pushsubscriptionchange', (event) => {
  logDev('push subscription change prepared')

  event.waitUntil(Promise.resolve())
})

self.addEventListener('notificationclick', (event) => {
  logDev('notification click prepared', event.notification?.data)

  event.notification?.close()

  event.waitUntil(focusExistingClient())
})

async function focusExistingClient() {
  const windowClients = await clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  })

  const visibleClient = windowClients.find((client) => 'focus' in client)

  if (visibleClient) {
    await visibleClient.focus()
  }
}
