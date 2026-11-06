import { useState } from 'react'
import type { Bloque } from '../types'
import { useJuego } from '../store'
import { CATEGORIAS, LUGARES, TIPOS } from '../logic/catalogo'
import { horaCierre } from '../logic/generador'
import { ESPERA_SALIDA_MS, VENTANA_SIGUE_AHI, tiemposClase, xpBloque } from '../logic/reglas'
import { fmtDur, fmtReloj, hhmmAMin, minAHhmm, minutosDelDia } from '../logic/tiempo'
import { vidaRana } from '../aldea/edificios'
import { Modal } from '../components/Modal'
import { BloqueForm } from '../components/BloqueForm'

interface Props {
  fecha: string
  id: string
  ahora: number
  cerrar: () => void
}

export function VistaBloque({ fecha, id, ahora, cerrar }: Props) {
  const dia = useJuego((s) => s.dias[fecha])
  const b = dia?.bloques.find((x) => x.id === id)
  const editar = useJuego((s) => s.editarBloque)
  const borrar = useJuego((s) => s.borrarBloque)
  const [editando, setEditando] = useState(false)
  if (!dia || !b) return null

  if (editando) {
    return (
      <BloqueForm
        titulo="Editar bloque de hoy"
        inicial={{ ...b, inicio: minAHhmm(b.inicio) }}
        esFijo={b.fijo}
        cerrar={() => setEditando(false)}
        guardar={(d) => {
          editar(fecha, b.id, { ...d, inicio: hhmmAMin(d.inicio) })
          setEditando(false)
        }}
        borrar={() => {
          borrar(fecha, b.id)
          cerrar()
        }}
      />
    )
  }

  const min = minutosDelDia(ahora)
  const cierre = horaCierre(dia.bloques)
  const xpPrevista = xpBloque(b, cierre !== null && min >= cierre)
  const color = CATEGORIAS[b.categoria].color

  return (
    <Modal titulo={b.titulo} color={color} cerrar={cerrar}>
      <div className="detalle">
        <span>
          {minAHhmm(b.inicio)}
          {b.duracion !== null && `–${minAHhmm(b.inicio + b.duracion)}`} · {fmtDur(b.duracion)}
        </span>
        <span>
          {LUGARES[b.lugar].icono} {LUGARES[b.lugar].nombre} · {CATEGORIAS[b.categoria].nombre}
        </span>
        <span className="etiquetas">
          {b.fijo && <i>FIJO</i>}
          {b.esRana && <i className="verde">🐸 RANA ×2</i>}
          {b.opcional && <i>OPCIONAL</i>}
          {b.descanso && <i>DESCANSO</i>}
          <i>{TIPOS[b.tipo].split(' (')[0]}</i>
        </span>
        {b.nota && <p className="nota">{b.nota}</p>}
        {b.meta && <MetaRubik fecha={fecha} b={b} />}
      </div>

      {b.tipo === 'clase' && <PanelClase fecha={fecha} b={b} ahora={ahora} />}
      {(b.tipo === 'normal' || b.tipo === 'reunion') && <PanelTemporizador fecha={fecha} b={b} ahora={ahora} />}
      {b.tipo === 'evento' && <PanelEvento fecha={fecha} b={b} min={min} />}
      {b.tipo === 'hito' && <p className="nota">Hito del día: marca una hora, no se cronometra.</p>}

      {b.estado === 'completado' && (
        <p className="resultado ok">
          ✔ Completado · +{b.xp} XP · +{b.monedas} 🪙
        </p>
      )}
      {b.resultado && b.estado !== 'completado' && <p className="resultado mal">{b.resultado}</p>}
      {b.estado === 'pendiente' && b.tipo !== 'hito' && xpPrevista.xp > 0 && (
        <p className="nota">Botín: {xpPrevista.xp} XP · {xpPrevista.monedas} 🪙</p>
      )}
      {xpPrevista.nota && b.estado === 'pendiente' && <p className="nota">⚠ {xpPrevista.nota}</p>}

      <div className="botones pie">
        <button className="btn" onClick={() => setEditando(true)}>
          ✎ Editar
        </button>
        <button className="btn" onClick={cerrar}>
          Volver
        </button>
      </div>
    </Modal>
  )
}

