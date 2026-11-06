import type { Ajustes, Bloque, BloquePlantilla, ClaveFamilia, Dia, Rana, TareaFamilia } from '../types'
import { CATEGORIAS_RANA } from './catalogo'
import { DIA_MIN, diaSemana, hhmmAMin, minAHhmm, uid } from './tiempo'

export const finDe = (b: Pick<Bloque, 'inicio' | 'duracion'>) => (b.duracion === null ? Infinity : b.inicio + b.duracion)

const porInicio = (a: Bloque, b: Bloque) => a.inicio - b.inicio || (a.tipo === 'hito' ? -1 : 0)

/** Hora del cierre (hito con vínculo "cierre"); null si ese día no hay cierre (viernes). */
export function horaCierre(bloques: Bloque[]): number | null {
  const c = bloques.find((b) => b.vinculo === 'cierre')
  return c ? c.inicio : null
}

export const limiteDia = (bloques: Bloque[]) => horaCierre(bloques) ?? DIA_MIN

/** ¿Este bloque ocupa tiempo en la agenda? */
export function ocupa(b: Bloque): boolean {
  return b.tipo !== 'hito' && !b.sinEspacio && b.estado !== 'saltado' && b.estado !== 'fallido' && !(b.opcional && !b.aceptado)
}

export function metaRubik(fecha: string, metas: string[]): string | undefined {
  if (!metas.length) return undefined
  const dia = Math.floor(new Date(`${fecha}T12:00:00`).getTime() / 86400000)
  return metas[dia % metas.length]
}

export function bloqueFamilia(clave: ClaveFamilia, t: TareaFamilia): Bloque {
  return {
    id: uid(),
    familia: clave,
    titulo: t.titulo,
    inicio: hhmmAMin(t.inicio),
    duracion: t.duracion,
    categoria: 'familia',
    lugar: t.lugar,
    fijo: true,
    tipo: 'evento',
    estado: 'pendiente',
  }
}

export function desdePlantilla(p: BloquePlantilla, fecha: string, ajustes: Ajustes): Bloque {
  const { dia: _dia, inicio, id, ...datos } = p
  const b: Bloque = { ...datos, id: uid(), plantillaId: id, inicio: hhmmAMin(inicio), estado: 'pendiente' }
  if (p.vinculo === 'estudio') b.duracion = ajustes.estudioMin
  if (p.vinculo === 'rubik') b.meta = metaRubik(fecha, ajustes.rubikMetas)
  return b
}

interface OpcOrganizar {
  buffer: number
  limite: number
  /** no colocar nada antes de este minuto (ahora) */
  desde: number
}

/**
 * Acomoda los bloques FLEXIBLES pendientes: respeta su hora deseada como mínimo,
 * deja `buffer` minutos con cualquier otro bloque y no pasa del límite (cierre).
 * Los que no caben quedan marcados `sinEspacio`. Los fijos nunca se mueven.
 */
export function organizar(bloques: Bloque[], o: OpcOrganizar): Bloque[] {
  const movible = (b: Bloque) => !b.fijo && b.tipo !== 'hito' && b.estado === 'pendiente'
  const resto = bloques.filter((b) => !movible(b))
  const ocupados: [number, number][] = resto.filter(ocupa).map((b) => [b.inicio, finDe(b)])
  const redondear = (t: number) => Math.ceil(t / 5) * 5

  const colocados = bloques
    .filter(movible)
    .sort(porInicio)
    .map((b) => {
      const dur = b.duracion ?? 60
      let t = redondear(Math.max(b.inicio, o.desde))
      let cambio = true
      while (cambio && t + dur <= o.limite) {
        cambio = false
        for (const [s, e] of ocupados) {
          if (t < e + o.buffer && t + dur + o.buffer > s) {
            t = redondear(e + o.buffer)
            cambio = true
          }
        }
      }
      if (t + dur <= o.limite) {
        ocupados.push([t, t + dur])
        return { ...b, inicio: t, sinEspacio: false }
      }
      return { ...b, sinEspacio: true }
    })

  return [...resto, ...colocados].sort(porInicio)
}

