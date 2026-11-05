import { rachaVisible, useJuego } from '../store'
import { nivelDeXp, umbralNivel } from '../logic/reglas'
import { fechaLocal } from '../logic/tiempo'

export function Cabecera({ ahora }: { ahora: number }) {
  const jugador = useJuego((s) => s.jugador)
  const nivel = nivelDeXp(jugador.xp)
  const base = umbralNivel(nivel)
  const siguiente = umbralNivel(nivel + 1)
  const pct = ((jugador.xp - base) / (siguiente - base)) * 100
  const racha = rachaVisible(jugador, fechaLocal(ahora))

  return (
    <header className="cabecera">
      <div className="nivel">
        <span className="cuadro-nivel">N{nivel}</span>
        <div className="xp">
          <div className="barra">
            <div className="relleno" style={{ width: `${pct}%` }} />
          </div>
          <small>
            {jugador.xp - base}/{siguiente - base} XP
          </small>
        </div>
      </div>
      <div className="stats">
        <span title="Monedas">🪙 {jugador.monedas}</span>
        <span title="Racha de días cumplidos">🔥 {racha}</span>
      </div>
    </header>
  )
}
