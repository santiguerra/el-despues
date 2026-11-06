// Sonidos sintetizados con WebAudio: sin archivos, funcionan sin conexión.
import { useJuego } from '../store'

export type Sonido = 'salida' | 'botin' | 'fallo' | 'toque' | 'nivel' | 'victoria' | 'sombra' | 'luz' | 'risa' | 'golpe'

let ctx: AudioContext | null = null

function contexto(): AudioContext | null {
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!C) return null
    ctx = new C()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** iOS solo deja sonar audio después de un toque: se llama en el primer pointerdown. */
export function desbloquearAudio() {
  const c = contexto()
  if (!c) return
  const b = c.createBuffer(1, 1, 22050)
  const s = c.createBufferSource()
  s.buffer = b
  s.connect(c.destination)
  s.start(0)
}

function nota(c: AudioContext, frec: number, en: number, dur: number, tipo: OscillatorType, vol: number, hasta?: number) {
  const o = c.createOscillator()
  const g = c.createGain()
  const t = c.currentTime + en
  o.type = tipo
  o.frequency.setValueAtTime(frec, t)
  if (hasta) o.frequency.exponentialRampToValueAtTime(hasta, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(c.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}

export function sonar(s: Sonido) {
  if (useJuego.getState().ajustes.silencio) return
  const c = contexto()
  if (!c || c.state !== 'running') return
  switch (s) {
    case 'salida': // fanfarria corta ascendente
      ;[523, 659, 784].forEach((f, i) => nota(c, f, i * 0.09, 0.14, 'triangle', 0.18))
      nota(c, 1047, 0.27, 0.3, 'triangle', 0.16)
      break
    case 'botin': // arpegio brillante + destello
      ;[784, 1047, 1319, 1568].forEach((f, i) => nota(c, f, i * 0.06, 0.12, 'square', 0.05))
      nota(c, 2093, 0.26, 0.35, 'triangle', 0.08)
      break
    case 'fallo': // descenso lento
      nota(c, 392, 0, 0.25, 'triangle', 0.16)
      nota(c, 330, 0.22, 0.25, 'triangle', 0.14)
      nota(c, 262, 0.44, 0.45, 'triangle', 0.12, 220)
      break
    case 'toque':
      nota(c, 880, 0, 0.05, 'square', 0.04)
      break
    case 'nivel': // arpegio mayor largo
      ;[523, 659, 784, 1047, 1319, 1568].forEach((f, i) => nota(c, f, i * 0.08, 0.2, 'triangle', 0.15))
      nota(c, 2093, 0.5, 0.5, 'square', 0.04)
      break
    case 'victoria': // fanfarria al vencer a la Rana
      ;[392, 523, 659].forEach((f, i) => nota(c, f, i * 0.1, 0.12, 'square', 0.06))
      nota(c, 784, 0.3, 0.18, 'square', 0.06)
      nota(c, 659, 0.48, 0.1, 'square', 0.06)
      nota(c, 784, 0.58, 0.5, 'triangle', 0.18)
      break
    case 'sombra': // zumbido grave que baja
      nota(c, 110, 0, 0.9, 'sawtooth', 0.05, 55)
      nota(c, 165, 0.05, 0.8, 'triangle', 0.08, 82)
      break
    case 'luz': // campanita
      nota(c, 1319, 0, 0.4, 'triangle', 0.12)
      nota(c, 1976, 0.08, 0.5, 'triangle', 0.08)
      break
    case 'risa': // croar burlón
      ;[0, 0.14, 0.28].forEach((t) => nota(c, 180, t, 0.1, 'square', 0.05, 120))
      break
    case 'golpe':
      nota(c, 220, 0, 0.06, 'square', 0.04, 110)
      break
  }
}
