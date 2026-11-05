import { useState } from 'react'
import { useAhora, useMotor } from './motor'
import { useJuego } from './store'
import { Cabecera } from './components/Cabecera'
import { Avisos } from './components/Avisos'
import { ModalSigueAhi } from './components/ModalSigueAhi'
import { Hoy } from './pantallas/Hoy'
import { VistaBloque } from './pantallas/VistaBloque'
import { Plantilla } from './pantallas/Plantilla'
import { Habitos } from './pantallas/Habitos'
import { Tienda } from './pantallas/Tienda'
import { Ajustes } from './pantallas/Ajustes'
import { fechaLocal, minAHhmm, minutosDelDia } from './logic/tiempo'

type Pestana = 'hoy' | 'plantilla' | 'habitos' | 'tienda' | 'ajustes'

const PESTANAS: { id: Pestana; icono: string; nombre: string }[] = [
  { id: 'hoy', icono: '⚔', nombre: 'Hoy' },
  { id: 'plantilla', icono: '🗓', nombre: 'Semana' },
  { id: 'habitos', icono: '🔥', nombre: 'Hábitos' },
  { id: 'tienda', icono: '🪙', nombre: 'Tienda' },
  { id: 'ajustes', icono: '⚙', nombre: 'Ajustes' },
]

export default function App() {
  const ahora = useAhora()
  useMotor(ahora)
  const desfase = useJuego((s) => s.ajustes.desfaseMin)
  const [pestana, setPestana] = useState<Pestana>('hoy')
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
        {pestana === 'hoy' && <Hoy ahora={ahora} abrir={setAbierto} />}
        {pestana === 'plantilla' && <Plantilla ahora={ahora} />}
        {pestana === 'habitos' && <Habitos ahora={ahora} />}
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
