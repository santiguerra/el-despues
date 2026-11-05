import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { reloj, useJuego } from './store'
import { fechaLocal } from './logic/tiempo'
import '@fontsource-variable/nunito'
import './estilos.css'

// Genera el día antes del primer pintado para evitar parpadeos.
const s = useJuego.getState()
s.asegurarDia(fechaLocal(reloj(s.ajustes)))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
