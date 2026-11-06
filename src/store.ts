import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type {
  Ajustes,
  Bloque,
  BloquePlantilla,
  Canje,
  ClaveFamilia,
  ClaveHabito,
  Cosmeticos,
  DatosBloque,
  ElDespues,
  Dia,
  Habito,
  Jugador,
  Rana,
  Recompensa,
  TareaFamilia,
} from './types'
import { HABITOS } from './logic/catalogo'
import { avanzar, despuesInicial, fraseAvance, fraseRetroceso, retroceder } from './logic/despues'
import { cosmetico } from './logic/cosmeticos'
import { EDIFICIOS, completadasEn, edificioDe, nivelEdificio } from './aldea/edificios'
import { aplicarRana, bloqueFamilia, crearDia, horaCierre, limiteDia, organizar } from './logic/generador'
import { ajustesIniciales, familiaInicial, plantillaInicial, tiendaInicial } from './logic/plantillaInicial'
import {
  ESPERA_SALIDA_MS,
  VENTANA_SIGUE_AHI,
  XP_ACOSTE,
  XP_DIA_CUMPLIDO,
  XP_ESCUDO,
  XP_LEVANTE,
  evaluar,
  monedasDe,
  nivelDeXp,
  tiemposClase,
  xpBloque,
} from './logic/reglas'
import { DIA_MIN, diaSemana, esFinde, fechaLocal, hhmmAMin, minAHhmm, minutosDelDia, msDe, sumarDias, uid } from './logic/tiempo'

export interface Datos {
  plantilla: BloquePlantilla[]
  familia: Record<ClaveFamilia, TareaFamilia>
  ajustes: Ajustes
  dias: Record<string, Dia>
  ranas: Record<string, Rana>
  jugador: Jugador
  habitos: Record<ClaveHabito, Habito>
  tienda: Recompensa[]
  canjes: Canje[]
  despues: ElDespues
  cosmeticos: Cosmeticos
}

export interface Aviso {
  id: string
  texto: string
  tipo: 'xp' | 'info' | 'alerta'
}

export interface Notificacion {
  /** sigue: "¿Sigues ahí?" de clase · aviso: recordatorio simple */
  tipo: 'sigue' | 'aviso'
  /** pestaña que abre al tocarla */
  pestana?: string
  titulo: string
  cuerpo: string
  fecha: string
  id: string
}

type DatosNuevoBloque = DatosBloque & { inicio: number }

interface Acciones {
  asegurarDia: (fecha: string) => void
  evaluarPendientes: (hoy: string) => void
  /** Revisa clases (¿Sigues ahí?, ventanas vencidas). Devuelve notificaciones por lanzar. */
  tick: () => Notificacion[]
  /** Recordatorios: bloque en 5 min, Rana de mañana, resumen semanal. */
  revisarAvisos: () => Notificacion[]

  iniciar: (fecha: string, id: string) => void
  completar: (fecha: string, id: string) => void
  noPude: (fecha: string, id: string) => void
  asistir: (fecha: string, id: string) => void
  decidirOpcional: (fecha: string, id: string, acepta: boolean) => void
  reacomodar: (fecha: string) => void

  checkIn: (fecha: string, id: string) => void
  sigoAqui: (fecha: string, id: string) => void
  checkOut: (fecha: string, id: string) => void
  pedirSalida: (fecha: string, id: string) => void
  cancelarSalida: (fecha: string, id: string) => void
  confirmarSalida: (fecha: string, id: string) => void

  higieneManana: (fecha: string) => void
  higieneNoche: (fecha: string) => void
  comidas: (fecha: string, delta: number) => void
  marcarLevante: (fecha: string) => void
  marcarAcoste: (fecha: string) => void

  familiaHoy: (fecha: string, clave: ClaveFamilia) => void
  agregarBloque: (fecha: string, datos: DatosNuevoBloque) => boolean
  editarBloque: (fecha: string, id: string, datos: DatosNuevoBloque) => void
  borrarBloque: (fecha: string, id: string) => void
  metaHoy: (fecha: string, id: string, meta: string) => void

