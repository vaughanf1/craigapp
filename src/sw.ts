/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'

declare const self: ServiceWorkerGlobalScope

/**
 * Service worker: offline app shell + push notifications. A push from the
 * server is your coach ringing — tapping it opens the call screen.
 */
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
registerRoute(new NavigationRoute(new NetworkFirst({ cacheName: 'pages' })))

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
