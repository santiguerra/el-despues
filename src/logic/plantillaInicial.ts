import type { Ajustes, BloquePlantilla, Categoria, ClaveFamilia, Lugar, Recompensa, TareaFamilia, TipoBloque, Vinculo } from '../types'
import { hhmmAMin } from './tiempo'

interface Opc {
  lugar?: Lugar
  tipo?: TipoBloque
  opcional?: boolean
  descanso?: boolean
  vinculo?: Vinculo
  nota?: string
}

let n = 0
const id = () => `p${++n}`
const entre = (a: string, z: string) => hhmmAMin(z) - hhmmAMin(a)

function fijo(dia: number, inicio: string, duracion: number | null, titulo: string, categoria: Categoria, o: Opc = {}): BloquePlantilla {
  return {
    id: id(),
    dia,
    inicio,
    duracion,
    titulo,
    categoria,
    lugar: o.lugar ?? 'cuarto',
    fijo: true,
    tipo: o.tipo ?? 'normal',
    ...(o.opcional && { opcional: true }),
    ...(o.descanso && { descanso: true }),
    ...(o.vinculo && { vinculo: o.vinculo }),
    ...(o.nota && { nota: o.nota }),
  }
}

const flex = (dia: number, inicio: string, duracion: number, titulo: string, categoria: Categoria, o: Opc = {}) => ({
  ...fijo(dia, inicio, duracion, titulo, categoria, o),
  fijo: false,
})

const clase = (dia: number, a: string, z: string, titulo: string) =>
  fijo(dia, a, entre(a, z), titulo, 'clases', { tipo: 'clase', nota: 'Virtual. Check-in solo en los primeros 5 minutos.' })

const evento = (dia: number, a: string, z: string | null, titulo: string, categoria: Categoria, lugar: Lugar, o: Opc = {}) =>
  fijo(dia, a, z ? entre(a, z) : null, titulo, categoria, { ...o, lugar, tipo: 'evento' })

const hito = (dia: number, hora: string, titulo: string, vinculo?: Vinculo) =>
  fijo(dia, hora, 0, titulo, 'higiene', { tipo: 'hito', vinculo })

const campamento = (dia: number, hora: string) =>
  fijo(dia, hora, 10, 'Preparar campamento: café + Rubik', 'rubik', {
    vinculo: 'rubik',
    nota: 'Hábito anclado al café. Cumple la meta concreta del día, no solo tocarlo.',
  })

const almuerzo = (dia: number, hora: string, dur = 40) =>
  flex(dia, hora, dur, 'Almuerzo', 'familia', { descanso: true })

const estudio = (dia: number, hora: string) =>
  flex(dia, hora, 30, 'Estudio propio', 'estudio', { vinculo: 'estudio', nota: 'La duración crece sola con tu racha.' })

function noche(dia: number, cierre = 'Cierre del día'): BloquePlantilla[] {
  return [
    hito(dia, '21:30', cierre, 'cierre'),
    fijo(dia, '22:00', 15, 'Cara + dientes + seda', 'higiene', { vinculo: 'higiene-noche' }),
    fijo(dia, '22:15', 20, 'Lectura 20 min (en papel)', 'lectura', { vinculo: 'lectura' }),
    hito(dia, '22:45', 'Luces apagadas · celular fuera de la cama', 'luces'),
    hito(dia, '23:00', 'Dormido', 'dormido'),
  ]
}