/** La Rana vive en el primer bloque de trabajo flexible del día. */
export function aplicarRana(bloques: Bloque[], rana: Rana | undefined): void {
  for (const b of bloques) {
    if (b.esRana) {
      b.esRana = false
      if (b.tituloOriginal) b.titulo = b.tituloOriginal
    }
  }
  if (!rana) return
  const candidato = bloques
    .filter((b) => !b.fijo && b.tipo === 'normal' && CATEGORIAS_RANA.includes(b.categoria) && !b.sinEspacio && b.estado === 'pendiente')
    .sort(porInicio)[0]
  if (!candidato) return
  candidato.esRana = true
  candidato.tituloOriginal = candidato.titulo
  candidato.titulo = rana.tarea
  if (rana.categoria) candidato.categoria = rana.categoria
}

export interface FuenteDia {
  plantilla: BloquePlantilla[]
  familia: Record<ClaveFamilia, TareaFamilia>
  ajustes: Ajustes
  ranas: Record<string, Rana>
}

export function crearDia(fecha: string, f: FuenteDia): Dia {
  const dow = diaSemana(fecha)
  const familia = { hermana: !!f.familia.hermana.dias[dow], hermano: !!f.familia.hermano.dias[dow] }
  let bloques = f.plantilla.filter((p) => p.dia === dow).map((p) => desdePlantilla(p, fecha, f.ajustes))
  for (const k of ['hermana', 'hermano'] as const) if (familia[k]) bloques.push(bloqueFamilia(k, f.familia[k]))
  bloques = organizar(bloques, { buffer: f.ajustes.buffer, limite: limiteDia(bloques), desde: 0 })
  aplicarRana(bloques, f.ranas[fecha])
  return {
    fecha,
    bloques,
    higiene: { manana: false, comidas: 0, noche: false, escudo: false },
    familia,
    xp: 0,
    monedas: 0,
    evaluado: false,
  }
}

const rango = (b: { inicio: number; duracion: number | null }) =>
  b.duracion === null ? `desde ${minAHhmm(b.inicio)}` : `${minAHhmm(b.inicio)}–${minAHhmm(b.inicio + b.duracion)}`

/** Choques entre bloques fijos (ej. tarea de familia contra una clase). */
export function choques(bloques: Bloque[]): string[] {
  const fijos = bloques.filter((b) => b.fijo && ocupa(b)).sort(porInicio)
  const msgs: string[] = []
  for (let i = 0; i < fijos.length; i++) {
    for (let j = i + 1; j < fijos.length; j++) {
      const a = fijos[i]
      const b = fijos[j]
      if (b.inicio < finDe(a) && a.inicio < finDe(b)) {
        const fam = a.familia ? a : b.familia ? b : null
        const otro = fam === a ? b : a
        if (fam && otro.tipo === 'clase') {
          msgs.push(`«${fam.titulo}» (${rango(fam)}) choca con la clase «${otro.titulo}» (${rango(otro)}).`)
        } else {
          msgs.push(`«${a.titulo}» (${rango(a)}) se cruza con «${b.titulo}» (${rango(b)}).`)
        }
      }
    }
  }
  return msgs
}

/** Choques de las tareas de familia con las clases, revisando la plantilla semanal. */
export function choquesFamiliaPlantilla(plantilla: BloquePlantilla[], familia: Record<ClaveFamilia, TareaFamilia>): string[] {
  const nombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const msgs: string[] = []
  for (const k of ['hermana', 'hermano'] as const) {
    const t = familia[k]
    const ini = hhmmAMin(t.inicio)
    const fin = ini + t.duracion
    t.dias.forEach((activo, dia) => {
      if (!activo) return
      for (const p of plantilla) {
        if (p.dia !== dia || p.tipo !== 'clase') continue
        const pi = hhmmAMin(p.inicio)
        const pf = p.duracion === null ? Infinity : pi + p.duracion
        if (ini < pf && pi < fin) msgs.push(`${nombres[dia]}: «${t.titulo}» choca con «${p.titulo}» (${rango({ inicio: pi, duracion: p.duracion })}).`)
      }
    })
  }
  return msgs
}
