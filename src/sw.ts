/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'

declare const self: ServiceWorkerGlobalScope

/**
 * Service worker: offline app shell + push notifications. A push from the
 * server is your coach ringing — tapping it opens the call screen.
 *
 * Updates must land immediately: a new deploy activates on the next page load
 * (skipWaiting + clientsClaim, and the worker itself reloads any window still showing the old shell),
 * and page navigations always try the network first — including "/" — so nobody
 * sees a stale app shell from the precache.
 */
self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()

/**
 * A phone that opened the app weeks ago can still be showing the old shell its previous
 * service worker cached (old coach roster, clips that no longer exist). When THIS worker
 * installs over an older one, reload every open window as soon as it takes control, so the
 * person sees the current app without having to know to close and reopen it.
 */
let upgrading = false
self.addEventListener('install', () => {
  upgrading = Boolean(self.registration.active)
})
self.addEventListener('activate', (event) => {
  if (!upgrading) return
  // Take the open windows, then reload them only AFTER activation has finished. A navigation
  // cannot complete while this worker is still activating, so awaiting navigate() inside
  // waitUntil would deadlock: the page would hang on the old shell until the browser gave up.
  event.waitUntil(
    self.clients.claim().then(() => {
      setTimeout(() => {
        self.clients
          .matchAll({ type: 'window' })
          .then((clients) => clients.forEach((c) => { c.navigate(c.url).catch(() => {}) }))
      }, 100)
    }),
  )
})
// Navigation route first so it wins over the precache's index.html for "/"
registerRoute(new NavigationRoute(new NetworkFirst({ cacheName: 'pages', networkTimeoutSeconds: 4 })))
precacheAndRoute(self.__WB_MANIFEST)

interface CallPush {
  title: string
  body: string
  url: string
  deliveryId?: string
  coachId?: string
  kind?: string
}

self.addEventListener('push', (event) => {
  let data: CallPush = { title: 'Your coach is calling', body: 'Tap to answer', url: '/app/call' }
  try {
    data = { ...data, ...(event.data?.json() as Partial<CallPush>) }
  } catch {
    // plain-text push — keep the defaults
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      tag: data.deliveryId ?? 'coach-call',
      requireInteraction: true,
      data,
      // @ts-expect-error vibrate/actions are supported on Android; typed loosely across browsers
      vibrate: [300, 150, 300, 150, 300],
      actions: [
        { action: 'answer', title: 'Answer' },
        { action: 'later', title: 'Later' },
      ],
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data as CallPush
  if (event.action === 'later') return
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
      const existing = clients.find((c) => 'focus' in c)
      if (existing) {
        await existing.focus()
        existing.navigate(data.url).catch(() => {})
        return
      }
      await self.clients.openWindow(data.url)
    }),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