export function plantillaInicial(): BloquePlantilla[] {
  n = 0
  return [
    // LUNES — Día A con mi novia
    campamento(1, '06:45'),
    clase(1, '08:00', '11:00', 'Cálculo Multivariado'),
    flex(1, '11:10', 90, 'Empresa', 'empresa'),
    almuerzo(1, '12:50'),
    clase(1, '14:00', '15:00', 'Física III'),
    fijo(1, '15:30', 180, 'Coworking: empresa o talleres U', 'empresa', {
      lugar: 'novia',
      nota: 'Mismo rigor que en mi cuarto.',
    }),
    evento(1, '18:30', '20:45', 'Cocinar y comer con mi novia', 'social', 'novia', { descanso: true }),
    evento(1, '20:45', '21:15', 'Salida fija · regreso a casa', 'social', 'calle'),
    ...noche(1),

    // MARTES — libre para empresa y proyectos
    campamento(2, '06:45'),
    flex(2, '07:05', 90, 'Empresa', 'empresa'),
    clase(2, '09:00', '11:00', 'Programación III'),
    flex(2, '11:10', 90, 'Proyectos', 'proyectos'),
    almuerzo(2, '12:50'),
    clase(2, '14:00', '16:00', 'Fundamentos de Electrónica'),
    flex(2, '16:10', 120, 'Empresa', 'empresa'),
    flex(2, '18:20', 60, 'Proyectos', 'proyectos'),
    estudio(2, '19:30'),
    ...noche(2),

    // MIÉRCOLES — Día B para ella
    campamento(3, '06:45'),
    flex(3, '07:05', 45, 'Empresa', 'empresa'),
    clase(3, '08:00', '10:00', 'Cálculo Multivariado'),
    estudio(3, '10:10'),
    clase(3, '11:00', '13:00', 'Lab. de Electrónica'),
    clase(3, '13:00', '15:00', 'Física III'),
    evento(3, '15:15', '21:30', 'Día de mi novia (cita)', 'social', 'novia', {
      descanso: true,
      nota: 'Sin trabajo desde las 15:15. Planea la cita aquí. Regreso a casa a más tardar 21:30.',
    }),
    evento(3, '18:00', '21:00', 'Topdeck', 'social', 'calle', {
      opcional: true,
      nota: 'Opcional: compite con el día de tu novia.',
    }),
    ...noche(3, 'Regreso a casa (a más tardar) · Cierre del día'),

    // JUEVES
    campamento(4, '06:45'),
    flex(4, '07:05', 90, 'Empresa', 'empresa'),
    clase(4, '09:00', '11:00', 'Programación III'),
    flex(4, '11:10', 90, 'Proyectos', 'proyectos'),
    almuerzo(4, '12:50'),
    clase(4, '14:00', '16:00', 'Fundamentos de Electrónica'),
    clase(4, '16:00', '18:00', 'Lab. de Física III'),
    fijo(4, '18:30', 45, 'Arreglarme y desplazarme', 'higiene', { nota: 'Ajustable.' }),
    evento(4, '19:15', '20:30', 'Iglesia', 'familia', 'calle'),
    estudio(4, '20:40'),
    ...noche(4),

    // VIERNES — Magic, cierre y cama flexibles
    campamento(5, '06:45'),
    flex(5, '07:05', 90, 'Empresa', 'empresa'),
    clase(5, '09:00', '12:00', 'Humanismo (Arte, Cuerpo y Poshumanismo)'),
    almuerzo(5, '12:10'),
    clase(5, '13:00', '15:00', 'Física III'),
    flex(5, '15:10', 120, 'Empresa', 'empresa'),
    estudio(5, '17:20'),
    evento(5, '18:00', null, 'Magic', 'social', 'calle', {
      nota: 'Sin hora de fin. Hoy el cierre del día y la hora de cama son flexibles: no cuentan como fallo.',
    }),

    // SÁBADO
    campamento(6, '07:45'),
    flex(6, '08:05', 90, 'Proyectos', 'proyectos'),
    estudio(6, '09:45'),
    flex(6, '10:40', 60, 'Hobbies', 'hobbies'),
    evento(6, '12:00', '14:00', 'Almuerzo con mi abuelo', 'familia', 'calle'),
    flex(6, '14:10', 90, 'Proyectos', 'proyectos'),
    ...noche(6),

    // DOMINGO
    campamento(0, '07:35'),
    evento(0, '08:15', '09:30', 'Iglesia', 'familia', 'calle'),
    evento(0, '09:30', '11:00', 'Mercado', 'familia', 'calle'),
    evento(0, '12:00', '14:00', 'Almuerzo con mi abuelo', 'familia', 'calle'),
    fijo(0, '15:00', 15, 'Planear la semana', 'proyectos', { nota: 'Revisa la plantilla y la familia de la semana.' }),
    flex(0, '15:30', 60, 'Hobbies', 'hobbies'),
    ...noche(0),
  ]
}

export function familiaInicial(): Record<ClaveFamilia, TareaFamilia> {
  return {
    hermana: { titulo: 'Llevar a mi hermana a estudiar', inicio: '07:30', duracion: 30, lugar: 'calle', dias: Array(7).fill(false) },
    hermano: { titulo: 'Recoger a mi hermano del colegio', inicio: '14:40', duracion: 40, lugar: 'calle', dias: Array(7).fill(false) },
  }
}

export function ajustesIniciales(): Ajustes {
  return {
    despertarSemana: '06:30',
    despertarFinde: '07:30',
    horaLuces: '22:45',
    buffer: 10,
    umbralCumplido: 0.75,
    comidasMeta: 2,
    estudioMin: 30,
    rubikMetas: ['Practicar la cruz', '3 solves cronometrados', 'F2L: 5 casos', 'OLL de 2 looks', 'PLL de 2 looks', 'Cruz en menos de 15 s'],
    desfaseMin: 0,
  }
}

export function tiendaInicial(): Recompensa[] {
  return [
    { id: 'r1', nombre: '1 hora de videojuegos sin culpa', costo: 40 },
    { id: 'r2', nombre: 'Café especial', costo: 25 },
    { id: 'r3', nombre: 'Un episodio de serie', costo: 20 },
    { id: 'r4', nombre: 'Postre', costo: 15 },
  ]
}
