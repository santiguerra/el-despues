import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import type { Bloque } from '../types'
import { Modal } from '../components/Modal'
import { CRONICA, TERRENOS } from '../logic/despues'
import { nivelDeXp } from '../logic/reglas'
import { useJuego } from '../store'
import { minAHhmm } from '../logic/tiempo'
import { ALTO, ANCHO, EscenaAldea, type Control } from './EscenaAldea'
import { EDIFICIOS, NIVEL_MAX, UMBRALES_NIVEL, edificioDe, estadistica, faltanParaNivel, nivelEdificio, type IdEdificio } from './edificios'
import { desbloquearAudio } from './sonido'

const ICONO: Record<Bloque['estado'], string> = { pendiente: '·', activo: '▶', completado: '✔', fallido: '✖', saltado: '—' }

interface Props {
  fecha: string
  /** con un modal abierto la aldea espera para animar */
  pausado: boolean
  abrir: (id: string) => void
}

export default function Aldea({ fecha, pausado, abrir }: Props) {
  const caja = useRef<HTMLDivElement>(null)
  const pausa = useRef(pausado)
  const [elegido, setElegido] = useState<IdEdificio | null>(null)
  const [cronica, setCronica] = useState(false)
  const dias = useJuego((s) => s.dias)
  const sombra = useJuego((s) => s.despues.sombra)
  const activo = dias[fecha]?.bloques.find((b) => b.estado === 'activo')

  useEffect(() => {
    pausa.current = pausado
  }, [pausado])

  useEffect(() => {
    const raiz = caja.current
    if (!raiz) return
    const lienzo = document.createElement('div')
    lienzo.className = 'aldea-phaser'
    raiz.appendChild(lienzo)
    const ctrl: Control = {
      alTocar: (id) => setElegido((e) => (e === id ? null : id)),
      pausado: () => pausa.current,
    }
    const juego = new Phaser.Game({
      type: Phaser.AUTO,
      parent: lienzo,
      width: ANCHO,
      height: ALTO,
      pixelArt: true,
      backgroundColor: '#bfeaff',
      banner: false,
      audio: { noAudio: true },
      input: { touch: { capture: false } },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
    })
    juego.scene.add('aldea', EscenaAldea, true, ctrl)
    if (import.meta.env.DEV) (window as unknown as { aldea: Phaser.Game }).aldea = juego
    window.addEventListener('pointerdown', desbloquearAudio, { once: true, capture: true })
    return () => {
      window.removeEventListener('pointerdown', desbloquearAudio, { capture: true })
      juego.destroy(true)
      lienzo.remove()
    }
  }, [])

  const info = elegido ? EDIFICIOS[elegido] : null
  const est = elegido ? estadistica(elegido, dias, fecha) : null

  return (
    <section className="aldea">
      <div ref={caja} className="aldea-lienzo" role="img" aria-label="Aldea del Reino del Ahora" />
      <div className="aldea-pie">
        <p className="aldea-estado">
          {activo ? (
            <>
              {activo.esRana ? '🐸 Peleando contra la Rana desde ' : '⚔ En expedición desde '}
              <b>{EDIFICIOS[edificioDe(activo)].nombre}</b>
            </>
          ) : sombra > 0 ? (
            <>
              🌑 El Después cubre <b>{sombra} de {TERRENOS}</b> terrenos. Cumplir bloques lo hace retroceder.
            </>
          ) : (
            'Toca un edificio para ver sus expediciones.'
          )}
        </p>
        <button className="btn btn-mini" onClick={() => setCronica(true)}>
          📜 Crónica
        </button>
      </div>
      {cronica && <Cronica cerrar={() => setCronica(false)} />}

      {info && est && elegido && (
        <div className="tarjeta edificio-info">
          <div className="cabeza-edificio">
            <h3>{info.nombre}</h3>
            <button className="cerrar" onClick={() => setElegido(null)} aria-label="Cerrar">
              ✕
            </button>
          </div>
          <p className="nota">{info.lema}</p>
          <NivelEdificio hechas={est.historico} />
          <div className="numeros">
            <div>
              <b>
                {est.hechos}/{est.total}
              </b>
              <small>hoy</small>
            </div>
            <div>
              <b>+{est.xp}</b>
              <small>XP hoy</small>
            </div>
            <div>
              <b>+{est.monedas}</b>
              <small>🪙 hoy</small>
            </div>
            <div>
              <b>{est.historico}</b>
              <small>en total</small>
            </div>
          </div>
          {est.bloques.length === 0 ? (
            <p className="nota">Hoy no salen expediciones desde aquí.</p>
          ) : (
            <ul className="lista-edificio">
              {est.bloques.map((b) => (
                <li key={b.id}>
                  <button className={`enlace estado-${b.estado}`} onClick={() => abrir(b.id)}>
                    <span className="hora">{minAHhmm(b.inicio)}</span>
                    <span className="icono-estado">{ICONO[b.estado]}</span>
                    <span>{b.titulo}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

function NivelEdificio({ hechas }: { hechas: number }) {
  const nivel = nivelEdificio(hechas)
  const faltan = faltanParaNivel(hechas)
  const desde = UMBRALES_NIVEL[nivel - 1]
  const hasta = UMBRALES_NIVEL[nivel] ?? desde
  const pct = faltan === null ? 100 : ((hechas - desde) / (hasta - desde)) * 100
  return (
    <div className="nivel-edificio">
      <div className="fila-resumen-texto">
        <b>
          Nivel {nivel}
          {nivel === NIVEL_MAX && ' · máximo'}
        </b>
        <small>{faltan === null ? '⭐ Edificio completo' : `${faltan} expedición(es) para nivel ${nivel + 1}`}</small>
      </div>
      <div className="barra">
        <div className="relleno" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Cronica({ cerrar }: { cerrar: () => void }) {
  const xp = useJuego((s) => s.jugador.xp)
  const d = useJuego((s) => s.despues)
  const nivel = nivelDeXp(xp)
  return (
    <Modal titulo="📜 Crónica del Reino del Ahora" cerrar={cerrar}>
      {CRONICA.map((c) =>
        nivel >= c.nivel ? (
          <section key={c.titulo} className="capitulo">
            <h3>{c.titulo}</h3>
            <p>{c.texto}</p>
          </section>
        ) : (
          <section key={c.titulo} className="capitulo bloqueado">
            <h3>🔒 Capítulo sellado</h3>
            <p className="nota">Se revela al llegar al nivel {c.nivel}.</p>
          </section>
        ),
      )}
      <p className="nota">
        El Después ha avanzado {d.avances} vez(es) y ha retrocedido {d.retrocesos}. Hoy cubre {d.sombra} de {TERRENOS} terrenos.
      </p>
    </Modal>
  )
}
