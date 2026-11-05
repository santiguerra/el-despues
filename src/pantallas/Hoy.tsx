import { useState, type ReactNode } from 'react'
import type { Bloque, Categoria, Dia } from '../types'
import { useJuego } from '../store'
import { CATEGORIAS, CATEGORIAS_RANA, LUGARES } from '../logic/catalogo'
import { choques, finDe, horaCierre } from '../logic/generador'
import { evaluar } from '../logic/reglas'
import { NOMBRES_DIA, diaSemana, esFinde, fechaCorta, fechaLocal, fmtDur, hhmmAMin, minAHhmm, minutosDelDia, sumarDias } from '../logic/tiempo'
import { BloqueForm, formVacio } from '../components/BloqueForm'

const ICONO_ESTADO: Record<Bloque['estado'], string> = {
  pendiente: '',
  activo: '▶',
  completado: '✔',
  fallido: '✖',
  saltado: '—',
}

export function Hoy({ ahora, abrir }: { ahora: number; abrir: (id: string) => void }) {
  const fecha = fechaLocal(ahora)
  const dia = useJuego((s) => s.dias[fecha])
  const s = useJuego()
  const [agregando, setAgregando] = useState(false)
  if (!dia) return <p className="vacio">Generando el día…</p>

  const min = minutosDelDia(ahora)
  const cierre = horaCierre(dia.bloques)
  const cerrado = cierre !== null && min >= cierre
  const visibles = dia.bloques.filter((b) => !b.sinEspacio)
  const sinEspacio = dia.bloques.filter((b) => b.sinEspacio && b.estado === 'pendiente')
  const alertas = choques(dia.bloques)
  const opcionales = dia.bloques.filter((b) => b.opcional && !b.aceptado && b.estado === 'pendiente')
  const activo = dia.bloques.find((b) => b.estado === 'activo')
  const enCurso = visibles.find((b) => b.tipo !== 'hito' && b.estado === 'pendiente' && b.inicio <= min && min < finDe(b) && !(b.opcional && !b.aceptado))
  const siguiente = visibles.find((b) => b.tipo !== 'hito' && b.estado === 'pendiente' && b.inicio > min && !(b.opcional && !b.aceptado))
  const rana = dia.bloques.find((b) => b.esRana)

  return (
    <div className="pantalla">
      <h1 className="titulo-dia">
        {NOMBRES_DIA[diaSemana(fecha)]} {fechaCorta(fecha)}
        <span className="hora-actual">{minAHhmm(min)}</span>
      </h1>

      {cerrado && <ResumenDia dia={dia} />}

      {alertas.map((a) => (
        <div key={a} className="alerta">
          ⚠ Choque: {a}
        </div>
      ))}

      {opcionales.map((b) => (
        <div key={b.id} className="tarjeta opcional">
          <p>
            <b>{b.titulo}</b> {minAHhmm(b.inicio)} · opcional
            {b.nota && <small> — {b.nota}</small>}
          </p>
          <div className="botones">
            <button className="btn" onClick={() => s.decidirOpcional(fecha, b.id, true)}>
              Voy
            </button>
            <button className="btn" onClick={() => s.decidirOpcional(fecha, b.id, false)}>
              No voy
            </button>
          </div>
        </div>
      ))}

      <TarjetaAhora activo={activo} enCurso={enCurso} siguiente={siguiente} min={min} abrir={abrir} cerrado={cerrado} />

      <div className="rejilla-2">
        <Despertar dia={dia} min={min} />
        <HigieneHoy dia={dia} />
      </div>

      <div className={`tarjeta rana ${rana ? '' : 'sin-rana'}`}>
        <span className="emoji">🐸</span>
        {rana ? (
          <button className="enlace" onClick={() => abrir(rana.id)}>
            <span className="rotulo">La Rana de hoy · XP doble</span>
            <br />
            <b>{rana.titulo.replace('🐸 ', '')}</b> a las {minAHhmm(rana.inicio)}
          </button>
        ) : (
          <span>Hoy no hay Rana. Elígela esta noche para mañana.</span>
        )}
      </div>

      <FamiliaHoy dia={dia} />

      <section className="linea-tiempo">
        <h2>Expediciones de hoy</h2>
        <LineaTiempo bloques={visibles} min={min} abrir={abrir} />
      </section>

      <div className="botones">
        <button className="btn btn-oro" disabled={cerrado} onClick={() => setAgregando(true)}>
          + Agregar bloque
        </button>
        <button className="btn" onClick={() => s.reacomodar(fecha)}>
          🗺 Reacomodar pendientes
        </button>
      </div>
      {cerrado && <p className="nota">Después del cierre no se agregan bloques ni hay XP de trabajo.</p>}

      {sinEspacio.length > 0 && (
        <section className="tarjeta">
          <h3>Sin espacio hoy</h3>
          <p className="nota">No caben antes del cierre. No cuentan para el día.</p>
          {sinEspacio.map((b) => (
            <div key={b.id} className="fila-simple">
              <span>
                {b.titulo} · {fmtDur(b.duracion)}
              </span>
              <button className="btn btn-mini" onClick={() => s.borrarBloque(fecha, b.id)}>
                Quitar
              </button>
            </div>
          ))}
        </section>
      )}

      {(min >= 18 * 60 || cerrado) && <RanaManana fecha={sumarDias(fecha, 1)} />}

      <Acostarme dia={dia} min={min} />

      {agregando && (
        <BloqueForm
          titulo="Nuevo bloque para hoy"
          inicial={formVacio(minAHhmm(Math.ceil(min / 5) * 5))}
          esFijo={false}
          cerrar={() => setAgregando(false)}
          guardar={(d) => {
            if (s.agregarBloque(fecha, { ...d, inicio: hhmmAMin(d.inicio) })) setAgregando(false)
          }}
        />
      )}
    </div>
  )
}

