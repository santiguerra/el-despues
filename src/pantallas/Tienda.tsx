import { useState } from 'react'
import type { Recompensa } from '../types'
import { useJuego } from '../store'
import { TiendaCosmeticos } from './Cosmeticos'

export function Tienda() {
  const s = useJuego()
  const [editando, setEditando] = useState<Recompensa | 'nueva' | null>(null)
  const [nombre, setNombre] = useState('')
  const [costo, setCosto] = useState(20)

  const abrir = (r: Recompensa | 'nueva') => {
    setEditando(r)
    setNombre(r === 'nueva' ? '' : r.nombre)
    setCosto(r === 'nueva' ? 20 : r.costo)
  }
  const guardar = () => {
    if (!nombre.trim() || costo <= 0) return
    if (editando === 'nueva') s.agregarRecompensa(nombre.trim(), costo)
    else if (editando) s.editarRecompensa(editando.id, nombre.trim(), costo)
    setEditando(null)
  }

  return (
    <div className="pantalla">
      <h1>Tienda de recompensas</h1>
      <p className="saldo">🪙 {s.jugador.monedas} monedas</p>
      <p className="nota">Recompensas reales. Los videojuegos se ganan aquí: no son un bloque.</p>

      {s.tienda.map((r) => (
        <div key={r.id} className="tarjeta recompensa">
          <div>
            <b>{r.nombre}</b>
            <small>{r.costo} 🪙</small>
          </div>
          <div className="botones">
            <button className="btn btn-oro" disabled={s.jugador.monedas < r.costo} onClick={() => s.canjear(r.id)}>
              Canjear
            </button>
            <button className="btn btn-mini" onClick={() => abrir(r)}>
              ✎
            </button>
          </div>
        </div>
      ))}

      {editando ? (
        <div className="tarjeta formulario">
          <h3>{editando === 'nueva' ? 'Nueva recompensa' : 'Editar recompensa'}</h3>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Café especial" autoFocus />
          <label>
            Costo en monedas
            <input type="number" min={1} value={costo} onChange={(e) => setCosto(Number(e.target.value))} />
          </label>
          <div className="botones">
            <button className="btn btn-oro" onClick={guardar}>
              Guardar
            </button>
            {editando !== 'nueva' && (
              <button
                className="btn btn-rojo"
                onClick={() => {
                  s.borrarRecompensa(editando.id)
                  setEditando(null)
                }}
              >
                Borrar
              </button>
            )}
            <button className="btn" onClick={() => setEditando(null)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button className="btn" onClick={() => abrir('nueva')}>
          + Nueva recompensa
        </button>
      )}

      <TiendaCosmeticos />

      {s.canjes.length > 0 && (
        <section className="tarjeta">
          <h3>Historial</h3>
          {s.canjes.slice(0, 20).map((c) => (
            <div key={c.id} className="fila-simple">
              <span>{c.nombre}</span>
              <small>
                −{c.costo} 🪙 · {new Date(c.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
              </small>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
