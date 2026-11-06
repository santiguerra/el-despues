import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Bloque, Dia } from '../types'
import { cambios, edificioDe, estadistica, faltanParaNivel, instantanea, nivelEdificio, nocheDe, vidaRana } from '../aldea/edificios'
import { ORDEN_TERRENOS, TERRENOS, avanzar, despuesInicial, retroceder } from './despues'
import { COSMETICOS } from './cosmeticos'
import { franjaDe, lunesDe, resumenSemana } from './resumen'
import { datosIniciales, useJuego } from '../store'

const LUNES = '2026-11-09'

const b = (p: Partial<Bloque> & { inicio: number }): Bloque => ({
  id: Math.random().toString(36).slice(2),
  titulo: 'x',
  duracion: 60,
  categoria: 'empresa',
  lugar: 'cuarto',
  fijo: false,
  tipo: 'normal',
  estado: 'pendiente',
  ...p,
})

const dia = (fecha: string, bloques: Bloque[], extra: Partial<Dia> = {}): Dia => ({
  fecha,
  bloques,
  higiene: { manana: false, comidas: 0, noche: false, escudo: false },
  familia: { hermana: false, hermano: false },
  xp: 0,
  monedas: 0,
  evaluado: false,
  ...extra,
})

describe('Fase 1 · aldea', () => {
  it('cada categoría sale de su edificio', () => {
    expect(edificioDe({ categoria: 'empresa' })).toBe('forja')
    expect(edificioDe({ categoria: 'clases' })).toBe('torre')
    expect(edificioDe({ categoria: 'lectura' })).toBe('torre')
    expect(edificioDe({ categoria: 'proyectos' })).toBe('taller')
    expect(edificioDe({ categoria: 'social' })).toBe('taberna')
    expect(edificioDe({ categoria: 'rubik' })).toBe('campamento')
    // los bloques de descanso van a la Taberna aunque sean de otra categoría
    expect(edificioDe({ categoria: 'familia', descanso: true })).toBe('taberna')
  })

  it('detecta inicio, botín y regreso con las manos vacías', () => {
    const a = b({ inicio: 600 })
    const c = b({ inicio: 700, categoria: 'clases' })
    const antes = instantanea([a, c])
    a.estado = 'completado'
    c.estado = 'activo'
    const ev = cambios(antes, [a, c])
    // primero vuelve con el botín, después sale otra vez
    expect(ev.map((e) => `${e.tipo}:${e.edificio}`)).toEqual(['completado:forja', 'inicio:torre'])

    const antes2 = instantanea([a, c])
    c.estado = 'fallido'
    expect(cambios(antes2, [a, c])).toEqual([{ tipo: 'fallido', id: c.id, edificio: 'torre', desdeActivo: true }])
  })

  it('una clase que vence sin check-in no anima nada (el guardián nunca salió)', () => {
    const c = b({ inicio: 480, tipo: 'clase', categoria: 'clases' })
    const antes = instantanea([c])
    c.estado = 'fallido'
    expect(cambios(antes, [c])).toEqual([])
  })

  it('borrar un bloque en curso hace volver al guardián', () => {
    const a = b({ inicio: 600, estado: 'activo' })
    expect(cambios(instantanea([a]), [])[0].tipo).toBe('cancelado')
  })

  it('el cielo pasa de día a noche', () => {
    expect(nocheDe(12 * 60)).toBe(0)
    expect(nocheDe(23 * 60)).toBe(1)
    expect(nocheDe(3 * 60)).toBe(1)
    expect(nocheDe(18 * 60 + 15)).toBeCloseTo(0.5)
  })

  it('la ficha del edificio cuenta lo de hoy y lo histórico', () => {
    const dias = {
      '2026-11-08': dia('2026-11-08', [b({ inicio: 600, estado: 'completado' })]),
      [LUNES]: dia(LUNES, [b({ inicio: 600, estado: 'completado', xp: 20, monedas: 4 }), b({ inicio: 700 }), b({ inicio: 800, categoria: 'clases' })]),
    }
    const e = estadistica('forja', dias, LUNES)
    expect([e.hechos, e.total, e.xp, e.monedas, e.historico]).toEqual([1, 2, 20, 4, 2])
  })
})