  agregarPlantilla: (p: Omit<BloquePlantilla, 'id'>) => void
  editarPlantilla: (id: string, p: Omit<BloquePlantilla, 'id'>) => void
  borrarPlantilla: (id: string) => void
  editarFamilia: (clave: ClaveFamilia, t: TareaFamilia) => void
  aplicarPlantillaHoy: (fecha: string) => void

  elegirRana: (fecha: string, rana: Rana | null) => void

  agregarRecompensa: (nombre: string, costo: number) => void
  editarRecompensa: (id: string, nombre: string, costo: number) => void
  borrarRecompensa: (id: string) => void
  canjear: (id: string) => void
  comprarCosmetico: (id: string) => void
  equipar: (id: string) => void

  editarAjustes: (a: Partial<Ajustes>) => void
  avisar: (texto: string, tipo?: Aviso['tipo']) => void
  quitarAviso: (id: string) => void
  exportar: () => string
  importar: (json: string) => boolean
  reiniciar: () => void
}

export type Juego = Datos & { avisos: Aviso[] } & Acciones

const habitoNuevo = (): Habito => ({ racha: 0, mejor: 0, total: 0 })

export function datosIniciales(): Datos {
  return {
    plantilla: plantillaInicial(),
    familia: familiaInicial(),
    ajustes: ajustesIniciales(),
    dias: {},
    ranas: {},
    jugador: { xp: 0, monedas: 0, racha: 0, mejorRacha: 0 },
    habitos: { lectura: habitoNuevo(), rubik: habitoNuevo(), estudio: habitoNuevo() },
    tienda: tiendaInicial(),
    canjes: [],
    despues: despuesInicial(),
    cosmeticos: { comprados: [], equipados: {} },
  }
}

export const reloj = (ajustes: Ajustes) => Date.now() + ajustes.desfaseMin * 60000

// ---------- utilidades sobre el borrador (immer) ----------

type S = Juego

function avisar(s: S, texto: string, tipo: Aviso['tipo'] = 'info') {
  s.avisos.push({ id: uid(), texto, tipo })
  if (s.avisos.length > 4) s.avisos.shift()
}

function otorgar(s: S, dia: Dia, xp: number, monedas: number, motivo: string) {
  if (xp <= 0 && monedas <= 0) return
  const antes = nivelDeXp(s.jugador.xp)
  s.jugador.xp += xp
  s.jugador.monedas += monedas
  dia.xp += xp
  dia.monedas += monedas
  avisar(s, `+${xp} XP · +${monedas} 🪙 ${motivo}`, 'xp')
  const despues = nivelDeXp(s.jugador.xp)
  if (despues > antes) avisar(s, `⬆ ¡Nivel ${despues}! El Reino del Ahora se fortalece.`, 'xp')
}

/** Minutos de "ahora" vistos desde la fecha dada. */
function minDe(s: S, fecha: string) {
  const t = reloj(s.ajustes)
  const hoy = fechaLocal(t)
  if (hoy === fecha) return minutosDelDia(t)
  return fecha < hoy ? DIA_MIN : 0
}

function esHoy(s: S, fecha: string) {
  return fechaLocal(reloj(s.ajustes)) === fecha
}

function hallar(s: S, fecha: string, id: string): { dia?: Dia; b?: Bloque } {
  const dia = s.dias[fecha]
  return { dia, b: dia?.bloques.find((x) => x.id === id) }
}

function reorganizar(s: S, dia: Dia, desde: number) {
  dia.bloques = organizar(dia.bloques, { buffer: s.ajustes.buffer, limite: limiteDia(dia.bloques), desde })
}

function revisarEscudo(s: S, dia: Dia) {
  const h = dia.higiene
  if (!h.escudo && h.manana && h.noche && h.comidas >= s.ajustes.comidasMeta) {
    h.escudo = true
    otorgar(s, dia, XP_ESCUDO, 5, '🛡 Escudo de Higiene')
  }
}

