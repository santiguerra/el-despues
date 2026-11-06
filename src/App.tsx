import { useRef, useState } from 'react'
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
import { Icono, type NombreIcono } from './ui/Icono'
import { Celebraciones } from './ui/Celebraciones'
import { gsap, reducido, useGSAP } from './ui/animar'

type Pestana = 'hoy' | 'plantilla' | 'progreso' | 'tienda' | 'ajustes'

const PESTANAS: { id: Pestana; icono: NombreIcono; nombre: string }[] = [
  { id: 'hoy', icono: 'hoy', nombre: 'Hoy' },
  { id: 'plantilla', icono: 'semana', nombre: 'Semana' },
  { id: 'progreso', icono: 'progreso', nombre: 'Progreso' },
  { id: 'tienda', icono: 'tienda', nombre: 'Tienda' },
  { id: 'ajustes', icono: 'ajustes', nombre: 'Ajustes' },
]

export default function App() {
  const ahora = useAhora()
  const [pestana, setPestana] = useState<Pestana>('hoy')
  useMotor(ahora, (p) => PESTANAS.some((x) => x.id === p) && setPestana(p as Pestana))
  const desfase = useJuego((s) => s.ajustes.desfaseMin)
  const [abierto, setAbierto] = useState<string | null>(null)
  const fecha = fechaLocal(ahora)
  const raiz = useRef<HTMLDivElement>(null)

  // Cada pestaña entra con sus tarjetas en cascada; el ícono activo da un brinco.
  useGSAP(
    () => {
      if (reducido()) return
      gsap.from('.contenido > .pantalla > *', {
        y: 22,
        autoAlpha: 0,
        duration: 0.5,
        stagger: 0.045,
        ease: 'back.out(1.7)',
        clearProps: 'transform,opacity,visibility',
      })
      gsap.from('.linea-tiempo > .fila, .rejilla-cosmeticos > *, .recompensa', {
        x: -18,
        autoAlpha: 0,
        duration: 0.35,
        stagger: 0.03,
        delay: 0.2,
        ease: 'power2.out',
        clearProps: 'transform,opacity,visibility',
      })
      gsap.from('.fila-resumen .relleno', { width: 0, duration: 0.9, stagger: 0.05, delay: 0.25, ease: 'power3.out' })
      gsap.to('.ahora:not(.activa) .cta', { scale: 1.06, duration: 0.55, yoyo: true, repeat: -1, repeatDelay: 1.4, ease: 'sine.inOut' })
      gsap.fromTo('.navegacion .activa .icono', { y: 0, scale: 0.6 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1.2, 0.4)' })
      gsap.fromTo('.navegacion .activa .icono', { y: 0 }, { y: -6, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' })
    },
    { scope: raiz, dependencies: [pestana] },
  )

  return (
    <div ref={raiz} className="app">
      <Cabecera ahora={ahora} />
      {desfase !== 0 && (
        <div className="banda-prueba">
          <Icono n="prueba" size={16} /> Reloj simulado: {fecha} {minAHhmm(minutosDelDia(ahora))}
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
            <span className="icono">
              <Icono n={p.icono} size={26} weight={pestana === p.id ? 'fill' : 'bold'} />
            </span>
            {p.nombre}
          </button>
        ))}
      </nav>
      {abierto && <VistaBloque fecha={fecha} id={abierto} ahora={ahora} cerrar={() => setAbierto(null)} />}
      <ModalSigueAhi ahora={ahora} />
      <Avisos />
      <Celebraciones />
    </div>
  )
}
