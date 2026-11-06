import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { reloj, useJuego } from './store'
import { fechaLocal } from './logic/tiempo'
import '@fontsource-variable/nunito'
import './estilos.css'
import { activarRebotes } from './ui/animar'

// Genera el día antes del primer pintado para evitar parpadeos.
const s = useJuego.getState()
// En desarrollo, el store queda a mano para probar desde la consola.
if (import.meta.env.DEV) (window as unknown as { juego: typeof useJuego }).juego = useJuego
s.asegurarDia(fechaLocal(reloj(s.ajustes)))

activarRebotes()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
