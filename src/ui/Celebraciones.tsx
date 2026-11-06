// Celebraciones: cada logro tiene su momento en pantalla (y el botín vuela a la cabecera).
import { useEffect, useRef, useState } from 'react'
import { reloj, useJuego, type Juego } from '../store'
import { fechaLocal } from '../logic/tiempo'
import { nivelDeXp } from '../logic/reglas'
import { cosmetico } from '../logic/cosmeticos'
import { fraseAvance } from '../logic/despues'
import { EDIFICIOS, ORDEN_EDIFICIOS, nivelesDe } from '../aldea/edificios'
import * as arte from '../aldea/arte'
import { Icono, urlSprite, type NombreIcono } from './Icono'
import { SplitText, confeti, gsap, reducido, ultimoToque, useGSAP, volar } from './animar'

type Tema = 'verde' | 'oro' | 'azul' | 'oscuro' | 'fuego'

interface Celebracion {
  id: number
  /** sello rápido que no bloquea la pantalla */
  chica?: boolean
  icono?: NombreIcono
  imagen?: string
  titulo: string
  sub?: string
  tema: Tema
  confeti?: boolean
}

let siguienteId = 1

function detectar(s: Juego, p: Juego): Omit<Celebracion, 'id'>[] {
  const nuevas: Omit<Celebracion, 'id'>[] = []
  const fecha = fechaLocal(reloj(s.ajustes))
  const antes = new Map((p.dias[fecha]?.bloques ?? []).map((b) => [b.id, b.estado]))
  let completados = 0
  for (const b of s.dias[fecha]?.bloques ?? []) {
    const previo = antes.get(b.id)
    if (b.estado !== 'completado' || !previo || previo === 'completado') continue
    completados++
    if (b.esRana)
      nuevas.push({ imagen: urlSprite('rana'), titulo: '¡Rana vencida!', sub: `${b.titulo} · botín doble`, tema: 'verde', confeti: true })
    else nuevas.push({ chica: true, icono: 'ok', titulo: `+${b.xp ?? 0} XP`, tema: 'verde' })
  }
  if (completados) {
    const na = nivelesDe(p.dias)
    const nb = nivelesDe(s.dias)
    for (const id of ORDEN_EDIFICIOS)
      if (nb[id] > na[id])
        nuevas.push({
          imagen: arte.texturaEdificio(id, nb[id]).toDataURL(),
          titulo: `${EDIFICIOS[id].nombre}`,
          sub: `sube a nivel ${nb[id]}`,
          tema: 'azul',
          confeti: true,
        })
  }
  const nivel = nivelDeXp(s.jugador.xp)
  if (nivel > nivelDeXp(p.jugador.xp)) nuevas.push({ icono: 'corona', titulo: `¡Nivel ${nivel}!`, sub: 'El Reino del Ahora se fortalece', tema: 'oro', confeti: true })
  if (s.jugador.racha > p.jugador.racha && s.jugador.racha > 0)
    nuevas.push({ icono: 'racha', titulo: `Racha de ${s.jugador.racha}`, sub: 'Día cumplido', tema: 'fuego', confeti: true })
  if (s.cosmeticos.comprados.length > p.cosmeticos.comprados.length) {
    const c = cosmetico(s.cosmeticos.comprados[s.cosmeticos.comprados.length - 1])
    if (c) nuevas.push({ imagen: vistaCosmetico(c.id), icono: 'brillo', titulo: '¡Nuevo!', sub: c.nombre, tema: 'azul', confeti: true })
  }
  if (s.despues.sombra > p.despues.sombra)
    nuevas.push({ imagen: urlSprite('despues'), titulo: 'El Después avanza', sub: fraseAvance(s.despues.avances), tema: 'oscuro' })
  return nuevas
}

function vistaCosmetico(id: string): string | undefined {
  const c = cosmetico(id)
  if (!c) return
  if (c.ranura === 'capa') return arte.guardian(c.colores).quieto.toDataURL()
  if (c.ranura === 'sombrero') return arte.sombreros[c.id]?.().toDataURL()
  if (c.ranura === 'mascota') return arte.mascotas[c.id]?.()[0].toDataURL()
  if (c.ranura === 'estandarte') return arte.bandera(c.colores).toDataURL()
}

