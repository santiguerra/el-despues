/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Notificaciones: el botón "Sigo aquí" responde sin abrir la app si ya está abierta;
// los recordatorios simples solo la abren (en la pestaña indicada, si hay una).
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const data = e.notification.data as { tipo?: string; fecha: string; id: string; pestana?: string } | undefined
  const confirma = data !== undefined && data.tipo !== 'aviso' && (e.action === 'sigoaqui' || !e.action)
  e.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      if (ventanas.length) {
        const v = ventanas[0]
        if (confirma) v.postMessage({ tipo: 'sigoaqui', fecha: data.fecha, id: data.id })
        else if (data?.pestana) v.postMessage({ tipo: 'pestana', pestana: data.pestana })
        return v.focus()
      }
      const url = confirma
        ? `./?accion=sigoaqui&fecha=${data.fecha}&id=${data.id}`
        : data?.pestana
          ? `./?pestana=${data.pestana}`
          : './'
      return self.clients.openWindow(url)
    })(),
  )
})