function TarjetaAhora(p: { activo?: Bloque; enCurso?: Bloque; siguiente?: Bloque; min: number; abrir: (id: string) => void; cerrado: boolean }) {
  const b = p.activo ?? p.enCurso
  if (b) {
    return (
      <button className={`tarjeta ahora ${p.activo ? 'activa' : ''}`} onClick={() => p.abrir(b.id)}>
        <small>{p.activo ? 'EN EXPEDICIÓN' : 'TOCA AHORA'}</small>
        <b>{b.titulo}</b>
        <span>
          {minAHhmm(b.inicio)} · {fmtDur(b.duracion)} · {LUGARES[b.lugar].icono} {LUGARES[b.lugar].nombre}
        </span>
        <span className="cta">{p.activo ? 'Ver temporizador' : b.tipo === 'clase' ? 'Hacer check-in' : 'Empezar'}</span>
      </button>
    )
  }
  if (p.siguiente) {
    return (
      <button className="tarjeta ahora tenue" onClick={() => p.abrir(p.siguiente!.id)}>
        <small>SIGUIENTE EXPEDICIÓN · en {fmtDur(Math.round(p.siguiente.inicio - p.min))}</small>
        <b>{p.siguiente.titulo}</b>
        <span>{minAHhmm(p.siguiente.inicio)}</span>
      </button>
    )
  }
  return <div className="tarjeta ahora tenue">{p.cerrado ? 'El día terminó. A descansar, guardián.' : 'Nada más por hoy.'}</div>
}

