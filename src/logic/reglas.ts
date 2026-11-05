import type { Bloque, Dia } from '../types'
import { TRABAJO } from './catalogo'

// ---- XP y nivel ----

export const XP_EVENTO = 10
export const XP_LEVANTE = 15
export const XP_ACOSTE = 15
export const XP_ESCUDO = 20
export const XP_SIGUE_AHI = 5
export const XP_DIA_CUMPLIDO = 25

/** XP total necesaria para alcanzar el nivel n (n=1 → 0, n=2 → 100, n=3 → 300…). */
export const umbralNivel = (n: number) => 50 * n * (n - 1)

export function nivelDeXp(xp: number): number {
  let n = 1
  while (xp >= umbralNivel(n + 1)) n++
  return n
}

export const monedasDe = (xp: number) => Math.ceil(xp / 5)

export function xpBloque(b: Bloque, despuesDeCierre: boolean): { xp: number; monedas: number; nota?: string } {
  if (despuesDeCierre && TRABAJO.includes(b.categoria)) {
    return { xp: 0, monedas: 0, nota: 'Después del cierre no hay XP de trabajo.' }
  }
  let xp = b.tipo === 'evento' ? XP_EVENTO : Math.max(5, Math.round((b.duracion ?? 30) / 3))
  if (b.esRana) xp *= 2
  if (b.tipo === 'clase' && b.sigueAhi) xp += XP_SIGUE_AHI
  return { xp, monedas: monedasDe(xp) }
}

// ---- Clases ----

export const VENTANA_CHECKIN = 5
export const VENTANA_SIGUE_AHI = 10
export const CHECKOUT_ANTES = 5
export const CHECKOUT_DESPUES = 30
export const ESPERA_SALIDA_MS = 15 * 60000

export function tiemposClase(b: Bloque) {
  const dur = b.duracion ?? 0
  return {
    inicio: b.inicio,
    fin: b.inicio + dur,
    mitad: b.inicio + dur / 2,
    cierreCheckIn: b.inicio + VENTANA_CHECKIN,
    abreCheckOut: b.inicio + dur - CHECKOUT_ANTES,
    cierraCheckOut: b.inicio + dur + CHECKOUT_DESPUES,
  }
}

// ---- Evaluación del día ----

/** Bloques que cuentan para el % del día. */
export function contables(dia: Dia): Bloque[] {
  return dia.bloques.filter(
    (b) => b.tipo !== 'hito' && b.duracion !== null && !b.sinEspacio && b.estado !== 'saltado' && !(b.opcional && !b.aceptado),
  )
}

export function evaluar(dia: Dia, umbral: number) {
  const c = contables(dia)
  const hechos = c.filter((b) => b.estado === 'completado').length
  const porcentaje = c.length ? hechos / c.length : 0
  return { hechos, total: c.length, porcentaje, cumplido: c.length > 0 && porcentaje >= umbral }
}