function MetaRubik({ fecha, b }: { fecha: string; b: Bloque }) {
  const metas = useJuego((s) => s.ajustes.rubikMetas)
  const fijar = useJuego((s) => s.metaHoy)
  return (
    <label className="meta">
      🧊 Meta de hoy:
      <select value={b.meta} onChange={(e) => fijar(fecha, b.id, e.target.value)}>
        {[...new Set([b.meta!, ...metas])].map((m) => (
          <option key={m}>{m}</option>
        ))}
      </select>
    </label>
  )
}

function Barra({ pct, marca }: { pct: number; marca?: number }) {
  return (
    <div className="barra barra-grande">
      <div className="relleno" style={{ width: `${Math.min(100, pct * 100)}%` }} />
      {marca && <div className="marca" style={{ left: `${marca * 100}%` }} />}
    </div>
  )
}

function NoPude({ fecha, b }: { fecha: string; b: Bloque }) {
  const noPude = useJuego((s) => s.noPude)
  const [seguro, setSeguro] = useState(false)
  if (!seguro)
    return (
      <button className="btn btn-rojo" onClick={() => setSeguro(true)}>
        No pude
      </button>
    )
  return (
    <div className="confirmar">
      <p>Se marca como fallido y se replanifica el resto del día (sin invadir el cierre).</p>
      <div className="botones">
        <button className="btn btn-rojo" onClick={() => noPude(fecha, b.id)}>
          Sí, no pude
        </button>
        <button className="btn" onClick={() => setSeguro(false)}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

function PanelTemporizador({ fecha, b, ahora }: { fecha: string; b: Bloque; ahora: number }) {
  const s = useJuego()
  const dur = (b.duracion ?? 0) * 60000
  const trans = b.iniciadoEn ? ahora - b.iniciadoEn : 0
  const pct = dur ? trans / dur : 0
  const activo = b.estado === 'activo'
  const listo = pct >= 0.8

  return (
    <div className="temporizador">
      {b.esRana && <VidaRana b={b} ahora={ahora} />}
      <div className="reloj-grande">{activo ? (trans > dur ? `+${fmtReloj(trans - dur)}` : fmtReloj(dur - trans)) : fmtReloj(dur)}</div>
      <small>{activo ? (trans > dur ? 'tiempo extra' : `restante · llevas ${fmtReloj(trans)}`) : 'duración'}</small>
      <Barra pct={pct} marca={0.8} />
      {b.estado === 'pendiente' && (
        <div className="botones">
          <button className="btn btn-grande btn-oro" onClick={() => s.iniciar(fecha, b.id)}>
            ⚔ Iniciar
          </button>
          <NoPude fecha={fecha} b={b} />
        </div>
      )}
      {activo && (
        <div className="botones">
          <button className="btn btn-grande btn-verde" disabled={!listo} onClick={() => s.completar(fecha, b.id)}>
            {listo ? '✔ Completar' : `Completar en ${fmtReloj(dur * 0.8 - trans)}`}
          </button>
          <NoPude fecha={fecha} b={b} />
        </div>
      )}
    </div>
  )
}

export function VidaRana({ b, ahora }: { b: Bloque; ahora: number }) {
  const vida = vidaRana(b, ahora)
  const texto =
    b.estado === 'completado' ? '¡Vencida! Botín doble.' : b.estado === 'fallido' ? 'Se escapó…' : b.estado === 'activo' ? `${Math.ceil(vida * 100)}% de vida` : 'Te espera en el camino'
  return (
    <div className="vida-rana">
      <div className="fila-resumen-texto">
        <b>🐸 Vida de la Rana</b>
        <small>{texto}</small>
      </div>
      <div className="barra barra-vida">
        <div className={`relleno ${vida > 0.5 ? '' : vida > 0.25 ? 'media' : 'baja'}`} style={{ width: `${vida * 100}%` }} />
      </div>
    </div>
  )
}

function PanelClase({ fecha, b, ahora }: { fecha: string; b: Bloque; ahora: number }) {
  const s = useJuego()
  const min = minutosDelDia(ahora)
  const c = tiemposClase(b)
  const restante = (c.fin - min) * 60000

  if (b.estado === 'pendiente') {
    if (min < c.inicio)
      return (
        <div className="temporizador">
          <div className="reloj-grande">{fmtReloj((c.inicio - min) * 60000)}</div>
          <small>para el check-in (abre {minAHhmm(c.inicio)}, cierra {minAHhmm(c.cierreCheckIn)})</small>
          <button className="btn btn-grande" disabled>
            🎓 Check-in
          </button>
        </div>
      )
    return (
      <div className="temporizador">
        <div className="reloj-grande">{fmtReloj((c.cierreCheckIn - min) * 60000)}</div>
        <small>para que se cierre el check-in</small>
        <button className="btn btn-grande btn-oro" onClick={() => s.checkIn(fecha, b.id)}>
          🎓 Check-in
        </button>
      </div>
    )
  }

  if (b.estado !== 'activo') return null

  const esperaRestante = b.salidaSolicitada ? ESPERA_SALIDA_MS - (ahora - b.salidaSolicitada) : 0
  return (
    <div className="temporizador">
      <div className="reloj-grande">{fmtReloj(restante)}</div>
      <small>para el final de la clase</small>
      <Barra pct={(min - c.inicio) / (c.fin - c.inicio)} marca={0.5} />

      <p className="paso">
        {b.sigueAhi
          ? '✔ Confirmaste a mitad de clase (+5 XP)'
          : min < c.mitad
            ? `👀 A las ${minAHhmm(c.mitad)} te preguntaré "¿Sigues ahí?"`
            : min < c.mitad + VENTANA_SIGUE_AHI
              ? '👀 ¡Responde "Sigo aquí"!'
              : '✖ No respondiste "¿Sigues ahí?"'}
      </p>

      <button className="btn btn-grande btn-verde" disabled={min < c.abreCheckOut} onClick={() => s.checkOut(fecha, b.id)}>
        {min < c.abreCheckOut ? `🏁 Check-out desde ${minAHhmm(c.abreCheckOut)}` : '🏁 Check-out'}
      </button>

      {!b.salidaSolicitada && min < c.abreCheckOut && (
        <button className="btn btn-rojo" onClick={() => s.pedirSalida(fecha, b.id)}>
          Quiero salirme antes
        </button>
      )}
      {b.salidaSolicitada && (
        <div className="confirmar">
          {esperaRestante > 0 ? (
            <p>
              Espera <b>{fmtReloj(esperaRestante)}</b> antes de salir. Quédate; a veces la clase mejora.
            </p>
          ) : (
            <p>Pasaron los 15 minutos. Si sales ahora, la clase no da XP.</p>
          )}
          <div className="botones">
            <button className="btn btn-verde" onClick={() => s.cancelarSalida(fecha, b.id)}>
              Me quedo
            </button>
            <button className="btn btn-rojo" disabled={esperaRestante > 0} onClick={() => s.confirmarSalida(fecha, b.id)}>
              Salir sin XP
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function PanelEvento({ fecha, b, min }: { fecha: string; b: Bloque; min: number }) {
  const s = useJuego()
  if (b.estado !== 'pendiente') return null
  if (b.opcional && !b.aceptado) {
    return (
      <div className="botones">
        <button className="btn btn-oro" onClick={() => s.decidirOpcional(fecha, b.id, true)}>
          Voy
        </button>
        <button className="btn" onClick={() => s.decidirOpcional(fecha, b.id, false)}>
          No voy
        </button>
      </div>
    )
  }
  const abre = b.inicio - 15
  return (
    <div className="botones">
      <button className="btn btn-grande btn-verde" disabled={min < abre} onClick={() => s.asistir(fecha, b.id)}>
        {min < abre ? `✔ Hecho (desde ${minAHhmm(abre)})` : b.familia ? '✔ Hecho' : '✔ Asistí'}
      </button>
      <NoPude fecha={fecha} b={b} />
    </div>
  )
}
