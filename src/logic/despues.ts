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
  '☀ Cumpliste: El Después retrocede y recuperas un terreno.',
  '☀ La luz vuelve a un terreno. El Después da un paso atrás.',
  '☀ El Ahora resiste: un terreno queda libre de sombra.',
]

export const fraseAvance = (n: number) => `🌑 ${FRASES_AVANCE[n % FRASES_AVANCE.length]}`
export const fraseRetroceso = (n: number) => FRASES_RETROCESO[n % FRASES_RETROCESO.length]

export interface Capitulo {
  titulo: string
  texto: string
  /** nivel de jugador necesario para leerlo */
  nivel: number
}

/** Lore breve: se revela al subir de nivel. */
export const CRONICA: Capitulo[] = [
  {
    titulo: 'El Reino del Ahora',
    nivel: 1,
    texto:
      'Al principio solo había un claro en el bosque y una fogata. Cada bloque que cumples pone una piedra más: así nacieron la Forja, la Torre del Saber, el Taller y la Taberna.',
  },
  {
    titulo: 'El Guardián',
    nivel: 1,
    texto:
      'Tú cuidas el reino. No necesitas ganar todos los días: necesitas volver a la plaza, descansar junto al fuego y salir otra vez de expedición.',
  },
  {
    titulo: 'El Después',
    nivel: 2,
    texto:
      'Una sombra sin forma que vive en el «luego lo hago». No ataca: espera. Cada «No pude» le abre la puerta a un terreno, y cada bloque cumplido la empuja de vuelta al bosque.',
  },
  {
    titulo: 'La Rana',
    nivel: 3,
    texto:
      'Cada noche eliges la tarea más difícil. Al amanecer, la Rana te espera en el camino. Si la vences primero, el resto del día va cuesta abajo y el botín es doble.',
  },
  {
    titulo: 'Lo que el Después teme',
    nivel: 5,
    texto:
      'No teme a los héroes que lo hacen todo, sino a los que empiezan. Por eso huye del temporizador en marcha: cada minuto en curso es un minuto que ya no es suyo.',
  },
  {
    titulo: 'El reino completo',
    nivel: 8,
    texto:
      'Cuando los cinco edificios lleguen a su nivel más alto, la aldea será ciudad. El Después seguirá en el bosque, pero ya no encontrará puertas abiertas.',
  },
]