describe('Fase 2 · La Rana y los niveles', () => {
  it('los edificios suben de nivel con expediciones completadas', () => {
    expect(nivelEdificio(0)).toBe(1)
    expect(nivelEdificio(2)).toBe(1)
    expect(nivelEdificio(3)).toBe(2)
    expect(nivelEdificio(10)).toBe(3)
    expect(nivelEdificio(50)).toBe(5)
    expect(nivelEdificio(500)).toBe(5)
    expect(faltanParaNivel(4)).toBe(6)
    expect(faltanParaNivel(60)).toBeNull()
  })

  it('la vida de la Rana baja con el temporizador y llega a 0 al 80 %', () => {
    const inicio = Date.UTC(2026, 10, 9, 12)
    const r = { estado: 'activo' as const, iniciadoEn: inicio, duracion: 100 }
    expect(vidaRana({ ...r, estado: 'pendiente' }, inicio)).toBe(1)
    expect(vidaRana(r, inicio)).toBe(1)
    expect(vidaRana(r, inicio + 40 * 60000)).toBeCloseTo(0.5)
    expect(vidaRana(r, inicio + 80 * 60000)).toBe(0)
    expect(vidaRana({ ...r, estado: 'completado' }, inicio)).toBe(0)
  })
})

describe('Fase 3 · El Después', () => {
  it('avanza hasta cubrir los 12 terrenos y retrocede al cumplir', () => {
    const d = despuesInicial()
    for (let i = 0; i < 15; i++) avanzar(d)
    expect(d.sombra).toBe(TERRENOS)
    expect(d.avances).toBe(15)
    expect(retroceder(d)).toBe(true)
    expect(d.sombra).toBe(TERRENOS - 1)
    const limpio = despuesInicial()
    expect(retroceder(limpio)).toBe(false)
    expect(limpio.retrocesos).toBe(0)
  })

  it('el orden de los terrenos cubre toda la aldea sin repetir', () => {
    expect(new Set(ORDEN_TERRENOS).size).toBe(TERRENOS)
  })
})

describe('Fase 4 · resumen semanal y cosméticos', () => {
  it('el lunes de la semana', () => {
    expect(lunesDe('2026-11-09')).toBe(LUNES)
    expect(lunesDe('2026-11-15')).toBe(LUNES) // domingo
    expect(lunesDe('2026-11-12')).toBe(LUNES)
  })

  it('franjas horarias', () => {
    expect(franjaDe(6 * 60 + 45)).toBe('manana')
    expect(franjaDe(14 * 60)).toBe('tarde')
    expect(franjaDe(22 * 60)).toBe('noche')
  })

  it('% cumplido por categoría y franja', () => {
    const dias = {
      [LUNES]: dia(LUNES, [
        b({ inicio: 8 * 60, categoria: 'clases', estado: 'completado' }),
        b({ inicio: 10 * 60, estado: 'completado' }),
        b({ inicio: 15 * 60, estado: 'fallido', resultado: 'No pude.' }),
        b({ inicio: 21 * 60, categoria: 'lectura', estado: 'completado' }),
        b({ inicio: 21 * 60 + 30, tipo: 'hito', duracion: 0 }), // no cuenta
      ]),
      '2026-11-10': dia('2026-11-10', [b({ inicio: 9 * 60, estado: 'completado' })]),
      '2026-11-16': dia('2026-11-16', [b({ inicio: 9 * 60 })]), // otra semana
    }
    const r = resumenSemana(dias, LUNES, 0.75)
    expect(r.total).toEqual({ hechos: 4, total: 5 })
    expect(r.categorias.find((c) => c.categoria === 'empresa')).toMatchObject({ hechos: 2, total: 3 })
    expect(r.franjas.find((f) => f.franja === 'tarde')).toMatchObject({ hechos: 0, total: 1 })
    expect(r.diasCumplidos).toBe(2) // lunes justo en 75 %, martes 100 %
    expect(r.noPude).toBe(1)
    expect(r.diasRegistrados).toBe(2)
  })

  it('cada cosmético tiene un id único', () => {
    expect(new Set(COSMETICOS.map((c) => c.id)).size).toBe(COSMETICOS.length)
  })
})

// ---------- integración con el store ----------

