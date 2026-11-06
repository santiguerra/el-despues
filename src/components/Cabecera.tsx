import { useLayoutEffect, useRef } from 'react'
import { rachaVisible, useJuego } from '../store'
import { nivelDeXp, umbralNivel } from '../logic/reglas'
import { fechaLocal } from '../logic/tiempo'
import { Icono } from '../ui/Icono'
import { contar, gsap, saltar, useGSAP } from '../ui/animar'

/** Número que sube contando cuando llega botín (espera a que las fichas aterricen). */
function Contador({ valor, retraso = 0.85 }: { valor: number; retraso?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const previo = useRef(valor)
  useLayoutEffect(() => {
    if (valor !== previo.current) contar(ref.current, previo.current, valor, 0.6, valor > previo.current ? retraso : 0)
    previo.current = valor
  }, [valor, retraso])
  return <span ref={ref}>{valor}</span>
}

export function Cabecera({ ahora }: { ahora: number }) {
  const jugador = useJuego((s) => s.jugador)
  const nivel = nivelDeXp(jugador.xp)
  const base = umbralNivel(nivel)
  const siguiente = umbralNivel(nivel + 1)
  const pct = ((jugador.xp - base) / (siguiente - base)) * 100
  const racha = rachaVisible(jugador, fechaLocal(ahora))
  const ref = useRef<HTMLElement>(null)
  const nivelPrevio = useRef(nivel)

  useGSAP(
    () => {
      if (!racha) return
      gsap.to('.fuego .icono-ui', { rotation: 14, duration: 1.2, ease: 'sacudir', repeat: -1, repeatDelay: 2.6, transformOrigin: '50% 90%' })
    },
    { scope: ref, dependencies: [racha > 0] },
  )

  useLayoutEffect(() => {
    if (nivel > nivelPrevio.current) saltar(ref.current?.querySelector('.cuadro-nivel') ?? null, 1.6)
    nivelPrevio.current = nivel
  }, [nivel])

  return (
    <header ref={ref} className="cabecera">
      <div className="nivel">
        <span className="cuadro-nivel">N{nivel}</span>
        <div className="xp">
          <div className="barra">
            <div className="relleno" style={{ width: `${pct}%` }} />
          </div>
          <small>
            <Contador valor={jugador.xp - base} />/{siguiente - base} XP
          </small>
        </div>
      </div>
      <div className="stats">
        <span className="monedas" title="Monedas">
          <Icono n="moneda" size={20} />
          <Contador valor={jugador.monedas} />
        </span>
        <span className={racha ? 'fuego' : 'apagado'} title="Racha de días cumplidos">
          <Icono n="racha" size={20} />
          {racha}
        </span>
      </div>
    </header>
  )
}
