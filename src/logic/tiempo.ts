const pad = (n: number) => String(n).padStart(2, '0')

export const DIA_MIN = 24 * 60

export const NOMBRES_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
export const NOMBRES_CORTOS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
/** Lunes primero */
export const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0]
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function hhmmAMin(s: string): number {
  const [h, m] = s.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function minAHhmm(n: number): string {
  const m = Math.floor(n)
  return `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`
}

export function fechaLocal(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Minutos (con fracción) desde la medianoche local. */
export function minutosDelDia(ms: number): number {
  const d = new Date(ms)
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60
}

export function diaSemana(fecha: string): number {
  return new Date(`${fecha}T12:00:00`).getDay()
}

export function sumarDias(fecha: string, n: number): string {
  const d = new Date(`${fecha}T12:00:00`)
  d.setDate(d.getDate() + n)
  return fechaLocal(d.getTime())
}

export function msDe(fecha: string, minutos: number): number {
  return new Date(`${fecha}T00:00:00`).getTime() + minutos * 60000
}

export function fechaCorta(fecha: string): string {
  const [, m, d] = fecha.split('-').map(Number)
  return `${d} ${MESES[m - 1]}`
}

export function esFinde(fecha: string): boolean {
  const d = diaSemana(fecha)
  return d === 0 || d === 6
}

/** "1 h 30 min" */
export function fmtDur(min: number | null): string {
  if (min === null) return 'sin fin'
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (!h) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}

/** "mm:ss" o "h:mm:ss" */
export function fmtReloj(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3)
