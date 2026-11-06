// Fase 3: El Después, el villano que se alimenta del "luego lo hago".
import type { ElDespues } from '../types'

/** La aldea se divide en 12 terrenos. */
export const TERRENOS = 12

/** El Después entra por los bordes y avanza hacia la plaza. */
export const ORDEN_TERRENOS = [11, 0, 10, 1, 9, 2, 8, 3, 7, 4, 6, 5]

export const despuesInicial = (): ElDespues => ({ sombra: 0, avances: 0, retrocesos: 0 })

export function avanzar(d: ElDespues): boolean {
  d.avances++
  if (d.sombra >= TERRENOS) return false
  d.sombra++
  return true
}

export function retroceder(d: ElDespues): boolean {
  if (d.sombra <= 0) return false
  d.sombra--
  d.retrocesos++
  return true
}

const FRASES_AVANCE = [
  'El Después susurra: «mañana también sirve». Un terreno se oscurece.',
  'La sombra se estira sobre la aldea. Avanza un terreno.',
  'El Después se alimenta de tu «luego». Ya cubre otro terreno.',
  'Una niebla fría entra por el camino. El Después gana terreno.',
]
const FRASES_RETROCESO = [
  'Cumpliste: El Después retrocede y recuperas un terreno.',
  'La luz vuelve a un terreno. El Después da un paso atrás.',
  'El Ahora resiste: un terreno queda libre de sombra.',
]

export const fraseAvance = (n: number) => FRASES_AVANCE[n % FRASES_AVANCE.length]
export const fraseRetroceso = (n: number) => FRASES_RETROCESO[n % FRASES_RETROCESO.length]

export type IdEscena = 'reino' | 'guardian' | 'despues' | 'rana' | 'teme' | 'completo'

export interface Capitulo {
  escena: IdEscena
  titulo: string
  /** una sola línea: la escena cuenta el resto */
  texto: string
  /** nivel de jugador necesario para verlo */
  nivel: number
}

/** La historia, contada con escenas animadas (ver aldea/Libro.tsx). */
export const CRONICA: Capitulo[] = [
  { escena: 'reino', titulo: 'El Reino del Ahora', nivel: 1, texto: 'Cada bloque cumplido levanta una piedra.' },
  { escena: 'guardian', titulo: 'El Guardián', nivel: 1, texto: 'Tú cuidas el reino. Siempre vuelves a la plaza.' },
  { escena: 'despues', titulo: 'El Después', nivel: 2, texto: 'Vive en tu «luego». Cada «No pude» le abre una puerta.' },
  { escena: 'rana', titulo: 'La Rana', nivel: 3, texto: 'Véncela primero y el día va cuesta abajo.' },
  { escena: 'teme', titulo: 'Lo que el Después teme', nivel: 5, texto: 'Huye del temporizador en marcha.' },
  { escena: 'completo', titulo: 'El reino completo', nivel: 8, texto: 'Cinco edificios al máximo: la aldea será ciudad.' },
]
