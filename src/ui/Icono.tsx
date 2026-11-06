// Íconos de la app: Phosphor (rellenos) para la interfaz y sprites de pixel art
// para los personajes del juego. Reemplazan a todos los emojis.
import type { CSSProperties } from 'react'
import {
  ArrowFatUp,
  ArrowsClockwise,
  Bank,
  BeerStein,
  Bed,
  Bell,
  Cards,
  Check,
  BookOpen,
  CalendarBlank,
  CaretLeft,
  CaretRight,
  ChartBar,
  CheckCircle,
  Clock,
  Coffee,
  Coins,
  Compass,
  Confetti,
  Crown,
  Cube,
  Eye,
  Fire,
  FlagCheckered,
  Flask,
  FloppyDisk,
  GearSix,
  Gift,
  GraduationCap,
  HandFist,
  Hammer,
  Heart,
  Lightning,
  Lock,
  MapTrifold,
  Minus,
  Moon,
  MoonStars,
  PencilSimple,
  Play,
  Plus,
  ShieldCheck,
  Sparkle,
  SpeakerHigh,
  Star,
  Storefront,
  Sun,
  Sword,
  Tent,
  Timer,
  TrendUp,
  Trophy,
  UsersThree,
  Warning,
  X,
  XCircle,
  type Icon,
  type IconWeight,
} from '@phosphor-icons/react'
import * as arte from '../aldea/arte'

export const ICONOS = {
  hoy: Sword,
  semana: CalendarBlank,
  progreso: ChartBar,
  tienda: Storefront,
  ajustes: GearSix,
  moneda: Coins,
  racha: Fire,
  xp: Lightning,
  ok: CheckCircle,
  check: Check,
  cartas: Cards,
  mal: XCircle,
  cerrar: X,
  alerta: Warning,
  sol: Sun,
  luna: Moon,
  noche: MoonStars,
  clase: GraduationCap,
  ojo: Eye,
  escudo: ShieldCheck,
  play: Play,
  prueba: Flask,
  mapa: MapTrifold,
  cronica: BookOpen,
  familia: UsersThree,
  cubo: Cube,
  editar: PencilSimple,
  meta: FlagCheckered,
  nivel: ArrowFatUp,
  sube: TrendUp,
  edificio: Bank,
  timer: Timer,
  fuerza: HandFist,
  regalo: Gift,
  brillo: Sparkle,
  candado: Lock,
  cama: Bed,
  corazon: Heart,
  brujula: Compass,
  recargar: ArrowsClockwise,
  campana: Bell,
  sonido: SpeakerHigh,
  guardar: FloppyDisk,
  izq: CaretLeft,
  der: CaretRight,
  trofeo: Trophy,
  corona: Crown,
  estrella: Star,
  mas: Plus,
  menos: Minus,
  reloj: Clock,
  cafe: Coffee,
  martillo: Hammer,
  carpa: Tent,
  taberna: BeerStein,
  fiesta: Confetti,
} satisfies Record<string, Icon>

export type NombreIcono = keyof typeof ICONOS

interface Props {
  n: NombreIcono
  size?: number
  weight?: IconWeight
  className?: string
  color?: string
  style?: CSSProperties
}

export function Icono({ n, size = 20, weight = 'fill', className, color, style }: Props) {
  const C = ICONOS[n]
  return <C size={size} weight={weight} className={`icono-ui ${className ?? ''}`} color={color} style={style} aria-hidden />
}

// ---------- sprites de pixel art como íconos ----------

const FABRICAS = {
  rana: arte.rana,
  despues: arte.despues,
  guardian: () => arte.guardian().quieto,
  saco: arte.saco,
}
export type NombreSprite = keyof typeof FABRICAS

const cache = new Map<string, string>()
export function urlSprite(n: NombreSprite): string {
  let url = cache.get(n)
  if (!url) {
    url = FABRICAS[n]().toDataURL()
    cache.set(n, url)
  }
  return url
}

export function Sprite({ n, size = 24, className, style }: { n: NombreSprite; size?: number; className?: string; style?: CSSProperties }) {
  return <img src={urlSprite(n)} alt="" width={size} height={size} className={`sprite ${className ?? ''}`} style={style} draggable={false} />
}

/** Ícono de un aviso: puede ser de la interfaz o un personaje en pixel art. */
export type Simbolo = NombreIcono | NombreSprite
const esSprite = (s: Simbolo): s is NombreSprite => s in FABRICAS

export function SimboloIcono({ s, size = 20, className }: { s: Simbolo; size?: number; className?: string }) {
  return esSprite(s) ? <Sprite n={s} size={size + 4} className={className} /> : <Icono n={s} size={size} className={className} />
}
