import { useState } from 'react'
import { useAhora, useMotor } from './motor'
import { useJuego } from './store'
import { Cabecera } from './components/Cabecera'
import { Avisos } from './components/Avisos'
import { ModalSigueAhi } from './components/ModalSigueAhi'
import { Hoy } from './pantallas/Hoy'
import { VistaBloque } from './pantallas/VistaBloque'
import { Plantilla } from './pantallas/Plantilla'
import { Progreso } from './pantallas/Progreso'
import { Tienda } from './pantallas/Tienda'
import { Ajustes } from './pantallas/Ajustes'
import { fechaLocal, minAHhmm, minutosDelDia } from './logic/tiempo'

type Pestana = 'hoy' | 'plantilla' | 'progreso' | 'tienda' | 'ajustes'

const PESTANAS: { id: Pestana; icono: string; nombre: string }[] = [
  { id: 'hoy', icono: '⚔', nombre: 'Hoy' },
  { id: 'plantilla', icono: '🗓', nombre: 'Semana' },
  { id: 'progreso', icono: '📊', nombre: 'Progreso' },
  { id: 'tienda', icono: '🪙', nombre: 'Tienda' },
  { id: 'ajustes', icono: '⚙', nombre: 'Ajustes' },
]

export default function App() {
  const ahora = useAhora()
  const [pestana, setPestana] = useState<Pestana>('hoy')
  useMotor(ahora, (p) => PESTANAS.some((x) => x.id === p) && setPestana(p as Pestana))
  const desfase = useJuego((s) => s.ajustes.desfaseMin)
  const [abierto, setAbierto] = useState<string | null>(null)
  const fecha = fechaLocal(ahora)

  return (
    <div className="app">
      <Cabecera ahora={ahora} />
      {desfase !== 0 && (
        <div className="banda-prueba">
          🧪 Reloj simulado: {fecha} {minAHhmm(minutosDelDia(ahora))}
        </div>
      )}
      <main className="contenido">
        {pestana === 'hoy' && <Hoy ahora={ahora} abrir={setAbierto} pausado={abierto !== null} />}
        {pestana === 'plantilla' && <Plantilla ahora={ahora} />}
        {pestana === 'progreso' && <Progreso ahora={ahora} />}
        {pestana === 'tienda' && <Tienda />}
        {pestana === 'ajustes' && <Ajustes />}
      </main>
      <nav className="navegacion">
        {PESTANAS.map((p) => (
          <button key={p.id} className={pestana === p.id ? 'activa' : ''} onClick={() => (setPestana(p.id), window.scrollTo(0, 0))}>
            <span className="icono">{p.icono}</span>
            {p.nombre}
          </button>
        ))}
      </nav>
      {abierto && <VistaBloque fecha={fecha} id={abierto} ahora={ahora} cerrar={() => setAbierto(null)} />}
      <ModalSigueAhi ahora={ahora} />
      <Avisos />
    </div>
  )
}
