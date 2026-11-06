import type { Categoria, ClaveHabito, Lugar, TipoBloque } from '../types'
import type { NombreIcono } from '../ui/Icono'

export const CATEGORIAS: Record<Categoria, { nombre: string; color: string }> = {
  clases: { nombre: 'Clases', color: '#4a90e2' },
  empresa: { nombre: 'Empresa', color: '#e8743b' },
  talleres: { nombre: 'Talleres U', color: '#f2c14e' },
  estudio: { nombre: 'Estudio propio', color: '#7bc96f' },
  proyectos: { nombre: 'Proyectos', color: '#b07cc6' },
  lectura: { nombre: 'Lectura', color: '#c9a26b' },
  rubik: { nombre: 'Rubik', color: '#e84a5f' },
  social: { nombre: 'Social', color: '#ff8fab' },
  hobbies: { nombre: 'Hobbies', color: '#5ad1c8' },
  higiene: { nombre: 'Higiene', color: '#9ad0f5' },
  familia: { nombre: 'Familia', color: '#d4a373' },
}

export const LISTA_CATEGORIAS = Object.keys(CATEGORIAS) as Categoria[]

export const LUGARES: Record<Lugar, { nombre: string; icono: NombreIcono }> = {
  cuarto: { nombre: 'Mi cuarto', icono: 'cama' },
  novia: { nombre: 'Casa de mi novia', icono: 'corazon' },
  calle: { nombre: 'Calle', icono: 'brujula' },
}

export const TIPOS: Record<TipoBloque, string> = {
  normal: 'Normal (temporizador)',
  clase: 'Clase (check-in/out)',
  reunion: 'Reunión (presencial)',
  evento: 'Evento (marcar asistencia)',
  hito: 'Hito (marca de hora)',
}

/** Categorías que cuentan como "trabajo": sin XP después del cierre. */
export const TRABAJO: Categoria[] = ['clases', 'empresa', 'talleres', 'estudio', 'proyectos']

/** Categorías donde puede vivir La Rana. */
export const CATEGORIAS_RANA: Categoria[] = ['empresa', 'talleres', 'estudio', 'proyectos']

export const HABITOS: Record<ClaveHabito, string> = {
  lectura: 'Lectura en papel',
  rubik: 'Rubik con café',
  estudio: 'Estudio propio',
}