function LineaTiempo({ bloques, min, abrir }: { bloques: Bloque[]; min: number; abrir: (id: string) => void }) {
  const buffer = useJuego((s) => s.ajustes.buffer)
  const filas: ReactNode[] = []
  let finPrevio: number | null = null
  for (const b of bloques) {
    const ignorado = b.opcional && !b.aceptado
    if (finPrevio !== null && b.tipo !== 'hito' && !ignorado && b.inicio > finPrevio) {
      const hueco = b.inicio - finPrevio
      filas.push(
        <div key={`h${b.id}`} className={`hueco ${hueco <= buffer ? 'buffer' : ''}`}>
          {hueco <= buffer ? `· buffer ${hueco} min ·` : `· libre ${fmtDur(hueco)} ·`}
        </div>,
      )
    }
    if (b.tipo === 'hito') {
      filas.push(
        <div key={b.id} className="hito">
          <span>{minAHhmm(b.inicio)}</span> {b.titulo}
        </div>,
      )
      finPrevio = Math.max(finPrevio ?? 0, b.inicio)
      continue
    }
    const enCurso = b.inicio <= min && min < finDe(b)
    filas.push(
      <button key={b.id} className={`fila estado-${b.estado} ${enCurso ? 'en-curso' : ''} ${ignorado ? 'ignorado' : ''}`} onClick={() => abrir(b.id)}>
        <span className="hora">{minAHhmm(b.inicio)}</span>
        <span className="cuadro" style={{ background: CATEGORIAS[b.categoria].color }}>
          {ICONO_ESTADO[b.estado]}
        </span>
        <span className="info">
          <span className="t">{b.titulo}</span>
          <span className="sub">
            {fmtDur(b.duracion)} · {LUGARES[b.lugar].icono} {CATEGORIAS[b.categoria].nombre}
            {b.fijo && ' · FIJO'}
            {b.opcional && ' · opcional'}
            {b.tipo === 'reunion' && ' · reunión'}
            {b.meta && ` · meta: ${b.meta}`}
          </span>
        </span>
      </button>,
    )
    if (!ignorado) finPrevio = Math.max(finPrevio ?? 0, finDe(b) === Infinity ? 24 * 60 : finDe(b))
  }
  return <>{filas}</>
}

function Despertar({ dia, min }: { dia: Dia; min: number }) {
  const ajustes = useJuego((s) => s.ajustes)
  const marcar = useJuego((s) => s.marcarLevante)
  const meta = esFinde(dia.fecha) ? ajustes.despertarFinde : ajustes.despertarSemana
  return (
    <div className="tarjeta compacta">
      <h3>☀ Despertar</h3>
      {dia.levante ? (
        <p>{dia.levante === 'a-tiempo' ? '✔ A tiempo (+XP)' : '✖ Tarde'}</p>
      ) : min < 12 * 60 ? (
        <button className="btn btn-oro" onClick={() => marcar(dia.fecha)}>
          Me levanté
        </button>
      ) : (
        <p className="nota">Sin marcar</p>
      )}
      <small>Meta: {meta}</small>
    </div>
  )
}

function HigieneHoy({ dia }: { dia: Dia }) {
  const s = useJuego()
  const h = dia.higiene
  const meta = s.ajustes.comidasMeta
  return (
    <div className={`tarjeta compacta ${h.escudo ? 'escudo' : ''}`}>
      <h3>🛡 Higiene {h.escudo && '✔'}</h3>
      <label className="check">
        <input type="checkbox" checked={h.manana} onChange={() => s.higieneManana(dia.fecha)} /> Mañana: cara + dientes
      </label>
      <div className="contador">
        <span>
          Tras comidas: {h.comidas}/{meta}
        </span>
        <button className="btn btn-mini" onClick={() => s.comidas(dia.fecha, -1)}>
          −
        </button>
        <button className="btn btn-mini" onClick={() => s.comidas(dia.fecha, 1)}>
          +
        </button>
      </div>
      <label className="check">
        <input type="checkbox" checked={h.noche} onChange={() => s.higieneNoche(dia.fecha)} /> Noche: cara + dientes + seda
      </label>
    </div>
  )
}

function FamiliaHoy({ dia }: { dia: Dia }) {
  const familia = useJuego((s) => s.familia)
  const alternar = useJuego((s) => s.familiaHoy)
  return (
    <div className="tarjeta">
      <h3>👪 Familia hoy</h3>
      {(['hermana', 'hermano'] as const).map((k) => (
        <label key={k} className="check">
          <input type="checkbox" checked={dia.familia[k]} onChange={() => alternar(dia.fecha, k)} />
          {familia[k].titulo} · sale {familia[k].inicio}
        </label>
      ))}
    </div>
  )
}