export function Celebraciones() {
  const [cola, setCola] = useState<Celebracion[]>([])
  const fichaMoneda = useRef<HTMLSpanElement>(null)
  const fichaXp = useRef<HTMLSpanElement>(null)

  useEffect(
    () =>
      useJuego.subscribe((s, p) => {
        // botín que vuela hacia la cabecera
        const dxp = s.jugador.xp - p.jugador.xp
        const dm = s.jugador.monedas - p.jugador.monedas
        const desde = ultimoToque.x ? ultimoToque : { x: innerWidth / 2, y: innerHeight / 2 }
        if (dxp > 0) volar(fichaXp.current!, Math.min(6, Math.ceil(dxp / 8)), desde, document.querySelector('.cabecera .xp'))
        if (dm > 0) setTimeout(() => volar(fichaMoneda.current!, Math.min(8, dm), desde, document.querySelector('.cabecera .monedas')), 150)

        const nuevas = detectar(s, p)
        if (nuevas.length) setCola((c) => [...c, ...nuevas.map((n) => ({ ...n, id: siguienteId++ }))])
      }),
    [],
  )

  const actual = cola[0]
  return (
    <>
      <div className="plantillas-fichas" aria-hidden>
        <span ref={fichaMoneda} className="ficha ficha-moneda">
          <Icono n="moneda" size={18} />
        </span>
        <span ref={fichaXp} className="ficha ficha-xp">
          <Icono n="xp" size={18} />
        </span>
      </div>
      {actual && <Escenario key={actual.id} c={actual} fin={() => setCola((c) => c.slice(1))} />}
    </>
  )
}

function Escenario({ c, fin }: { c: Celebracion; fin: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const tl = useRef<gsap.core.Timeline | null>(null)

  useGSAP(
    () => {
      const raiz = ref.current!
      const centro = () => {
        const r = raiz.querySelector('.celebra-insignia, .sello')!.getBoundingClientRect()
        return [r.left + r.width / 2, r.top + r.height / 2] as const
      }
      const t = gsap.timeline({ onComplete: fin })
      tl.current = t
      if (reducido()) t.timeScale(3)

      if (c.chica) {
        t.from('.sello', { scale: 0, rotation: -40, duration: 0.45, ease: 'back.out(2.6)' })
          .add(() => confeti(...centro(), 22), '<0.15')
          .from('.sello-texto', { y: 14, autoAlpha: 0, duration: 0.3, ease: 'back.out(2)' }, '<')
          .to(raiz, { autoAlpha: 0, y: -20, duration: 0.3, delay: 0.75 })
        return
      }

      const letras = SplitText.create('.celebra-titulo', { type: 'chars' })
      gsap.to('.celebra-rayos', { rotation: '+=360', duration: 14, repeat: -1, ease: 'none' })
      t.from('.celebra-fondo', { autoAlpha: 0, duration: 0.25 })
        .from('.celebra-rayos', { scale: 0, duration: 0.6, ease: 'back.out(1.6)' }, '<')
        .from('.celebra-insignia', { scale: 0, rotation: -25, duration: 0.8, ease: 'elastic.out(1, 0.45)' }, '<0.05')
        .add(() => {
          if (c.confeti) confeti(...centro(), 46)
          if (c.tema === 'oscuro') gsap.to('.celebra-insignia', { x: 10, duration: 0.8, ease: 'sacudir' })
        }, '<0.2')
        .from(letras.chars, { y: 40, autoAlpha: 0, rotation: 18, stagger: 0.03, duration: 0.45, ease: 'back.out(2.2)' }, '<0.1')
        .from('.celebra-sub', { y: 12, autoAlpha: 0, duration: 0.35 }, '>-0.15')
        .from('.celebra-toca', { autoAlpha: 0, duration: 0.3 })
        .to('.celebra-insignia', { y: -8, duration: 0.9, ease: 'sine.inOut', yoyo: true, repeat: 1 })
        .to('.celebra-contenido', { scale: 0.85, autoAlpha: 0, duration: 0.3, ease: 'power2.in' })
        .to('.celebra-fondo', { autoAlpha: 0, duration: 0.25 }, '<')
    },
    { scope: ref },
  )

  const saltar = () => tl.current?.progress(1)

  if (c.chica)
    return (
      <div ref={ref} className="celebra-chica" aria-live="polite">
        <span className="sello">
          <Icono n={c.icono ?? 'ok'} size={56} />
        </span>
        <b className="sello-texto">{c.titulo}</b>
      </div>
    )

  return (
    <div ref={ref} className={`celebra tema-${c.tema}`} onClick={saltar} role="dialog" aria-label={c.titulo}>
      <div className="celebra-fondo" />
      <div className="celebra-contenido">
        <div className="celebra-escena">
          <div className="celebra-rayos" />
          <div className="celebra-insignia">
            {c.imagen ? <img src={c.imagen} alt="" className="pixelado" /> : <Icono n={c.icono ?? 'estrella'} size={88} />}
          </div>
        </div>
        <h2 className="celebra-titulo">{c.titulo}</h2>
        {c.sub && <p className="celebra-sub">{c.sub}</p>}
        <small className="celebra-toca">Toca para seguir</small>
      </div>
    </div>
  )
}

