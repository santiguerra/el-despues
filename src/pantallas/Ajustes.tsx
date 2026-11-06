import { useState } from 'react'
import { useJuego } from '../store'
import { pedirPermisoNotificaciones } from '../motor'

export function Ajustes() {
  const s = useJuego()
  const a = s.ajustes
  const [permiso, setPermiso] = useState(() => ('Notification' in window ? Notification.permission : 'no-soportado'))
  const [texto, setTexto] = useState('')
  const [reiniciando, setReiniciando] = useState(false)

  const exportar = async () => {
    const json = s.exportar()
    try {
      await navigator.clipboard.writeText(json)
      s.avisar('Copia de seguridad copiada al portapapeles.')
    } catch {
      setTexto(json)
    }
  }

  return (
    <div className="pantalla">
      <h1>Ajustes</h1>

      <section className="tarjeta formulario">
        <h3>Ritmo</h3>
        <div className="fila-campos">
          <label>
            Despertar (semana)
            <input type="time" value={a.despertarSemana} onChange={(e) => s.editarAjustes({ despertarSemana: e.target.value })} />
          </label>
          <label>
            Despertar (finde)
            <input type="time" value={a.despertarFinde} onChange={(e) => s.editarAjustes({ despertarFinde: e.target.value })} />
          </label>
        </div>
        <label>
          Luces apagadas
          <input type="time" value={a.horaLuces} onChange={(e) => s.editarAjustes({ horaLuces: e.target.value })} />
        </label>
        <div className="fila-campos">
          <label>
            Buffer entre bloques (min)
            <input type="number" min={0} step={5} value={a.buffer} onChange={(e) => s.editarAjustes({ buffer: Number(e.target.value) })} />
          </label>
          <label>
            Comidas al día (higiene)
            <input type="number" min={1} max={6} value={a.comidasMeta} onChange={(e) => s.editarAjustes({ comidasMeta: Number(e.target.value) })} />
          </label>
        </div>
        <label>
          Día cumplido desde: {Math.round(a.umbralCumplido * 100)}%
          <input
            type="range"
            min={50}
            max={100}
            step={5}
            value={a.umbralCumplido * 100}
            onChange={(e) => s.editarAjustes({ umbralCumplido: Number(e.target.value) / 100 })}
          />
        </label>
        <p className="nota">La hora del cierre (21:30) se edita como hito en la plantilla de cada día.</p>
      </section>

      <section className="tarjeta">
        <h3>🔔 Notificaciones</h3>
        <p className="nota">
          "¿Sigues ahí?" de las clases y recordatorios. Funcionan mientras la app esté abierta o en segundo plano reciente.
        </p>
        <p>Estado: {permiso === 'granted' ? '✔ activadas' : permiso === 'denied' ? '✖ bloqueadas (actívalas en el navegador)' : permiso}</p>
        {permiso === 'default' && (
          <button className="btn btn-oro" onClick={async () => setPermiso((await pedirPermisoNotificaciones()) as NotificationPermission)}>
            Activar notificaciones
          </button>
        )}
        <label className="check">
          <input type="checkbox" checked={!a.sinAvisoBloques} onChange={() => s.editarAjustes({ sinAvisoBloques: !a.sinAvisoBloques })} />
          Aviso 5 min antes de cada bloque
        </label>
        <label className="check">
          <input type="checkbox" checked={!a.sinAvisoRana} onChange={() => s.editarAjustes({ sinAvisoRana: !a.sinAvisoRana })} />
          Recordatorio a las 21:00 para elegir la Rana
        </label>
        <label className="check">
          <input type="checkbox" checked={!a.sinAvisoResumen} onChange={() => s.editarAjustes({ sinAvisoResumen: !a.sinAvisoResumen })} />
          Resumen semanal (domingo 15:00)
        </label>
      </section>

      <section className="tarjeta">
        <h3>🔊 Sonido</h3>
        <label className="check">
          <input type="checkbox" checked={!a.silencio} onChange={() => s.editarAjustes({ silencio: !a.silencio })} />
          Sonidos de la aldea
        </label>
      </section>

      <section className="tarjeta">
        <h3>🧪 Modo prueba: reloj simulado</h3>
        <p className="nota">Adelanta el reloj para probar check-ins, cierre, etc. Desfase: {a.desfaseMin} min.</p>
        <div className="botones">
          {[-60, -5, 5, 15, 60].map((m) => (
            <button key={m} className="btn btn-mini" onClick={() => s.editarAjustes({ desfaseMin: a.desfaseMin + m })}>
              {m > 0 ? `+${m}` : m}
            </button>
          ))}
          <button className="btn btn-mini" onClick={() => s.editarAjustes({ desfaseMin: 0 })}>
            Hora real
          </button>
        </div>
      </section>

      <section className="tarjeta formulario">
        <h3>💾 Datos</h3>
        <p className="nota">Todo vive en este celular (localStorage). Haz copias de vez en cuando.</p>
        <div className="botones">
          <button className="btn" onClick={exportar}>
            Exportar
          </button>
          <button
            className="btn"
            disabled={!texto.trim()}
            onClick={() => s.avisar(s.importar(texto) ? 'Datos importados.' : 'Ese texto no es una copia válida.', 'info')}
          >
            Importar
          </button>
        </div>
        <textarea rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Pega aquí una copia para importar" />
        {!reiniciando ? (
          <button className="btn btn-rojo" onClick={() => setReiniciando(true)}>
            Reiniciar todo
          </button>
        ) : (
          <div className="confirmar">
            <p>Se borran XP, monedas, rachas, días y tus cambios a la plantilla.</p>
            <div className="botones">
              <button
                className="btn btn-rojo"
                onClick={() => {
                  s.reiniciar()
                  setReiniciando(false)
                }}
              >
                Sí, reiniciar
              </button>
              <button className="btn" onClick={() => setReiniciando(false)}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>
      <p className="nota centro">El Después · Fase 4</p>
    </div>
  )
}
