import { useEffect } from 'react'
import { useJuego } from '../store'

export function Avisos() {
  const avisos = useJuego((s) => s.avisos)
  const quitar = useJuego((s) => s.quitarAviso)

  useEffect(() => {
    if (!avisos.length) return
    const t = setTimeout(() => quitar(avisos[0].id), 3800)
    return () => clearTimeout(t)
  }, [avisos, quitar])

  return (
    <div className="avisos" aria-live="polite">
      {avisos.map((a) => (
        <button key={a.id} className={`aviso aviso-${a.tipo}`} onClick={() => quitar(a.id)}>
          {a.texto}
        </button>
      ))}
    </div>
  )
}