function sumarHabito(s: S, dia: Dia, clave: ClaveHabito) {
  const h = s.habitos[clave]
  h.total++
  if (h.ultima === dia.fecha) return
  h.racha = h.ultima === sumarDias(dia.fecha, -1) ? h.racha + 1 : 1
  h.ultima = dia.fecha
  h.mejor = Math.max(h.mejor, h.racha)
  otorgar(s, dia, Math.min(h.racha, 10) * 2, 0, `🔥 Racha de ${HABITOS[clave]}: ${h.racha}`)
  if (clave === 'estudio' && h.total % 5 === 0 && s.ajustes.estudioMin < 120) {
    s.ajustes.estudioMin += 5
    avisar(s, `📈 Estudio propio sube a ${s.ajustes.estudioMin} min por bloque.`)
  }
}

function finalizar(s: S, dia: Dia, b: Bloque) {
  const min = minDe(s, dia.fecha)
  const cierre = horaCierre(dia.bloques)
  const r = xpBloque(b, cierre !== null && min >= cierre)
  b.estado = 'completado'
  b.terminadoEn = reloj(s.ajustes)
  b.xp = r.xp
  b.monedas = r.monedas
  otorgar(s, dia, r.xp, r.monedas, b.titulo)
  if (r.nota) avisar(s, r.nota, 'alerta')
  if (b.vinculo === 'lectura' || b.vinculo === 'rubik' || b.vinculo === 'estudio') sumarHabito(s, dia, b.vinculo)
  if (b.vinculo === 'higiene-noche') {
    dia.higiene.noche = true
    revisarEscudo(s, dia)
  }
  if (b.esRana && r.xp > 0) avisar(s, '🐸 ¡Venciste a la Rana! Botín doble.', 'xp')
  // Fase 2: el edificio de la expedición sube de nivel
  const ed = edificioDe(b)
  const hechas = completadasEn(ed, s.dias)
  const nivel = nivelEdificio(hechas)
  if (nivel > nivelEdificio(hechas - 1)) avisar(s, `🏛 ${EDIFICIOS[ed].nombre} sube a nivel ${nivel}.`, 'xp')
  // Fase 3: cumplir hace retroceder a El Después
  if (retroceder(s.despues)) avisar(s, fraseRetroceso(s.despues.retrocesos))
}

/** Fase 3: cada "No pude" oscurece un terreno. */
function rendirse(s: S) {
  if (avanzar(s.despues)) avisar(s, fraseAvance(s.despues.avances), 'alerta')
}

function pendientesAntes(dia: Dia) {
  return new Map(dia.bloques.filter((b) => b.estado === 'pendiente').map((b) => [b.id, b.inicio]))
}

function informarReplan(s: S, dia: Dia, antes: Map<string, number>) {
  let movidos = 0
  let fuera = 0
  for (const b of dia.bloques) {
    if (!antes.has(b.id)) continue
    if (b.sinEspacio) fuera++
    else if (antes.get(b.id) !== b.inicio) movidos++
  }
  if (!movidos && !fuera) avisar(s, 'El resto del día sigue igual.')
  else avisar(s, `🗺 Replanifiqué: ${movidos} movido(s)${fuera ? `, ${fuera} sin espacio antes del cierre` : ''}.`)
}

// ---------- store ----------

