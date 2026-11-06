export type Categoria =
  | 'clases'
  | 'empresa'
  | 'talleres'
  | 'estudio'
  | 'proyectos'
  | 'lectura'
  | 'rubik'
  | 'social'
  | 'hobbies'
  | 'higiene'
  | 'familia'

export type Lugar = 'cuarto' | 'novia' | 'calle'

/** normal: temporizador · clase: check-in/out · reunion: trabajo presencial · evento: "Asistí" · hito: marca en la línea de tiempo */
export type TipoBloque = 'normal' | 'clase' | 'reunion' | 'evento' | 'hito'

/** Conecta un bloque con un hábito o una regla del día. */
export type Vinculo = 'rubik' | 'lectura' | 'estudio' | 'higiene-noche' | 'cierre' | 'luces' | 'dormido'

export type EstadoBloque = 'pendiente' | 'activo' | 'completado' | 'fallido' | 'saltado'
export type ClaveFamilia = 'hermana' | 'hermano'
export type ClaveHabito = 'lectura' | 'rubik' | 'estudio'

export interface DatosBloque {
  titulo: string
  /** minutos; null = sin hora de fin (ej. Magic) */
  duracion: number | null
  categoria: Categoria
  lugar: Lugar
  fijo: boolean
  tipo: TipoBloque
  opcional?: boolean
  /** cuenta como descanso (ej. cocinar y comer con mi novia) */
  descanso?: boolean
  vinculo?: Vinculo
  nota?: string
}

export interface BloquePlantilla extends DatosBloque {
  id: string
  /** 0 = domingo … 6 = sábado */
  dia: number
  /** "HH:MM" */
  inicio: string
}

export interface Bloque extends DatosBloque {
  id: string
  plantillaId?: string
  familia?: ClaveFamilia
  /** minutos desde la medianoche */
  inicio: number
  estado: EstadoBloque
  esRana?: boolean
  tituloOriginal?: string
  /** no cupo antes del cierre al replanificar */
  sinEspacio?: boolean
  /** para bloques opcionales: decidí ir */
  aceptado?: boolean
  /** meta concreta (Rubik) */
  meta?: string
  iniciadoEn?: number
  terminadoEn?: number
  checkIn?: number
  sigueAhi?: number
  avisoSigueAhi?: boolean
  checkOut?: number
  salidaSolicitada?: number
  xp?: number
  monedas?: number
  resultado?: string
  /** ya se avisó que empieza en 5 min */
  avisoInicio?: boolean
}

export interface TareaFamilia {
  titulo: string
  inicio: string
  duracion: number
  lugar: Lugar
  /** índice 0 = domingo */
  dias: boolean[]
}

export interface Higiene {
  manana: boolean
  comidas: number
  noche: boolean
  escudo: boolean
}

export interface Dia {
  fecha: string
  bloques: Bloque[]
  higiene: Higiene
  familia: Record<ClaveFamilia, boolean>
  levante?: 'a-tiempo' | 'tarde'
  acoste?: 'a-tiempo' | 'tarde'
  xp: number
  monedas: number
  evaluado: boolean
  cumplido?: boolean
  porcentaje?: number
  avisoRana?: boolean
  avisoResumen?: boolean
}

export interface Ajustes {
  despertarSemana: string
  despertarFinde: string
  horaLuces: string
  buffer: number
  umbralCumplido: number
  comidasMeta: number
  estudioMin: number
  rubikMetas: string[]
  /** reloj simulado para probar (minutos) */
  desfaseMin: number
  /** apaga los sonidos de la aldea */
  silencio?: boolean
  /** apagar avisos (por defecto están encendidos) */
  sinAvisoBloques?: boolean
  sinAvisoRana?: boolean
  sinAvisoResumen?: boolean
}

export interface Habito {
  racha: number
  mejor: number
  ultima?: string
  total: number
}

export interface Recompensa {
  id: string
  nombre: string
  costo: number
}

export interface Canje {
  id: string
  nombre: string
  costo: number
  fecha: number
}

export interface Jugador {
  xp: number
  monedas: number
  racha: number
  mejorRacha: number
  ultimaCumplida?: string
}

export interface Rana {
  tarea: string
  categoria?: Categoria
}

/** El villano: cuántos terrenos de la aldea tiene oscurecidos. */
export interface ElDespues {
  sombra: number
  avances: number
  retrocesos: number
}

export type Ranura = 'capa' | 'sombrero' | 'mascota' | 'fogata' | 'estandarte'

export interface Cosmeticos {
  comprados: string[]
  equipados: Partial<Record<Ranura, string>>
}