describe('store: fases 2 a 4', () => {
  const s = () => useJuego.getState()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 9, 9, 0)) // lunes 9:00 hora local
    useJuego.setState({ ...datosIniciales(), avisos: [] })
  })
  afterEach(() => vi.useRealTimers())

  it('"No pude" oscurece un terreno y completar lo recupera', () => {
    const x = b({ inicio: 9 * 60 + 30 })
    const y = b({ inicio: 11 * 60 })
    useJuego.setState({ dias: { [LUNES]: dia(LUNES, [x, y]) } })
    s().noPude(LUNES, x.id)
    expect(s().despues.sombra).toBe(1)
    expect(s().avisos.some((a) => a.texto.includes('🌑'))).toBe(true)

    s().iniciar(LUNES, y.id)
    vi.setSystemTime(new Date(2026, 10, 9, 9, 50)) // 50 de 60 min (más del 80 %)
    s().completar(LUNES, y.id)
    expect(s().dias[LUNES].bloques.find((z) => z.id === y.id)?.estado).toBe('completado')
    expect(s().despues).toMatchObject({ sombra: 0, avances: 1, retrocesos: 1 })
  })

  it('vencer a la Rana da botín doble y anuncia la subida de nivel del edificio', () => {
    const hechas = [b({ inicio: 7 * 60, estado: 'completado' }), b({ inicio: 8 * 60, estado: 'completado' })]
    const rana = b({ inicio: 9 * 60, esRana: true, duracion: 60, estado: 'activo', iniciadoEn: new Date(2026, 10, 9, 8, 0).getTime() })
    useJuego.setState({ dias: { [LUNES]: dia(LUNES, [...hechas, rana]) } })
    s().completar(LUNES, rana.id)
    const final = s().dias[LUNES].bloques.find((z) => z.id === rana.id)!
    expect(final.xp).toBe(40) // 60 min → 20 XP, ×2
    const textos = s().avisos.map((a) => a.texto)
    expect(textos.some((t) => t.includes('Venciste a la Rana'))).toBe(true)
    expect(textos.some((t) => t.includes('La Forja sube a nivel 2'))).toBe(true)
  })

  it('salir antes de una clase también cuenta como rendirse', () => {
    const c = b({ inicio: 8 * 60, tipo: 'clase', categoria: 'clases', estado: 'activo', salidaSolicitada: new Date(2026, 10, 9, 8, 30).getTime() })
    useJuego.setState({ dias: { [LUNES]: dia(LUNES, [c]) } })
    s().confirmarSalida(LUNES, c.id)
    expect(s().despues.sombra).toBe(1)
  })

  it('aviso 5 min antes de un bloque, sin repetirse', () => {
    const x = b({ inicio: 9 * 60 + 4, titulo: 'Login del cliente' })
    useJuego.setState({ dias: { [LUNES]: dia(LUNES, [x]) } })
    const n = s().revisarAvisos()
    expect(n).toHaveLength(1)
    expect(n[0]).toMatchObject({ tipo: 'aviso', titulo: '⚔ Expedición en 5 min' })
    expect(n[0].cuerpo).toContain('Login del cliente')
    expect(s().revisarAvisos()).toHaveLength(0)
  })

  it('los avisos se pueden apagar', () => {
    const x = b({ inicio: 9 * 60 + 4 })
    useJuego.setState({ dias: { [LUNES]: dia(LUNES, [x]) } })
    s().editarAjustes({ sinAvisoBloques: true })
    expect(s().revisarAvisos()).toHaveLength(0)
  })

  it('recordatorio de la Rana a las 21:00 si mañana no tiene', () => {
    vi.setSystemTime(new Date(2026, 10, 9, 21, 5))
    useJuego.setState({ dias: { [LUNES]: dia(LUNES, []) } })
    expect(s().revisarAvisos().map((n) => n.id)).toEqual(['rana'])
    expect(s().revisarAvisos()).toHaveLength(0)
  })

  it('resumen semanal el domingo a las 15:00', () => {
    vi.setSystemTime(new Date(2026, 10, 15, 15, 1))
    useJuego.setState({ dias: { '2026-11-15': dia('2026-11-15', []) } })
    const n = s().revisarAvisos()
    expect(n.find((x) => x.id === 'resumen')?.pestana).toBe('progreso')
  })

  it('comprar y equipar cosméticos', () => {
    s().comprarCosmetico('capa-cielo')
    expect(s().cosmeticos.comprados).toEqual([]) // sin monedas
    useJuego.setState({ jugador: { ...s().jugador, monedas: 100 } })
    s().comprarCosmetico('capa-cielo')
    expect(s().jugador.monedas).toBe(60)
    expect(s().cosmeticos.equipados.capa).toBe('capa-cielo')
    s().comprarCosmetico('capa-cielo') // no se cobra dos veces
    expect(s().jugador.monedas).toBe(60)
    s().equipar('capa-cielo')
    expect(s().cosmeticos.equipados.capa).toBeUndefined()
    s().equipar('corona') // no comprada
    expect(s().cosmeticos.equipados.sombrero).toBeUndefined()
  })
})
