// Fase 4: resumen semanal (% cumplido por categoría y franja horaria).
import type { Categoria, Dia } from '../types'
import { LISTA_CATEGORIAS } from './catalogo'
import { contables } from './reglas'
import { diaSemana, sumarDias } from './tiempo'

export type Franja = 'manana' | 'tarde' | 'noche'

export const FRANJAS: { id: Franja; nombre: string; desde: number; hasta: number }[] = [
  { id: 'manana', nombre: 'Mañana (antes de 12:00)', desde: 0, hasta: 12 * 60 },
  { id: 'tarde', nombre: 'Tarde (12:00–18:00)', desde: 12 * 60, hasta: 18 * 60 },
  { id: 'noche', nombre: 'Noche (desde 18:00)', desde: 18 * 60, hasta: 24 * 60 },
]

export const franjaDe = (inicio: number): Franja => FRANJAS.find((f) => inicio >= f.desde && inicio < f.hasta)?.id ?? 'noche'

export interface Conteo {
  hechos: number
  total: number
}

export interface ResumenSemana {
  lunes: string
  domingo: string
  total: Conteo
  categorias: (Conteo & { categoria: Categoria })[]
  franjas: (Conteo & { franja: Franja })[]
  xp: number
  monedas: number
  diasCumplidos: number
  diasRegistrados: number
  noPude: number
}

/** Lunes de la semana de una fecha "YYYY-MM-DD". */
export const lunesDe = (fecha: string) => sumarDias(fecha, -((diaSemana(fecha) + 6) % 7))

export const pct = (c: Conteo) => (c.total ? c.hechos / c.total : 0)

export function resumenSemana(dias: Record<string, Dia>, lunes: string, umbral: number): ResumenSemana {
  const cat = new Map<Categoria, Conteo>()
  const fr = new Map<Franja, Conteo>(FRANJAS.map((f) => [f.id, { hechos: 0, total: 0 }]))
  const total: Conteo = { hechos: 0, total: 0 }
  let xp = 0
  let monedas = 0
  let diasCumplidos = 0
  let diasRegistrados = 0
  let noPude = 0
  for (let i = 0; i < 7; i++) {
    const dia = dias[sumarDias(lunes, i)]
    if (!dia) continue
    diasRegistrados++
    xp += dia.xp
    monedas += dia.monedas
    const lista = contables(dia)
    const hechosDia = lista.filter((b) => b.estado === 'completado').length
    if (lista.length && hechosDia / lista.length >= umbral) diasCumplidos++
    for (const b of lista) {
      const hecho = b.estado === 'completado' ? 1 : 0
      if (b.estado === 'fallido' && b.resultado === 'No pude.') noPude++
      const c = cat.get(b.categoria) ?? { hechos: 0, total: 0 }
      c.hechos += hecho
      c.total++
      cat.set(b.categoria, c)
      const f = fr.get(franjaDe(b.inicio))!
      f.hechos += hecho
      f.total++
      total.hechos += hecho
      total.total++
    }
  }
  return {
    lunes,
    domingo: sumarDias(lunes, 6),
    total,
    categorias: LISTA_CATEGORIAS.filter((c) => cat.has(c)).map((c) => ({ categoria: c, ...cat.get(c)! })),
    franjas: FRANJAS.map((f) => ({ franja: f.id, ...fr.get(f.id)! })),
    xp,
    monedas,
    diasCumplidos,
    diasRegistrados,
    noPude,
  }
}
