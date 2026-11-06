import { useEffect, useRef, useState } from 'react'
import { reloj, useJuego, type Notificacion } from './store'
import { fechaLocal } from './logic/tiempo'

/** Hora actual (con el desfase del modo prueba), refrescada cada segundo. */
export function useAhora(): number {
  const ajustes = useJuego((s) => s.ajustes)
  const [, setTic] = useState(0)
  useEffect(() => {
    const refrescar = () => setTic((n) => n + 1)
    const i = setInterval(refrescar, 1000)
    document.addEventListener('visibilitychange', refrescar)
    return () => {
      clearInterval(i)
      document.removeEventListener('visibilitychange', refrescar)
    }
  }, [])
  return reloj(ajustes)
}

export async function pedirPermisoNotificaciones(): Promise<string> {
  if (!('Notification' in window)) return 'no-soportado'
  return Notification.requestPermission()
}

async function notificar(n: Notificacion) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const sigue = n.tipo === 'sigue'
  const opciones = {
    body: n.cuerpo,
    tag: `${n.tipo}-${n.fecha}-${n.id}`,
    data: { tipo: n.tipo, fecha: n.fecha, id: n.id, pestana: n.pestana },
    requireInteraction: sigue,
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    vibrate: sigue ? [200, 100, 200] : [120],
    actions: sigue ? [{ action: 'sigoaqui', title: 'Sigo aquí' }] : [],
  } as NotificationOptions
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) await reg.showNotification(n.titulo, opciones)
    else new Notification(n.titulo, opciones)
  } catch {
    /* sin notificación: el modal en pantalla sigue funcionando */
  }
}

/** Motor del juego: genera el día, evalúa días pasados y vigila las clases. */
export function useMotor(ahora: number, irA: (pestana: string) => void) {
  const fecha = fechaLocal(ahora)
  const ir = useRef(irA)
  ir.current = irA
  const tramo = Math.floor(ahora / 5000)

  useEffect(() => {
    const s = useJuego.getState()
    s.asegurarDia(fecha)
    s.evaluarPendientes(fecha)
  }, [fecha])

  useEffect(() => {
    const s = useJuego.getState()
    for (const n of [...s.tick(), ...s.revisarAvisos()]) void notificar(n)
  }, [tramo])

  useEffect(() => {
    // Botón "Sigo aquí" de la notificación (vía service worker) o enlace de apertura.
    const alMensaje = (e: MessageEvent) => {
      if (e.data?.tipo === 'sigoaqui') useJuego.getState().sigoAqui(e.data.fecha, e.data.id)
      if (e.data?.tipo === 'pestana') ir.current(e.data.pestana)
    }
    navigator.serviceWorker?.addEventListener('message', alMensaje)
    const p = new URLSearchParams(location.search)
    if (p.get('accion') === 'sigoaqui' && p.get('fecha') && p.get('id')) {
      useJuego.getState().sigoAqui(p.get('fecha')!, p.get('id')!)
      history.replaceState(null, '', location.pathname)
    }
    if (p.get('pestana')) {
      ir.current(p.get('pestana')!)
      history.replaceState(null, '', location.pathname)
    }
    return () => navigator.serviceWorker?.removeEventListener('message', alMensaje)
  }, [])
}
