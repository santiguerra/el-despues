// Lógica pura de la aldea (sin Phaser): qué edificio corresponde a cada bloque
// y qué cambios del día merecen una animación.
import type { Bloque, Categoria, Dia, EstadoBloque } from '../types'

export type IdEdificio = 'torre' | 'forja' | 'campamento' | 'taller' | 'taberna'

export interface InfoEdificio {
  nombre: string
  lema: string
  categorias: Categoria[]
}

/** Orden de izquierda a derecha en la aldea. */
export const ORDEN_EDIFICIOS: IdEdificio[] = ['torre', 'forja', 'campamento', 'taller', 'taberna']

export const EDIFICIOS: Record<IdEdificio, InfoEdificio> = {
  torre: {
    nombre: 'Torre del Saber',
    lema: 'Clases, talleres de la U, estudio propio y lectura.',
    categorias: ['clases', 'talleres', 'estudio', 'lectura'],
  },
  forja: {
    nombre: 'La Forja',
    lema: 'Aquí se templa el trabajo de la empresa.',
    categorias: ['empresa'],
  },
  campamento: {
    nombre: 'El Campamento',
    lema: 'Tu hogar: café con Rubik, higiene y rutina.',
    categorias: ['rubik', 'higiene'],
  },
  taller: {
    nombre: 'El Taller',
    lema: 'Proyectos propios que construyes pieza a pieza.',
    categorias: ['proyectos'],
  },
  taberna: {
    nombre: 'La Taberna',
    lema: 'Descanso: amigos, familia y hobbies.',
    categorias: ['social', 'familia', 'hobbies'],
  },
}

/** Edificio del que parte la expedición de un bloque. Los bloques de descanso van a la Taberna. */
export function edificioDe(b: Pick<Bloque, 'categoria' | 'descanso'>): IdEdificio {
  if (b.descanso) return 'taberna'
  for (const id of ORDEN_EDIFICIOS) if (EDIFICIOS[id].categorias.includes(b.categoria)) return id
  return 'campamento'
}

export type TipoEvento = 'inicio' | 'completado' | 'fallido' | 'cancelado'

export interface EventoAldea {
  tipo: TipoEvento
  id: string
  edificio: IdEdificio
  /** el bloque estaba en curso (el guardián estaba fuera) */
  desdeActivo: boolean
}

export type Instantanea = Map<string, EstadoBloque>

export const instantanea = (bloques: Bloque[]): Instantanea => new Map(bloques.map((b) => [b.id, b.estado]))

/** Compara el estado anterior con el actual y devuelve lo que la aldea debe animar, en orden. */
export function cambios(antes: Instantanea, bloques: Bloque[]): EventoAldea[] {
  const eventos: EventoAldea[] = []
  const vistos = new Set<string>()
  // Primero los que terminan, después los que empiezan: así el guardián vuelve antes de salir otra vez.
  const inicios: EventoAldea[] = []
  for (const b of bloques) {
    vistos.add(b.id)
    if (b.tipo === 'hito') continue
    const previo = antes.get(b.id)
    if (previo === undefined || previo === b.estado) continue
    const base = { id: b.id, edificio: edificioDe(b), desdeActivo: previo === 'activo' }
    if (b.estado === 'activo') inicios.push({ ...base, tipo: 'inicio' })
    else if (b.estado === 'completado') eventos.push({ ...base, tipo: 'completado' })
    else if (b.estado === 'fallido' && previo === 'activo') eventos.push({ ...base, tipo: 'fallido' })
  }
  for (const [id, estado] of antes) {
    if (!vistos.has(id) && estado === 'activo') eventos.push({ id, edificio: 'campamento', desdeActivo: true, tipo: 'cancelado' })
  }
  return [...eventos, ...inicios]
}

export interface Estadistica {
  hechos: number
  total: number
  xp: number
  monedas: number
  bloques: Bloque[]
  /** expediciones completadas en toda la historia */
  historico: number
}

/** Resumen de un edificio: lo de hoy y el total acumulado. */
export function estadistica(id: IdEdificio, dias: Record<string, Dia>, fecha: string): Estadistica {
  const deAqui = (b: Bloque) => b.tipo !== 'hito' && edificioDe(b) === id
  const bloques = (dias[fecha]?.bloques ?? []).filter((b) => deAqui(b) && !b.sinEspacio && !(b.opcional && b.estado === 'saltado'))
  const hechos = bloques.filter((b) => b.estado === 'completado')
  const historico = completadasEn(id, dias)
  return {
    hechos: hechos.length,
    total: bloques.length,
    xp: hechos.reduce((t, b) => t + (b.xp ?? 0), 0),
    monedas: hechos.reduce((t, b) => t + (b.monedas ?? 0), 0),
    bloques,
    historico,
  }
}

/** 0 = pleno día · 1 = noche cerrada. */
export function nocheDe(minutos: number): number {
  const rampa = (desde: number, hasta: number) => Math.min(1, Math.max(0, (minutos - desde) / (hasta - desde)))
  if (minutos < 12 * 60) return 1 - rampa(5 * 60 + 30, 7 * 60)
  return rampa(17 * 60 + 30, 19 * 60)
}

// ---------- Fase 2: niveles de edificios y La Rana ----------

/** Expediciones completadas que hacen falta para cada nivel (1 a 5). */
export const UMBRALES_NIVEL = [0, 3, 10, 25, 50]
export const NIVEL_MAX = UMBRALES_NIVEL.length

export function nivelEdificio(completadas: number): number {
  return UMBRALES_NIVEL.filter((u) => completadas >= u).length
}

/** Cuántas expediciones faltan para el siguiente nivel (null si ya está al máximo). */
export function faltanParaNivel(completadas: number): number | null {
  const n = nivelEdificio(completadas)
  return n >= NIVEL_MAX ? null : UMBRALES_NIVEL[n] - completadas
}

export function completadasEn(id: IdEdificio, dias: Record<string, Dia>): number {
  let total = 0
  for (const d of Object.values(dias))
    for (const b of d.bloques) if (b.estado === 'completado' && b.tipo !== 'hito' && edificioDe(b) === id) total++
  return total
}

/**
 * Vida de La Rana (1 = llena, 0 = vencida). Baja con el temporizador y llega a 0
 * justo cuando se habilita "Completar" (80 % del tiempo): completar es el golpe final.
 */
export function vidaRana(b: Pick<Bloque, 'estado' | 'iniciadoEn' | 'duracion'>, ahora: number): number {
  if (b.estado === 'completado') return 0
  if (b.estado !== 'activo' || !b.iniciadoEn || !b.duracion) return 1
  const golpe = b.duracion * 60000 * 0.8
  return Math.max(0, Math.min(1, 1 - (ahora - b.iniciadoEn) / golpe))
}

export const nivelesDe = (dias: Record<string, Dia>) =>
  Object.fromEntries(ORDEN_EDIFICIOS.map((id) => [id, nivelEdificio(completadasEn(id, dias))])) as Record<IdEdificio, number>
