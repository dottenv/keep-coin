/// <reference lib="webworker" />
// @ts-nocheck
import { precacheAndRoute, createHandlerBoundToURL, cleanupOutdatedCaches } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import { registerRoute } from 'workbox-routing'
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

self.skipWaiting()
clientsClaim()

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Все навигации (в т.ч. офлайн) отдаём закешированный app-shell, чтобы PWA
// не «выпадала» в браузер.
const navigationHandler = createHandlerBoundToURL('/index.html')
registerRoute(({ request }) => request.mode === 'navigate', navigationHandler)

// GET /api — кешируем (офлайн-чтение ранее открытых данных).
registerRoute(
  ({ url, request }) => url.pathname.startsWith('/api') && request.method === 'GET',
  new StaleWhileRevalidate({
    cacheName: 'kc-api',
    plugins: [new ExpirationPlugin({ maxEntries: 150, maxAgeSeconds: 7 * 24 * 3600 })],
  }),
)

// Статика (хешированные JS/CSS/шрифты) и картинки.
registerRoute(
  ({ request, destination }) =>
    destination === 'style' || destination === 'script' || destination === 'font',
  new StaleWhileRevalidate({
    cacheName: 'kc-static',
    plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 30 * 24 * 3600 })],
  }),
)
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'kc-images',
    plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 30 * 24 * 3600 })],
  }),
)

// ---------- WebPush ----------
self.addEventListener('push', (event) => {
  let data = { title: 'Keep Coin', body: '' }
  try {
    if (event.data) data = Object.assign(data, event.data.json())
  } catch (e) {
    data.body = event.data ? event.data.text() : ''
  }
  const title = data.title || 'Keep Coin'
  const options = {
    body: data.body || '',
    icon: '/icons/maskable-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || undefined,
    data: { url: data.url || '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ('focus' in client) {
            client.focus()
            if ('navigate' in client) client.navigate(url)
            return
          }
        }
        return self.clients.openWindow(url)
      }),
  )
})
