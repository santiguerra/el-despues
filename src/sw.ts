/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// "¿Sigues ahí?": el botón de la notificación responde sin abrir la app si ya está abierta.
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const data = e.notification.data as { fecha: string; id: string } | undefined
  const confirma = e.action === 'sigoaqui' || !e.action
  e.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      if (ventanas.length) {
        const v = ventanas[0]
        if (confirma && data) v.postMessage({ tipo: 'sigoaqui', ...data })
        return v.focus()
      }
      const url = confirma && data ? `./?accion=sigoaqui&fecha=${data.fecha}&id=${data.id}` : './'
      return self.clients.openWindow(url)
    })(),
  )
})