function ResumenDia({ dia }: { dia: Dia }) {
  const umbral = useJuego((s) => s.ajustes.umbralCumplido)
  const r = evaluar(dia, umbral)
  const fallidos = dia.bloques.filter((b) => b.estado === 'fallido')
  return (
    <section className="tarjeta resumen">
      <h2>🌙 Cierre del día</h2>
      <div className="numeros">
        <div>
          <b>
            {r.hechos}/{r.total}
          </b>
          <small>bloques</small>
        </div>
        <div>
          <b>{Math.round(r.porcentaje * 100)}%</b>
          <small>cumplido</small>
        </div>
        <div>
          <b>{dia.xp}</b>
          <small>XP hoy</small>
        </div>
        <div>
          <b>{dia.monedas}</b>
          <small>🪙 hoy</small>
        </div>
      </div>
      <p>{r.cumplido ? '🔥 Día cumplido: la racha sigue.' : `Necesitas ${Math.round(umbral * 100)}% para sumar a la racha.`}</p>
      {dia.higiene.escudo && <p>🛡 Escudo de Higiene ganado.</p>}
      {fallidos.length > 0 && <p className="nota">No pude: {fallidos.map((b) => b.titulo).join(', ')}</p>}
    </section>
  )
}

function RanaManana({ fecha }: { fecha: string }) {
  const rana = useJuego((s) => s.ranas[fecha])
  const elegir = useJuego((s) => s.elegirRana)
  const [tarea, setTarea] = useState('')
  const [cat, setCat] = useState<Categoria>('empresa')
  const [editando, setEditando] = useState(false)

  if (rana && !editando) {
    return (
      <div className="tarjeta rana bloque">
        <h3>🐸 Rana de mañana</h3>
        <p>
          <b>{rana.tarea}</b> · {CATEGORIAS[rana.categoria ?? 'empresa'].nombre}
        </p>
        <button className="btn btn-mini" onClick={() => (setTarea(rana.tarea), setEditando(true))}>
          Cambiar
        </button>
      </div>
    )
  }
  return (
    <div className="tarjeta rana bloque">
      <h3>🐸 Elige la Rana de mañana</h3>
      <p className="nota">La tarea más difícil. Será tu primer bloque de trabajo, con XP doble.</p>
      <div className="formulario">
        <input value={tarea} onChange={(e) => setTarea(e.target.value)} placeholder="Ej. Terminar el login del cliente" />
        <select value={cat} onChange={(e) => setCat(e.target.value as Categoria)}>
          {CATEGORIAS_RANA.map((c) => (
            <option key={c} value={c}>
              {CATEGORIAS[c].nombre}
            </option>
          ))}
        </select>
        <button
          className="btn btn-oro"
          disabled={!tarea.trim()}
          onClick={() => {
            elegir(fecha, { tarea: tarea.trim(), categoria: cat })
            setEditando(false)
          }}
        >
          Elegir Rana
        </button>
      </div>
    </div>
  )
}

function Acostarme({ dia, min }: { dia: Dia; min: number }) {
  const marcar = useJuego((s) => s.marcarAcoste)
  const luces = useJuego((s) => s.ajustes.horaLuces)
  if (horaCierre(dia.bloques) === null) {
    return min >= 18 * 60 ? <p className="nota">🃏 Hoy el cierre y la hora de cama son flexibles: no cuentan como fallo.</p> : null
  }
  if (min < 22 * 60) return null
  return (
    <div className="tarjeta">
      <h3>🌙 Acostarme</h3>
      {dia.acoste ? (
        <p>{dia.acoste === 'a-tiempo' ? '✔ A tiempo (+XP)' : '✖ Tarde'}</p>
      ) : (
        <button className="btn btn-oro" onClick={() => marcar(dia.fecha)}>
          Me acosté (luces {luces})
        </button>
      )}
    </div>
  )
}
