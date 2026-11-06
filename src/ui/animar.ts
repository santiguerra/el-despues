// Animaciones con GSAP: confeti con física, botín que vuela a la cabecera,
// rebotes y contadores. Todo respeta "reducir movimiento" del sistema.
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { Physics2DPlugin } from 'gsap/Physics2DPlugin'
import { CustomEase } from 'gsap/CustomEase'
import { CustomWiggle } from 'gsap/CustomWiggle'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(useGSAP, Physics2DPlugin, CustomEase, CustomWiggle, SplitText)
CustomWiggle.create('sacudir', { wiggles: 6, type: 'easeOut' })

export { gsap, useGSAP, SplitText }

export const reducido = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const COLORES = ['#58cc02', '#ffc800', '#1cb0f6', '#ff4b4b', '#ff9600', '#ce82ff']
const azar = (a: number, b: number) => a + Math.random() * (b - a)

/** Último punto tocado: de ahí sale el botín que vuela. */
export const ultimoToque = { x: 0, y: 0 }

/** Confeti con física desde un punto de la pantalla. */
export function confeti(x: number, y: number, cantidad = 30, colores = COLORES) {
  if (reducido()) return
  for (let i = 0; i < cantidad; i++) {
    const d = document.createElement('i')
    d.className = 'confeti'
    d.style.background = colores[i % colores.length]
    d.style.left = `${x}px`
    d.style.top = `${y}px`
    if (i % 3 === 0) d.style.borderRadius = '50%'
    document.body.appendChild(d)
    const dur = azar(1.1, 1.8)
    gsap.to(d, {
      duration: dur,
      physics2D: { velocity: azar(260, 620), angle: azar(200, 340), gravity: 1100 },
      rotation: azar(-900, 900),
      scaleX: azar(0.4, 1.2),
      ease: 'none',
      onComplete: () => d.remove(),
    })
    gsap.to(d, { opacity: 0, duration: 0.4, delay: dur - 0.4 })
  }
}

/** Rebote elástico (para contadores que reciben botín). */
export function saltar(el: Element | null, fuerza = 1.35) {
  if (!el || reducido()) return
  gsap.fromTo(el, { scale: fuerza }, { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.35)', overwrite: 'auto', clearProps: 'transform' })
}

/**
 * Lanza fichas (monedas, rayos) desde un punto hasta un elemento, en arco.
 * Al llegar cada una hace saltar al destino.
 */
export function volar(plantilla: HTMLElement, cantidad: number, desde: { x: number; y: number }, destino: Element | null, alLlegar?: () => void) {
  if (!destino || cantidad <= 0) return
  if (reducido()) return alLlegar?.()
  const meta = destino.getBoundingClientRect()
  const mx = meta.left + meta.width / 2
  const my = meta.top + meta.height / 2
  for (let i = 0; i < cantidad; i++) {
    const f = plantilla.cloneNode(true) as HTMLElement
    f.classList.add('ficha-voladora')
    f.style.left = `${desde.x}px`
    f.style.top = `${desde.y}px`
    document.body.appendChild(f)
    const sx = azar(-60, 60)
    const sy = azar(-90, -30)
    const tl = gsap.timeline({ delay: i * 0.06, onComplete: () => (f.remove(), saltar(destino), i === cantidad - 1 && alLlegar?.()) })
    tl.fromTo(f, { scale: 0, x: 0, y: 0 }, { scale: 1.2, x: sx, y: sy, duration: 0.35, ease: 'back.out(2)' })
      .to(f, { x: mx - desde.x, duration: 0.55, ease: 'power2.in' }, '>-0.02')
      .to(f, { y: my - desde.y, duration: 0.55, ease: 'back.in(1.4)' }, '<')
      .to(f, { scale: 0.5, duration: 0.55, ease: 'power1.in' }, '<')
  }
}

/** Número que cuenta hacia su nuevo valor. */
export function contar(el: HTMLElement | null, desde: number, hasta: number, duracion = 0.8, retraso = 0) {
  if (!el) return
  if (reducido() || desde === hasta) {
    el.textContent = String(hasta)
    return
  }
  const o = { v: desde }
  el.textContent = String(desde)
  gsap.to(o, {
    v: hasta,
    duration: duracion,
    delay: retraso,
    ease: 'power2.out',
    onUpdate: () => (el.textContent = String(Math.round(o.v))),
  })
}

/** Rebote al soltar cualquier botón o tarjeta tocable: la app "responde" con el cuerpo. */
export function activarRebotes() {
  const tocable = '.btn, .navegacion button, .fila, .ahora, .cosmetico, .enlace, .cerrar, label.check'
  document.addEventListener(
    'pointerdown',
    (e) => {
      ultimoToque.x = e.clientX
      ultimoToque.y = e.clientY
    },
    { capture: true, passive: true },
  )
  document.addEventListener(
    'click',
    (e) => {
      const el = (e.target as Element | null)?.closest?.(tocable) as HTMLButtonElement | null
      if (!el || el.disabled || reducido()) return
      gsap.fromTo(el, { scale: 0.93 }, { scale: 1, duration: 0.55, ease: 'elastic.out(1.2, 0.4)', overwrite: 'auto', clearProps: 'transform' })
    },
    { capture: true, passive: true },
  )
}