export const useJuego = create<Juego>()(
  persist(
    immer((set, get) => ({
      ...datosIniciales(),
      avisos: [],

      asegurarDia: (fecha) =>
        set((s) => {
          if (!s.dias[fecha]) s.dias[fecha] = crearDia(fecha, s)
        }),

      evaluarPendientes: (hoy) =>
        set((s) => {
          const fechas = Object.keys(s.dias)
            .filter((f) => f < hoy && !s.dias[f].evaluado)
            .sort()
          for (const f of fechas) {
            const dia = s.dias[f]
            const r = evaluar(dia, s.ajustes.umbralCumplido)
            dia.evaluado = true
            dia.cumplido = r.cumplido
            dia.porcentaje = r.porcentaje
            const j = s.jugador
            if (r.cumplido) {
              j.racha = j.ultimaCumplida === sumarDias(f, -1) ? j.racha + 1 : 1
              j.ultimaCumplida = f
              j.mejorRacha = Math.max(j.mejorRacha, j.racha)
              otorgar(s, dia, XP_DIA_CUMPLIDO, 5, `Día ${f} cumplido (${Math.round(r.porcentaje * 100)}%) 🔥 ${j.racha}`)
            } else {
              j.racha = 0
              avisar(s, `El ${f} quedó en ${Math.round(r.porcentaje * 100)}%. La racha vuelve a empezar.`, 'alerta')
            }
          }
        }),

      tick: () => {
        const notifs: Notificacion[] = []
        set((s) => {
          const t = reloj(s.ajustes)
          const fecha = fechaLocal(t)
          const dia = s.dias[fecha]
          if (!dia) return
          const min = minutosDelDia(t)
          for (const b of dia.bloques) {
            if (b.tipo !== 'clase') continue
            const c = tiemposClase(b)
            if (b.estado === 'pendiente' && min > c.cierreCheckIn) {
              b.estado = 'fallido'
              b.resultado = 'No hiciste check-in en los primeros 5 minutos: esta clase no da XP.'
            }
            if (b.estado === 'activo' && min > c.cierraCheckOut) {
              b.estado = 'fallido'
              b.resultado = 'Sin check-out: la clase no dio XP.'
              avisar(s, `«${b.titulo}» se cerró sin check-out.`, 'alerta')
            }
            if (b.estado === 'activo' && !b.sigueAhi && !b.avisoSigueAhi && min >= c.mitad && min < c.mitad + VENTANA_SIGUE_AHI) {
              b.avisoSigueAhi = true
              notifs.push({ tipo: 'sigue', titulo: '¿Sigues ahí?', cuerpo: `Mitad de ${b.titulo}. Toca para confirmar.`, fecha, id: b.id })
            }
          }
        })
        return notifs
      },

      revisarAvisos: () => {
        const notifs: Notificacion[] = []
        set((s) => {
          const t = reloj(s.ajustes)
          const fecha = fechaLocal(t)
          const dia = s.dias[fecha]
          if (!dia) return
          const min = minutosDelDia(t)
          const a = s.ajustes
          if (!a.sinAvisoBloques) {
            for (const b of dia.bloques) {
              if (b.avisoInicio || b.estado !== 'pendiente' || b.tipo === 'hito' || b.sinEspacio || (b.opcional && !b.aceptado)) continue
              if (min < b.inicio - 5 || min >= b.inicio + 1) continue
              b.avisoInicio = true
              const titulo = b.esRana ? '🐸 La Rana te espera' : b.tipo === 'clase' ? '🎓 Clase en 5 min' : '⚔ Expedición en 5 min'
              const cuerpo = `${b.titulo} a las ${minAHhmm(b.inicio)}${b.tipo === 'clase' ? ' · check-in en los primeros 5 min' : ''}`
              notifs.push({ tipo: 'aviso', titulo, cuerpo, fecha, id: b.id })
            }
          }
          if (!a.sinAvisoRana && !dia.avisoRana && min >= 21 * 60 && !s.ranas[sumarDias(fecha, 1)]) {
            dia.avisoRana = true
            notifs.push({ tipo: 'aviso', titulo: '🐸 Elige la Rana de mañana', cuerpo: 'La tarea más difícil, decidida desde hoy.', fecha, id: 'rana' })
          }
          if (!a.sinAvisoResumen && !dia.avisoResumen && diaSemana(fecha) === 0 && min >= 15 * 60) {
            dia.avisoResumen = true
            notifs.push({
              tipo: 'aviso',
              pestana: 'progreso',
              titulo: '📊 Tu resumen semanal está listo',
              cuerpo: 'Mira qué categorías y franjas funcionaron antes de planear la semana.',
              fecha,
              id: 'resumen',
            })
          }
          for (const n of notifs) avisar(s, `${n.titulo}: ${n.cuerpo}`)
        })
        return notifs
      },

      iniciar: (fecha, id) =>
        set((s) => {
          const { dia, b } = hallar(s, fecha, id)
          if (!dia || !b || b.estado !== 'pendiente') return
          if (!esHoy(s, fecha)) return avisar(s, 'Solo puedes iniciar bloques de hoy.', 'alerta')
          const activo = dia.bloques.find((x) => x.estado === 'activo')
          if (activo) return avisar(s, `Primero termina «${activo.titulo}» o marca "No pude".`, 'alerta')
          const min = minDe(s, fecha)
          b.estado = 'activo'
          b.iniciadoEn = reloj(s.ajustes)
          if (!b.fijo) {
            b.inicio = Math.floor(min)
            const antes = pendientesAntes(dia)
            reorganizar(s, dia, min)
            const movidos = dia.bloques.filter((x) => antes.has(x.id) && antes.get(x.id) !== x.inicio).length
            if (movidos) avisar(s, `⏱ Empezaste a otra hora: moví ${movidos} bloque(s).`)
          }
          avisar(s, `⚔ Expedición iniciada: ${b.titulo}`)
        }),

      completar: (fecha, id) =>
        set((s) => {
          const { dia, b } = hallar(s, fecha, id)
          if (!dia || !b || b.estado !== 'activo' || !b.iniciadoEn) return
          const dur = (b.duracion ?? 0) * 60000
          if (reloj(s.ajustes) - b.iniciadoEn < dur * 0.8) return avisar(s, 'Aún no llegas al 80% del tiempo.', 'alerta')
          finalizar(s, dia, b)
        }),

      noPude: (fecha, id) =>
        set((s) => {
          const { dia, b } = hallar(s, fecha, id)
          if (!dia || !b || (b.estado !== 'pendiente' && b.estado !== 'activo')) return
          b.estado = 'fallido'
          b.terminadoEn = reloj(s.ajustes)
          b.resultado = 'No pude.'
          rendirse(s)
          const antes = pendientesAntes(dia)
          reorganizar(s, dia, minDe(s, fecha))
          informarReplan(s, dia, antes)
        }),

      asistir: (fecha, id) =>
        set((s) => {
          const { dia, b } = hallar(s, fecha, id)
          if (!dia || !b || b.estado !== 'pendiente') return
          if (minDe(s, fecha) < b.inicio - 15) return avisar(s, `Podrás marcarlo desde las ${minAHhmm(b.inicio - 15)}.`, 'alerta')
          finalizar(s, dia, b)
        }),

      decidirOpcional: (fecha, id, acepta) =>
        set((s) => {
          const { b } = hallar(s, fecha, id)
          if (!b) return
          if (acepta) b.aceptado = true
          else {
            b.estado = 'saltado'
            b.resultado = 'Decidiste no ir.'
          }
        }),

      reacomodar: (fecha) =>
        set((s) => {
          const dia = s.dias[fecha]
          if (!dia) return
          const antes = pendientesAntes(dia)
          reorganizar(s, dia, minDe(s, fecha))
          informarReplan(s, dia, antes)
        }),

      checkIn: (fecha, id) =>
        set((s) => {
          const { b } = hallar(s, fecha, id)
          if (!b || b.tipo !== 'clase' || b.estado !== 'pendiente') return
          const min = minDe(s, fecha)
          const c = tiemposClase(b)
          if (!esHoy(s, fecha) || min < c.inicio || min > c.cierreCheckIn)
            return avisar(s, 'El check-in solo vale en los primeros 5 minutos de la clase.', 'alerta')
          b.estado = 'activo'
          b.checkIn = reloj(s.ajustes)
          b.iniciadoEn = msDe(fecha, b.inicio)
          avisar(s, `🎓 Check-in en ${b.titulo}. Quédate hasta el final.`)
        }),

      sigoAqui: (fecha, id) =>
        set((s) => {
          const { b } = hallar(s, fecha, id)
          if (!b || b.estado !== 'activo' || b.sigueAhi) return
          const min = minDe(s, fecha)
          const c = tiemposClase(b)
          if (min < c.mitad || min > c.mitad + VENTANA_SIGUE_AHI) return avisar(s, 'Esa confirmación ya venció.', 'alerta')
          b.sigueAhi = reloj(s.ajustes)
          avisar(s, '👀 Confirmado: sigues en clase.')
        }),

      checkOut: (fecha, id) =>
        set((s) => {
          const { dia, b } = hallar(s, fecha, id)
          if (!dia || !b || b.estado !== 'activo' || !b.checkIn) return
          const c = tiemposClase(b)
          if (minDe(s, fecha) < c.abreCheckOut) return avisar(s, `El check-out abre a las ${minAHhmm(c.abreCheckOut)}.`, 'alerta')
          b.checkOut = reloj(s.ajustes)
          finalizar(s, dia, b)
        }),

      pedirSalida: (fecha, id) =>
        set((s) => {
          const { b } = hallar(s, fecha, id)
          if (b && b.estado === 'activo') b.salidaSolicitada = reloj(s.ajustes)
        }),

      cancelarSalida: (fecha, id) =>
        set((s) => {
          const { b } = hallar(s, fecha, id)
          if (!b) return
          b.salidaSolicitada = undefined
          avisar(s, '💪 Te quedas. El Después retrocede un paso.')
        }),

      confirmarSalida: (fecha, id) =>
        set((s) => {
          const { b } = hallar(s, fecha, id)
          if (!b || !b.salidaSolicitada || b.estado !== 'activo') return
          if (reloj(s.ajustes) - b.salidaSolicitada < ESPERA_SALIDA_MS) return avisar(s, 'Aún no se cumplen los 15 minutos.', 'alerta')
          b.estado = 'fallido'
          b.terminadoEn = reloj(s.ajustes)
          b.resultado = 'Saliste antes de terminar: sin XP.'
          rendirse(s)
        }),

      higieneManana: (fecha) =>
        set((s) => {
          const dia = s.dias[fecha]
          if (!dia) return
          dia.higiene.manana = !dia.higiene.manana
          revisarEscudo(s, dia)
        }),

      higieneNoche: (fecha) =>
        set((s) => {
          const dia = s.dias[fecha]
          if (!dia) return
          dia.higiene.noche = !dia.higiene.noche
          revisarEscudo(s, dia)
        }),

      comidas: (fecha, delta) =>
        set((s) => {
          const dia = s.dias[fecha]
          if (!dia) return
          dia.higiene.comidas = Math.max(0, dia.higiene.comidas + delta)
          revisarEscudo(s, dia)
        }),

      marcarLevante: (fecha) =>
        set((s) => {
          const dia = s.dias[fecha]
          if (!dia || dia.levante) return
          const meta = hhmmAMin(esFinde(fecha) ? s.ajustes.despertarFinde : s.ajustes.despertarSemana)
          if (minDe(s, fecha) <= meta + 10) {
            dia.levante = 'a-tiempo'
            otorgar(s, dia, XP_LEVANTE, monedasDe(XP_LEVANTE), '☀ Me levanté a tiempo')
          } else {
            dia.levante = 'tarde'
            avisar(s, `Te levantaste después de las ${minAHhmm(meta + 10)}. Mañana será.`, 'alerta')
          }
        }),

      marcarAcoste: (fecha) =>
        set((s) => {
          const dia = s.dias[fecha]
          if (!dia || dia.acoste) return
          const meta = hhmmAMin(s.ajustes.horaLuces)
          if (minDe(s, fecha) <= meta + 10) {
            dia.acoste = 'a-tiempo'
            otorgar(s, dia, XP_ACOSTE, monedasDe(XP_ACOSTE), '🌙 Me acosté a tiempo')
          } else {
            dia.acoste = 'tarde'
            avisar(s, 'Después de la hora de luces. A dormir ya.', 'alerta')
          }
        }),

      familiaHoy: (fecha, clave) =>
        set((s) => {
          const dia = s.dias[fecha]
          if (!dia) return
          const activo = !dia.familia[clave]
          dia.familia[clave] = activo
          if (activo) {
            dia.bloques.push(bloqueFamilia(clave, s.familia[clave]))
            const antes = pendientesAntes(dia)
            reorganizar(s, dia, minDe(s, fecha))
            const movidos = dia.bloques.filter((x) => antes.has(x.id) && antes.get(x.id) !== x.inicio).length
            if (movidos) avisar(s, `Moví ${movidos} bloque(s) flexible(s) para hacer espacio.`)
          } else {
            dia.bloques = dia.bloques.filter((b) => !(b.familia === clave && b.estado === 'pendiente'))
          }
        }),

      agregarBloque: (fecha, datos) => {
        let ok = false
        set((s) => {
          const dia = s.dias[fecha]
          if (!dia) return
          const cierre = horaCierre(dia.bloques)
          if (cierre !== null && minDe(s, fecha) >= cierre) return avisar(s, 'Después del cierre no se agregan bloques.', 'alerta')
          dia.bloques.push({ ...datos, id: uid(), estado: 'pendiente' })
          reorganizar(s, dia, minDe(s, fecha))
          ok = true
        })
        return ok
      },

      editarBloque: (fecha, id, datos) =>
        set((s) => {
          const { dia, b } = hallar(s, fecha, id)
          if (!dia || !b) return
          const { titulo, inicio, duracion, categoria, lugar, fijo, tipo, opcional, descanso, nota } = datos
          Object.assign(b, { titulo, inicio, duracion, categoria, lugar, fijo, tipo, opcional, descanso, nota, sinEspacio: false })
          reorganizar(s, dia, minDe(s, fecha))
        }),

      borrarBloque: (fecha, id) =>
        set((s) => {
          const dia = s.dias[fecha]
          if (dia) dia.bloques = dia.bloques.filter((b) => b.id !== id)
        }),

      metaHoy: (fecha, id, meta) =>
        set((s) => {
          const { b } = hallar(s, fecha, id)
          if (b) b.meta = meta
        }),

      agregarPlantilla: (p) => set((s) => void s.plantilla.push({ ...p, id: uid() })),
      editarPlantilla: (id, p) =>
        set((s) => {
          const i = s.plantilla.findIndex((x) => x.id === id)
          if (i >= 0) s.plantilla[i] = { ...p, id }
        }),
      borrarPlantilla: (id) =>
        set((s) => {
          s.plantilla = s.plantilla.filter((x) => x.id !== id)
        }),
      editarFamilia: (clave, t) =>
        set((s) => {
          s.familia[clave] = t
        }),

      aplicarPlantillaHoy: (fecha) =>
        set((s) => {
          const viejo = s.dias[fecha]
          if (!viejo) return
          const nuevo = crearDia(fecha, s)
          const tocados = new Set(viejo.bloques.filter((b) => b.estado !== 'pendiente').map((b) => b.plantillaId ?? b.id))
          const conservados = viejo.bloques.filter((b) => b.estado !== 'pendiente' || (!b.plantillaId && !b.familia))
          const frescos = nuevo.bloques.filter(
            (b) => !(b.plantillaId && tocados.has(b.plantillaId)) && !(b.familia && conservados.some((c) => c.familia === b.familia)),
          )
          viejo.familia = nuevo.familia
          viejo.bloques = [...conservados, ...frescos]
          reorganizar(s, viejo, minDe(s, fecha))
          aplicarRana(viejo.bloques, s.ranas[fecha])
          avisar(s, 'Plantilla aplicada a hoy (lo ya hecho se conserva).')
        }),

      elegirRana: (fecha, rana) =>
        set((s) => {
          if (rana) s.ranas[fecha] = rana
          else delete s.ranas[fecha]
          const dia = s.dias[fecha]
          if (dia) aplicarRana(dia.bloques, rana ?? undefined)
          if (rana) avisar(s, `🐸 Rana elegida: «${rana.tarea}». Mañana será tu primer bloque de trabajo, con XP doble.`)
        }),

      agregarRecompensa: (nombre, costo) => set((s) => void s.tienda.push({ id: uid(), nombre, costo })),
      editarRecompensa: (id, nombre, costo) =>
        set((s) => {
          const r = s.tienda.find((x) => x.id === id)
          if (r) Object.assign(r, { nombre, costo })
        }),
      borrarRecompensa: (id) =>
        set((s) => {
          s.tienda = s.tienda.filter((x) => x.id !== id)
        }),
      canjear: (id) =>
        set((s) => {
          const r = s.tienda.find((x) => x.id === id)
          if (!r) return
          if (s.jugador.monedas < r.costo) return avisar(s, `Te faltan ${r.costo - s.jugador.monedas} 🪙.`, 'alerta')
          s.jugador.monedas -= r.costo
          s.canjes.unshift({ id: uid(), nombre: r.nombre, costo: r.costo, fecha: reloj(s.ajustes) })
          avisar(s, `🎁 Disfruta: ${r.nombre}. Te lo ganaste, sin culpa.`, 'xp')
        }),

      comprarCosmetico: (id) =>
        set((s) => {
          const c = cosmetico(id)
          if (!c || s.cosmeticos.comprados.includes(id)) return
          if (s.jugador.monedas < c.costo) return avisar(s, `Te faltan ${c.costo - s.jugador.monedas} 🪙 para ${c.nombre}.`, 'alerta')
          s.jugador.monedas -= c.costo
          s.cosmeticos.comprados.push(id)
          s.cosmeticos.equipados[c.ranura] = id
          avisar(s, `✨ Compraste ${c.nombre}. Ya está en la aldea.`)
        }),

      equipar: (id) =>
        set((s) => {
          const c = cosmetico(id)
          if (!c || !s.cosmeticos.comprados.includes(id)) return
          const eq = s.cosmeticos.equipados
          eq[c.ranura] = eq[c.ranura] === id ? undefined : id
        }),

      editarAjustes: (a) => set((s) => void Object.assign(s.ajustes, a)),
      avisar: (texto, tipo = 'info') => set((s) => avisar(s, texto, tipo)),
      quitarAviso: (id) =>
        set((s) => {
          s.avisos = s.avisos.filter((a) => a.id !== id)
        }),

      exportar: () => {
        const { avisos: _a, ...resto } = get()
        const datos: Partial<Datos> = {}
        for (const k of Object.keys(datosIniciales()) as (keyof Datos)[]) (datos as Record<string, unknown>)[k] = resto[k]
        return JSON.stringify(datos, null, 2)
      },
      importar: (json) => {
        try {
          const d = JSON.parse(json) as Datos
          if (!d.plantilla || !d.jugador || !d.ajustes) return false
          set((s) => void Object.assign(s, { ...datosIniciales(), ...d }))
          return true
        } catch {
          return false
        }
      },
      reiniciar: () => set((s) => void Object.assign(s, datosIniciales(), { avisos: [] })),
    })),
    {
      name: 'el-despues',
      version: 1,
      partialize: (s) => {
        const { plantilla, familia, ajustes, dias, ranas, jugador, habitos, tienda, canjes, despues, cosmeticos } = s
        return { plantilla, familia, ajustes, dias, ranas, jugador, habitos, tienda, canjes, despues, cosmeticos }
      },
    },
  ),
)

/** Racha visible: se rompe si ayer no quedó cumplido. */
export function rachaVisible(j: Jugador, hoy: string) {
  return j.ultimaCumplida === sumarDias(hoy, -1) || j.ultimaCumplida === hoy ? j.racha : 0
}

