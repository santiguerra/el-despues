import { useState } from 'react'
import type { ClaveHabito } from '../types'
import { useJuego } from '../store'
import { HABITOS } from '../logic/catalogo'
import { fechaLocal, sumarDias } from '../logic/tiempo'
import { Icono } from '../ui/Icono'

const DESCRIPCION: Record<ClaveHabito, string> = {
  lectura: '20 minutos en papel, todas las noches a las 22:15.',
  rubik: '10 minutos con el café de las 6:45, siempre con una meta concreta.',
  estudio: 'Arranca en 30 min y sube 5 min cada 5 sesiones (máx. 120).',
}

export function Habitos({ ahora }: { ahora: number }) {
  const s = useJuego()
  const hoy = fechaLocal(ahora)
  const [nueva, setNueva] = useState('')

  return (
    <>
      <h2>Hábitos</h2>
      {(Object.keys(HABITOS) as ClaveHabito[]).map((k) => {
        const h = s.habitos[k]
        const viva = h.ultima === hoy || h.ultima === sumarDias(hoy, -1)
        return (
          <div key={k} className="tarjeta habito">
            <div className="cabeza-habito">
              <h3>{HABITOS[k]}</h3>
              <span className={`racha ${viva && h.racha ? '' : 'apagada'}`}>
                <Icono n="racha" size={18} /> {viva ? h.racha : 0}
              </span>
            </div>
            <p className="nota">{DESCRIPCION[k]}</p>
            <small>
              Mejor racha: {h.mejor} · Sesiones: {h.total} {h.ultima === hoy && '· hecho hoy'}
            </small>
            {k === 'estudio' && (
              <div className="contador">
                <span>Duración actual: {s.ajustes.estudioMin} min</span>
                <button className="btn btn-mini" onClick={() => s.editarAjustes({ estudioMin: Math.max(15, s.ajustes.estudioMin - 5) })}>
                  −
                </button>
                <button className="btn btn-mini" onClick={() => s.editarAjustes({ estudioMin: Math.min(120, s.ajustes.estudioMin + 5) })}>
                  +
                </button>
              </div>
            )}
          </div>
        )
      })}

      <section className="tarjeta">
        <h3>
          <Icono n="cubo" color="var(--rojo)" /> Metas de Rubik
        </h3>
        <p className="nota">Cada día se asigna una meta en rotación. La puedes cambiar dentro del bloque.</p>
        {s.ajustes.rubikMetas.map((m, i) => (
          <div key={m + i} className="fila-simple">
            <span>{m}</span>
            <button
              className="btn btn-mini"
              onClick={() => s.editarAjustes({ rubikMetas: s.ajustes.rubikMetas.filter((_, j) => j !== i) })}
            >
              Quitar
            </button>
          </div>
        ))}
        <div className="fila-campos">
          <input value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Ej. 5 solves con promedio" />
          <button
            className="btn btn-oro"
            disabled={!nueva.trim()}
            onClick={() => {
              s.editarAjustes({ rubikMetas: [...s.ajustes.rubikMetas, nueva.trim()] })
              setNueva('')
            }}
          >
            Añadir
          </button>
        </div>
      </section>
    </>
  )
}
