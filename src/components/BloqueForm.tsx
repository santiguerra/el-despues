import { useState } from 'react'
import type { Categoria, DatosBloque, Lugar, TipoBloque } from '../types'
import { CATEGORIAS, LISTA_CATEGORIAS, LUGARES, TIPOS } from '../logic/catalogo'
import { Modal } from './Modal'
import { Icono } from '../ui/Icono'

export type FormBloque = DatosBloque & { inicio: string }

export const formVacio = (inicio = '09:00'): FormBloque => ({
  titulo: '',
  inicio,
  duracion: 60,
  categoria: 'empresa',
  lugar: 'cuarto',
  fijo: false,
  tipo: 'normal',
})

interface Props {
  titulo: string
  inicial: FormBloque
  /** si el bloque original era FIJO, moverlo o borrarlo pide confirmación */
  esFijo: boolean
  guardar: (d: FormBloque) => void
  borrar?: () => void
  cerrar: () => void
}

export function BloqueForm({ titulo, inicial, esFijo, guardar, borrar, cerrar }: Props) {
  const [f, setF] = useState<FormBloque>(inicial)
  const [confirmar, setConfirmar] = useState<null | 'guardar' | 'borrar'>(null)
  const set = <K extends keyof FormBloque>(k: K, v: FormBloque[K]) => setF((x) => ({ ...x, [k]: v }))

  const cambiaHora = f.inicio !== inicial.inicio || f.duracion !== inicial.duracion
  const valido = f.titulo.trim() && f.inicio && (f.duracion === null || f.duracion >= 0)

  const intentarGuardar = () => {
    if (!valido) return
    if (esFijo && cambiaHora && confirmar !== 'guardar') return setConfirmar('guardar')
    guardar({ ...f, titulo: f.titulo.trim() })
  }
  const intentarBorrar = () => {
    if (esFijo && confirmar !== 'borrar') return setConfirmar('borrar')
    borrar?.()
  }

  const cambiarTipo = (t: TipoBloque) => {
    setF((x) => ({
      ...x,
      tipo: t,
      ...(t === 'reunion' && { lugar: 'calle' as Lugar, categoria: 'empresa' as Categoria }),
      ...(t === 'clase' && { categoria: 'clases' as Categoria, fijo: true }),
      ...(t === 'hito' && { duracion: 0, fijo: true }),
    }))
  }

  return (
    <Modal titulo={titulo} color={CATEGORIAS[f.categoria].color} cerrar={cerrar}>
      <div className="formulario">
        <label>
          Título
          <input value={f.titulo} onChange={(e) => set('titulo', e.target.value)} placeholder="Ej. Reunión con cliente" autoFocus />
        </label>
        <div className="fila-campos">
          <label>
            Hora
            <input type="time" value={f.inicio} onChange={(e) => set('inicio', e.target.value)} />
          </label>
          <label>
            Duración (min)
            <input
              type="number"
              min={0}
              step={5}
              disabled={f.duracion === null}
              value={f.duracion ?? ''}
              onChange={(e) => set('duracion', Number(e.target.value))}
            />
          </label>
        </div>
        <label className="check">
          <input type="checkbox" checked={f.duracion === null} onChange={(e) => set('duracion', e.target.checked ? null : 60)} />
          Sin hora de fin
        </label>
        <label>
          Tipo
          <select value={f.tipo} onChange={(e) => cambiarTipo(e.target.value as TipoBloque)}>
            {Object.entries(TIPOS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <div className="fila-campos">
          <label>
            Categoría
            <select value={f.categoria} onChange={(e) => set('categoria', e.target.value as Categoria)}>
              {LISTA_CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {CATEGORIAS[c].nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            Lugar
            <select value={f.lugar} onChange={(e) => set('lugar', e.target.value as Lugar)}>
              {(Object.keys(LUGARES) as Lugar[]).map((l) => (
                <option key={l} value={l}>
                  {LUGARES[l].nombre}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="check">
          <input type="checkbox" checked={f.fijo} onChange={(e) => set('fijo', e.target.checked)} />
          FIJO (no se mueve al replanificar; moverlo o borrarlo pide confirmación)
        </label>
        <label className="check">
          <input type="checkbox" checked={!!f.opcional} onChange={(e) => set('opcional', e.target.checked || undefined)} />
          Opcional (decides el día si vas)
        </label>
        <label className="check">
          <input type="checkbox" checked={!!f.descanso} onChange={(e) => set('descanso', e.target.checked || undefined)} />
          Cuenta como descanso
        </label>
        <label>
          Nota
          <input value={f.nota ?? ''} onChange={(e) => set('nota', e.target.value || undefined)} placeholder="Opcional" />
        </label>

        {confirmar && (
          <div className="confirmar">
            <p>
              <Icono n="alerta" size={18} /> «{inicial.titulo}» es un bloque <b>FIJO</b>. ¿Seguro que quieres {confirmar === 'borrar' ? 'borrarlo' : 'moverlo'}?
            </p>
            <div className="botones">
              <button className="btn btn-rojo" onClick={confirmar === 'borrar' ? intentarBorrar : intentarGuardar}>
                Sí, {confirmar === 'borrar' ? 'borrar' : 'mover'}
              </button>
              <button className="btn" onClick={() => setConfirmar(null)}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {!confirmar && (
          <div className="botones">
            <button className="btn btn-oro" disabled={!valido} onClick={intentarGuardar}>
              Guardar
            </button>
            {borrar && (
              <button className="btn btn-rojo" onClick={intentarBorrar}>
                Borrar
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
