import { useState } from 'react'
import { useJuego } from '../store'
import { CATEGORIAS } from '../logic/catalogo'
import { FRANJAS, lunesDe, pct, resumenSemana, type Conteo } from '../logic/resumen'
import { fechaCorta, fechaLocal, sumarDias } from '../logic/tiempo'
import { Habitos } from './Habitos'
import { Icono } from '../ui/Icono'

export function Progreso({ ahora }: { ahora: number }) {
  return (
    <div className="pantalla">
      <h1>Progreso</h1>
      <ResumenSemanal ahora={ahora} />
      <Habitos ahora={ahora} />
    </div>
  )
}

function Fila({ nombre, color, c }: { nombre: string; color?: string; c: Conteo }) {
  const p = Math.round(pct(c) * 100)
  return (
    <div className="fila-resumen">
      <div className="fila-resumen-texto">
        <span>
          {color && <span className="punto" style={{ background: color }} />}
          {nombre}
        </span>
        <b>
          {p}% <small>· {c.hechos}/{c.total}</small>
        </b>
      </div>
      <div className="barra">
        <div className={`relleno ${p < 50 ? 'bajo' : ''}`} style={{ width: `${p}%` }} />
      </div>
    </div>
  )
}

function ResumenSemanal({ ahora }: { ahora: number }) {
  const dias = useJuego((s) => s.dias)
  const umbral = useJuego((s) => s.ajustes.umbralCumplido)
  const estaSemana = lunesDe(fechaLocal(ahora))
  const [lunes, setLunes] = useState(estaSemana)
  const r = resumenSemana(dias, lunes, umbral)
  const mejor = [...r.franjas].filter((f) => f.total).sort((a, b) => pct(b) - pct(a))[0]
  const peor = [...r.categorias].filter((c) => c.total >= 2).sort((a, b) => pct(a) - pct(b))[0]

  return (
    <section className="tarjeta resumen-semanal">
      <div className="cabeza-semana">
        <button className="btn btn-mini" onClick={() => setLunes(sumarDias(lunes, -7))} aria-label="Semana anterior">
          <Icono n="izq" size={18} weight="bold" />
        </button>
        <h2>
          {lunes === estaSemana ? 'Esta semana' : 'Semana'} · {fechaCorta(r.lunes)} – {fechaCorta(r.domingo)}
        </h2>
        <button className="btn btn-mini" disabled={lunes >= estaSemana} onClick={() => setLunes(sumarDias(lunes, 7))} aria-label="Semana siguiente">
          <Icono n="der" size={18} weight="bold" />
        </button>
      </div>

      {r.total.total === 0 ? (
        <p className="nota">No hay bloques registrados en esta semana.</p>
      ) : (
        <>
          <div className="numeros">
            <div>
              <b>{Math.round(pct(r.total) * 100)}%</b>
              <small>cumplido</small>
            </div>
            <div>
              <b>
                {r.diasCumplidos}/{r.diasRegistrados}
              </b>
              <small>
                días <Icono n="racha" size={12} />
              </small>
            </div>
            <div>
              <b>{r.xp}</b>
              <small>XP</small>
            </div>
            <div>
              <b>{r.noPude}</b>
              <small>no pude</small>
            </div>
          </div>

          <h3>Por categoría</h3>
          {r.categorias.map((c) => (
            <Fila key={c.categoria} nombre={CATEGORIAS[c.categoria].nombre} color={CATEGORIAS[c.categoria].color} c={c} />
          ))}

          <h3>Por franja horaria</h3>
          {r.franjas.map((f) => (
            <Fila key={f.franja} nombre={FRANJAS.find((x) => x.id === f.franja)!.nombre} c={f} />
          ))}

          {(mejor || peor) && (
            <p className="nota">
              {mejor && `Tu mejor franja: ${FRANJAS.find((x) => x.id === mejor.franja)!.nombre.split(' (')[0].toLowerCase()}. `}
              {peor && pct(peor) < 0.75 && `Donde más se cuela El Después: ${CATEGORIAS[peor.categoria].nombre}.`}
            </p>
          )}
        </>
      )}
    </section>
  )
}
