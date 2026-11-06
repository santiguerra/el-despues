import { describe, expect, it } from 'vitest'
import type { Bloque } from '../types'
import { choques, crearDia, organizar, type FuenteDia } from './generador'
import { ajustesIniciales, familiaInicial, plantillaInicial } from './plantillaInicial'
import { evaluar, nivelDeXp, xpBloque } from './reglas'
import { hhmmAMin, minAHhmm } from './tiempo'

const fuente = (extra: Partial<FuenteDia> = {}): FuenteDia => ({
  plantilla: plantillaInicial(),
  familia: familiaInicial(),
  ajustes: ajustesIniciales(),
  ranas: {},
  ...extra,
})

// 2026-11-09 es lunes; 2026-11-10 martes; 2026-11-13 viernes
const LUNES = '2026-11-09'
const MARTES = '2026-11-10'
const VIERNES = '2026-11-13'

const b = (p: Partial<Bloque> & { inicio: number }): Bloque => ({
  id: Math.random().toString(),
  titulo: 'x',
  duracion: 60,
  categoria: 'empresa',
  lugar: 'cuarto',
  fijo: false,
  tipo: 'normal',
  estado: 'pendiente',
  ...p,
})

describe('generar el día desde la plantilla', () => {
  it('el lunes trae las clases fijas y el día A con mi novia', () => {
    const dia = crearDia(LUNES, fuente())
    const titulos = dia.bloques.map((x) => `${minAHhmm(x.inicio)} ${x.titulo}`)
    expect(titulos).toContain('08:00 Cálculo Multivariado')
    expect(titulos).toContain('14:00 Física III')
    expect(titulos).toContain('15:30 Coworking: empresa o talleres U')
    expect(titulos).toContain('21:30 Cierre del día')
    expect(dia.bloques.every((x) => !x.sinEspacio)).toBe(true)
  })

  it('el viernes no tiene cierre ni rutina de noche', () => {
    const dia = crearDia(VIERNES, fuente())
    expect(dia.bloques.find((x) => x.vinculo === 'cierre')).toBeUndefined()
    expect(dia.bloques.find((x) => x.titulo === 'Magic')?.duracion).toBeNull()
  })

  it('La Rana cae en el primer bloque de trabajo flexible', () => {
    const dia = crearDia(MARTES, fuente({ ranas: { [MARTES]: { tarea: 'Login del cliente' } } }))
    const rana = dia.bloques.find((x) => x.esRana)!
    expect(rana.titulo).toBe('Login del cliente')
    expect(minAHhmm(rana.inicio)).toBe('07:05')
  })

  it('avisa si la tarea de familia choca con una clase', () => {
    const familia = familiaInicial()
    familia.hermano.dias[1] = true
    const dia = crearDia(LUNES, fuente({ familia }))
    const msgs = choques(dia.bloques)
    expect(msgs.some((m) => m.includes('Recoger a mi hermano') && m.includes('Física III'))).toBe(true)
  })

  it('al activar a mi hermana el martes, el bloque de empresa se corre', () => {
    const familia = familiaInicial()
    familia.hermana.dias[2] = true
    const dia = crearDia(MARTES, fuente({ familia }))
    const empresa = dia.bloques.find((x) => x.titulo === 'Empresa')!
    // 07:30–08:00 hermana + 10 de buffer; 90 min no caben antes de clase (9:00) → después
    expect(empresa.inicio).toBeGreaterThanOrEqual(hhmmAMin('11:10'))
  })
})

describe('organizar con buffers', () => {
  it('deja 10 minutos entre bloques y respeta los fijos', () => {
    const r = organizar(
      [b({ inicio: 600, fijo: true, duracion: 60 }), b({ inicio: 600, duracion: 30 }), b({ inicio: 600, duracion: 30 })],
      { buffer: 10, limite: 24 * 60, desde: 0 },
    )
    expect(r.map((x) => x.inicio)).toEqual([600, 670, 710])
  })

  it('"No pude" replanifica desde ahora y no invade el cierre', () => {
    const cierre = b({ inicio: hhmmAMin('21:30'), duracion: 0, tipo: 'hito', fijo: true, vinculo: 'cierre' })
    const r = organizar([b({ inicio: 900, duracion: 120 }), b({ inicio: 1100, duracion: 120 }), cierre], {
      buffer: 10,
      limite: hhmmAMin('21:30'),
      desde: hhmmAMin('18:00'),
    })
    const [a, z] = r.filter((x) => x.tipo === 'normal')
    expect(minAHhmm(a.inicio)).toBe('18:00')
    expect(z.sinEspacio).toBe(true)
  })
})

describe('XP', () => {
  it('La Rana da XP doble y el trabajo después del cierre no da XP', () => {
    const normal = xpBloque(b({ inicio: 0, duracion: 90 }), false).xp
    expect(xpBloque(b({ inicio: 0, duracion: 90, esRana: true }), false).xp).toBe(normal * 2)
    expect(xpBloque(b({ inicio: 0, duracion: 90 }), true).xp).toBe(0)
    expect(xpBloque(b({ inicio: 0, duracion: 20, categoria: 'lectura' }), true).xp).toBeGreaterThan(0)
  })

  it('sube de nivel con la XP acumulada', () => {
    expect(nivelDeXp(0)).toBe(1)
    expect(nivelDeXp(100)).toBe(2)
    expect(nivelDeXp(299)).toBe(2)
    expect(nivelDeXp(300)).toBe(3)
  })

  it('los opcionales sin decidir no cuentan para el día', () => {
    const dia = crearDia('2026-11-11', fuente())
    const r = evaluar(dia, 0.75)
    expect(dia.bloques.some((x) => x.titulo === 'Topdeck')).toBe(true)
    expect(r.total).toBe(dia.bloques.filter((x) => x.tipo !== 'hito' && x.titulo !== 'Topdeck').length)
  })
})
