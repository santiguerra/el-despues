import { useEffect, useRef } from 'react'
import { useJuego, type Aviso } from '../store'
import { Icono, SimboloIcono } from '../ui/Icono'
import { contar, gsap, useGSAP } from '../ui/animar'

export function Avisos() {
  const avisos = useJuego((s) => s.avisos)
  return (
    <div className="avisos" aria-live="polite">
      {avisos.map((a) => (
        <Toast key={a.id} a={a} />
      ))}
    </div>
  )
}

function Toast({ a }: { a: Aviso }) {
  const ref = useRef<HTMLButtonElement>(null)
  const quitar = useJuego((s) => s.quitarAviso)

  const { contextSafe } = useGSAP(
    () => {
      gsap.from(ref.current, { y: -40, scale: 0.85, autoAlpha: 0, duration: 0.55, ease: 'back.out(2.2)' })
      gsap.from('.aviso-icono', { scale: 0, rotation: -60, duration: 0.7, delay: 0.1, ease: 'elastic.out(1, 0.4)' })
      gsap.from('.chip', { scale: 0, duration: 0.5, delay: 0.25, stagger: 0.08, ease: 'back.out(3)' })
      const [xp, mon] = ref.current!.querySelectorAll<HTMLElement>('.chip b')
      if (a.xp) contar(xp, 0, a.xp, 0.7, 0.3)
      if (a.monedas) contar(mon, 0, a.monedas, 0.7, 0.4)
    },
    { scope: ref },
  )

  const cerrar = contextSafe(() =>
    gsap.to(ref.current, { y: -24, autoAlpha: 0, scale: 0.9, duration: 0.25, ease: 'power2.in', onComplete: () => quitar(a.id) }),
  )

  useEffect(() => {
    const t = setTimeout(cerrar, a.tipo === 'alerta' ? 5200 : 3800)
    return () => clearTimeout(t)
  }, [cerrar, a.tipo])

  return (
    <button ref={ref} className={`aviso aviso-${a.tipo}`} onClick={cerrar}>
      {a.icono && (
        <span className="aviso-icono">
          <SimboloIcono s={a.icono} size={20} />
        </span>
      )}
      <span className="aviso-texto">{a.texto}</span>
      {(a.xp || a.monedas) && (
        <span className="chips">
          {!!a.xp && (
            <span className="chip chip-xp">
              <Icono n="xp" size={14} />+<b>{a.xp}</b>
            </span>
          )}
          {!!a.monedas && (
            <span className="chip chip-moneda">
              <Icono n="moneda" size={14} />+<b>{a.monedas}</b>
            </span>
          )}
        </span>
      )}
    </button>
  )
}
