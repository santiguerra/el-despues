import { useState } from 'react'
import type { BloquePlantilla, ClaveFamilia } from '../types'
import { useJuego } from '../store'
import { CATEGORIAS, LUGARES } from '../logic/catalogo'
import { choquesFamiliaPlantilla } from '../logic/generador'
import { NOMBRES_CORTOS, NOMBRES_DIA, ORDEN_DIAS, diaSemana, fechaLocal, fmtDur, hhmmAMin, minAHhmm } from '../logic/tiempo'
import { BloqueForm, formVacio, type FormBloque } from '../components/BloqueForm'
import { Icono } from '../ui/Icono'

export function Plantilla({ ahora }: { ahora: number }) {
  const hoy = fechaLocal(ahora)
  const [dia, setDia] = useState(() => diaSemana(hoy))
  const s = useJuego()
  const [editando, setEditando] = useState<BloquePlantilla | 'nuevo' | null>(null)
  const bloques = s.plantilla.filter((p) => p.dia === dia).sort((a, b) => hhmmAMin(a.inicio) - hhmmAMin(b.inicio))

  const guardar = (f: FormBloque) => {
    const datos = { ...f, dia }
    if (editando === 'nuevo') s.agregarPlantilla(datos)
    else if (editando) s.editarPlantilla(editando.id, datos)
    setEditando(null)
  }

  return (
    <div className="pantalla">
      <h1>Plantilla semanal</h1>
      <p className="nota">Cada día se genera solo desde aquí. Los cambios aplican a los días nuevos; usa "Aplicar a hoy" para hoy.</p>

      <div className="pestanas-dia">
        {ORDEN_DIAS.map((d) => (
          <button key={d} className={d === dia ? 'activa' : ''} onClick={() => setDia(d)}>
            {NOMBRES_CORTOS[d]}
          </button>
        ))}
      </div>
      <h2>{NOMBRES_DIA[dia]}</h2>

      {bloques.map((b) =>
        b.tipo === 'hito' ? (
          <button key={b.id} className="hito como-boton" onClick={() => setEditando(b)}>
            <span>{b.inicio}</span> {b.titulo}
          </button>
        ) : (
          <button key={b.id} className="fila" onClick={() => setEditando(b)}>
            <span className="hora">{b.inicio}</span>
            <span className="cuadro" style={{ background: CATEGORIAS[b.categoria].color }} />
            <span className="info">
              <span className="t">{b.titulo}</span>
              <span className="sub">
                {b.vinculo === 'estudio' ? `${s.ajustes.estudioMin} min (crece)` : fmtDur(b.duracion)} · <Icono n={LUGARES[b.lugar].icono} size={13} />{' '}
                {CATEGORIAS[b.categoria].nombre} · {b.fijo ? 'FIJO' : 'flexible'}
                {b.opcional && ' · opcional'}
              </span>
            </span>
          </button>
        ),
      )}

      <div className="botones">
        <button className="btn btn-oro" onClick={() => setEditando('nuevo')}>
          + Bloque el {NOMBRES_DIA[dia].toLowerCase()}
        </button>
        <button className="btn" onClick={() => s.aplicarPlantillaHoy(hoy)}>
          <Icono n="recargar" size={18} /> Aplicar a hoy
        </button>
      </div>

      <Familia />

      {editando && (
        <BloqueForm
          titulo={editando === 'nuevo' ? `Nuevo bloque · ${NOMBRES_DIA[dia]}` : 'Editar bloque de la plantilla'}
          inicial={editando === 'nuevo' ? formVacio() : editando}
          esFijo={editando !== 'nuevo' && editando.fijo}
          cerrar={() => setEditando(null)}
          guardar={guardar}
          borrar={
            editando === 'nuevo'
              ? undefined
              : () => {
                  s.borrarPlantilla(editando.id)
                  setEditando(null)
                }
          }
        />
      )}
    </div>
  )
}

function Familia() {
  const familia = useJuego((s) => s.familia)
  const plantilla = useJuego((s) => s.plantilla)
  const editar = useJuego((s) => s.editarFamilia)
  const alertas = choquesFamiliaPlantilla(plantilla, familia)

  return (
    <section className="tarjeta">
      <h2>
          <Icono n="familia" color="var(--azul)" /> Familia
        </h2>
      <p className="nota">Marca los días en que te toca. También puedes activarlas o quitarlas solo para hoy desde "Hoy".</p>
      {(['hermana', 'hermano'] as ClaveFamilia[]).map((k) => {
        const t = familia[k]
        return (
          <div key={k} className="familia">
            <input className="titulo-input" value={t.titulo} onChange={(e) => editar(k, { ...t, titulo: e.target.value })} />
            <div className="fila-campos">
              <label>
                Salgo a las
                <input type="time" value={t.inicio} onChange={(e) => editar(k, { ...t, inicio: e.target.value })} />
              </label>
              <label>
                Duración (min)
                <input type="number" min={5} step={5} value={t.duracion} onChange={(e) => editar(k, { ...t, duracion: Number(e.target.value) })} />
              </label>
            </div>
            <small>
              Vuelvo ~{minAHhmm(hhmmAMin(t.inicio) + t.duracion)}
            </small>
            <div className="pestanas-dia chicas">
              {ORDEN_DIAS.map((d) => (
                <button
                  key={d}
                  className={t.dias[d] ? 'activa' : ''}
                  onClick={() => editar(k, { ...t, dias: t.dias.map((v, i) => (i === d ? !v : v)) })}
                >
                  {NOMBRES_CORTOS[d]}
                </button>
              ))}
            </div>
          </div>
        )
      })}
      {alertas.map((a) => (
        <div key={a} className="alerta">
          <Icono n="alerta" size={18} /> {a}
        </div>
      ))}
    </section>
  )
}
