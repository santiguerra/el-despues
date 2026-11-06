// La Crónica como libro ilustrado: cada capítulo es una escena animada en pixel art
// (GSAP) con una sola línea de texto. Los capítulos se desbloquean subiendo de nivel.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useJuego } from '../store'
import { CRONICA, ORDEN_TERRENOS, TERRENOS, type IdEscena } from '../logic/despues'
import { nivelDeXp } from '../logic/reglas'
import { Icono, Sprite } from '../ui/Icono'
import { SplitText, gsap, reducido, useGSAP } from '../ui/animar'
import * as arte from './arte'
import { PLANOS } from './arte'
import { ORDEN_EDIFICIOS, type IdEdificio } from './edificios'

const ANCHO = 180
const BASE = 70
const POS_X: Record<IdEdificio, number> = { torre: 4, forja: 30, campamento: 76, taller: 108, taberna: 144 }
const COLORES = ['#58cc02', '#ffc800', '#1cb0f6', '#ff4b4b', '#ff9600', '#ffffff']

// ---------- imágenes (canvas → dataURL, una sola vez) ----------

const cache = new Map<string, string>()
function img(clave: string, crear: () => HTMLCanvasElement) {
  let u = cache.get(clave)
  if (!u) cache.set(clave, (u = crear().toDataURL()))
  return u
}
const IMG = {
  edificio: (id: IdEdificio, nivel = 1) => img(`ed-${id}-${nivel}`, () => arte.texturaEdificio(id, nivel)),
  guardian: () => img('guardian', () => arte.guardian().quieto),
  rana: () => img('rana', arte.rana),
  despues: () => img('despues', arte.despues),
  fogata: () => img('fogata', arte.fogata),
  llama: () => img('llama', arte.llama),
  moneda: () => img('moneda', arte.moneda),
  colinas: () => img('colinas', () => arte.colinas(ANCHO)),
  sol: () => img('sol', arte.sol),
  luna: () => img('luna', arte.luna),
  nube: () => img('nube', arte.nube),
  bandera: () => img('bandera', () => arte.bandera()),
  corona: () => img('corona', arte.sombreros.corona),
}

// ---------- piezas del escenario ----------

function P({ src, x, y, className = '', style }: { src: string; x: number; y: number; className?: string; style?: CSSProperties }) {
  return <img src={src} alt="" className={`capa ${className}`} style={{ left: x, top: y, ...style }} draggable={false} />
}

function Paisaje({ cielo = '#bfeaff', suelo = '#89e219', camino = true }: { cielo?: string; suelo?: string; camino?: boolean }) {
  return (
    <>
      <div className="cielo" style={{ background: cielo }} />
      <P src={IMG.colinas()} x={0} y={40} className="colinas" />
      <div className="suelo" style={{ background: suelo }} />
      {camino && <div className="camino" />}
    </>
  )
}

function Aldea({ nivel = 1, className = 'edif', sin = [] as IdEdificio[] }: { nivel?: number; className?: string; sin?: IdEdificio[] }) {
  return (
    <>
      {ORDEN_EDIFICIOS.filter((id) => !sin.includes(id)).map((id) => (
        <P key={id} src={IMG.edificio(id, nivel)} x={POS_X[id]} y={BASE - PLANOS[id].h} className={`${className} ed-${id}`} />
      ))}
    </>
  )
}

function Fogata({ x, y }: { x: number; y: number }) {
  return (
    <>
      <P src={IMG.fogata()} x={x - 5} y={y - 4} className="fogata" />
      <P src={IMG.llama()} x={x - 2} y={y - 10} className="llama" />
    </>
  )
}

function Estrellas({ n = 22 }: { n?: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <i key={i} className="estrella" style={{ left: (i * 47) % ANCHO, top: (i * 29) % 44 }} />
      ))}
    </>
  )
}

/** Chispas con física dentro del escenario (coordenadas del mundo). */
function chispas(mundo: HTMLElement | null, x: number, y: number, n = 14, fuerza = 70, colores = COLORES, imagen?: string) {
  if (!mundo || reducido()) return
  for (let i = 0; i < n; i++) {
    const d = imagen ? Object.assign(document.createElement('img'), { src: imagen }) : document.createElement('i')
    d.className = imagen ? 'capa' : 'chispa'
    d.style.left = `${x}px`
    d.style.top = `${y}px`
    if (!imagen) d.style.background = colores[i % colores.length]
    mundo.appendChild(d)
    gsap.to(d, {
      physics2D: { velocity: fuerza * (0.4 + Math.random() * 0.6), angle: imagen ? 200 + Math.random() * 140 : Math.random() * 360, gravity: imagen ? 260 : 90 },
      duration: 0.7 + Math.random() * 0.6,
      onComplete: () => d.remove(),
    })
    gsap.to(d, { opacity: 0, duration: 0.3, delay: 0.6 })
  }
}

// ---------- escenas ----------

type Q = (sel: string) => Element[]
interface Escena {
  dibujo: () => ReactNode
  animar: (tl: gsap.core.Timeline, q: Q, mundo: HTMLElement) => void
}

const parpadeoFuego = (q: Q) =>
  gsap.to(q('.llama'), { scaleY: 1.25, scaleX: 0.85, duration: 0.18, yoyo: true, repeat: -1, ease: 'sine.inOut', transformOrigin: '50% 100%' })

const ESCENAS: Record<IdEscena, Escena> = {
  reino: {
    dibujo: () => (
      <>
        <Paisaje />
        <P src={IMG.sol()} x={18} y={8} className="sol" />
        <P src={IMG.nube()} x={60} y={12} className="nube" />
        <Aldea />
        <Fogata x={101} y={80} />
        <P src={IMG.guardian()} x={-14} y={72} className="g" />
      </>
    ),
    animar: (tl, q, mundo) => {
      parpadeoFuego(q)
      gsap.to(q('.nube'), { x: 60, duration: 20, ease: 'none', repeat: -1, yoyo: true })
      tl.from(q('.fogata, .llama'), { scale: 0, duration: 0.4, ease: 'back.out(3)', transformOrigin: '50% 100%' })
      q('.edif').forEach((el, i) => {
        tl.from(el, { y: 46, scaleY: 0.3, autoAlpha: 0, duration: 0.55, ease: 'back.out(2.2)', transformOrigin: '50% 100%' }, 0.35 + i * 0.28)
        const r = (el as HTMLElement).style
        tl.add(() => chispas(mundo, parseFloat(r.left) + 12, BASE - 2, 10, 50, ['#e9c890', '#ffffff', '#ffc800']), `<0.25`)
      })
      tl.to(q('.g'), { x: 100, duration: 1.8, ease: 'none' })
      tl.to(q('.g'), { y: '-=2', duration: 0.11, yoyo: true, repeat: 15, ease: 'power1.out' }, '<')
      tl.to(q('.g'), { y: '-=10', duration: 0.25, yoyo: true, repeat: 1, ease: 'power2.out' })
      tl.add(() => chispas(mundo, 93, 66, 18, 80))
    },
  },
  guardian: {
    dibujo: () => (
      <>
        <Paisaje cielo="#ffc3a1" />
        <Aldea className="edif silueta" />
        <Fogata x={128} y={86} />
        <P src={IMG.guardian()} x={70} y={70} className="g grande" />
      </>
    ),
    animar: (tl, q, mundo) => {
      parpadeoFuego(q)
      gsap.set(q('.g'), { scale: 3.2, transformOrigin: '50% 100%' })
      tl.from(q('.g'), { scale: 0, rotation: -20, duration: 0.9, ease: 'elastic.out(1, 0.45)' })
      tl.to(q('.g'), { y: -12, duration: 0.24, yoyo: true, repeat: 3, ease: 'power2.out' })
      tl.add(() => chispas(mundo, 75, 40, 20, 70, ['#58cc02', '#d7ffb8', '#ffc800']), '<0.2')
      tl.to(q('.g'), { rotation: 8, duration: 0.8, ease: 'sacudir' })
    },
  },
  despues: {
    dibujo: () => (
      <>
        <Paisaje cielo="#1b2a5c" suelo="#4c7a1a" />
        <Estrellas />
        <P src={IMG.luna()} x={150} y={8} />
        <Aldea className="edif noche" />
        {Array.from({ length: TERRENOS }, (_, t) => (
          <div key={t} className="terreno-sombra" style={{ left: t * 15 }} data-orden={ORDEN_TERRENOS.indexOf(t)} />
        ))}
        <P src={IMG.despues()} x={128} y={62} className="d" />
        <span className="susurro" style={{ left: 40, top: 30 }}>luego…</span>
        <span className="susurro" style={{ left: 96, top: 18 }}>mañana…</span>
        <span className="susurro" style={{ left: 18, top: 52 }}>después…</span>
      </>
    ),
    animar: (tl, q) => {
      gsap.to(q('.estrella'), { opacity: 0.3, duration: 0.8, stagger: { each: 0.15, repeat: -1, yoyo: true } })
      gsap.set(q('.d'), { scale: 2.6, transformOrigin: '50% 100%' })
      const tierras = q('.terreno-sombra').sort((a, b) => Number((a as HTMLElement).dataset.orden) - Number((b as HTMLElement).dataset.orden))
      tl.to(tierras, { opacity: 0.8, duration: 0.35, stagger: 0.16 })
      tl.from(q('.d'), { y: 30, autoAlpha: 0, duration: 1.1, ease: 'power2.out' }, 0.6)
      tl.to(q('.d'), { scaleY: 2.8, duration: 1, yoyo: true, repeat: -1, ease: 'sine.inOut' })
      tl.fromTo(q('.susurro'), { autoAlpha: 0, y: 8 }, { autoAlpha: 0.9, y: -6, duration: 1.2, stagger: 0.5, ease: 'sine.out' }, 0.8)
    },
  },
  rana: {
    dibujo: () => (
      <>
        <Paisaje cielo="#ffe6b3" />
        <P src={IMG.sol()} x={150} y={30} />
        <Aldea className="edif lejos" />
        <P src={IMG.guardian()} x={46} y={85} className="g" />
        <P src={IMG.rana()} x={112} y={88} className="r" />
        <div className="vida" style={{ left: 104, top: 52 }}>
          <div className="vida-relleno" />
        </div>
        <span className="por-dos" style={{ left: 112, top: 40 }}>×2</span>
      </>
    ),
    animar: (tl, q, mundo) => {
      gsap.set(q('.g'), { scale: 2.4, transformOrigin: '50% 100%' })
      gsap.set(q('.r'), { scale: 2.6, transformOrigin: '50% 100%' })
      gsap.set(q('.por-dos'), { autoAlpha: 0 })
      tl.from(q('.r'), { y: -40, duration: 0.6, ease: 'bounce.out' })
      tl.from(q('.vida'), { scaleX: 0, duration: 0.3, transformOrigin: '0 50%' })
      for (let i = 0; i < 4; i++) {
        tl.to(q('.g'), { x: 18, duration: 0.12, ease: 'power3.in' })
        tl.to(q('.r'), { filter: 'brightness(4)', duration: 0.05 })
        tl.add(() => chispas(mundo, 108, 78, 8, 60, ['#ffffff', '#ffc800']))
        tl.to(q('.vida-relleno'), { width: `${75 - i * 25}%`, duration: 0.25 }, '<')
        tl.to(q('.r'), { filter: 'brightness(1)', duration: 0.1 })
        tl.to(q('.g'), { x: 0, duration: 0.25, ease: 'power2.out' }, '<')
      }
      tl.to(q('.r'), { scale: 0, rotation: 200, duration: 0.4, ease: 'back.in(2)' })
      tl.to(q('.vida'), { autoAlpha: 0, duration: 0.2 }, '<')
      tl.add(() => {
        chispas(mundo, 120, 75, 12, 90, COLORES, IMG.moneda())
        setTimeout(() => chispas(mundo, 120, 75, 12, 90, COLORES, IMG.moneda()), 250)
      })
      tl.to(q('.por-dos'), { autoAlpha: 1, duration: 0.01 })
      tl.from(q('.por-dos'), { scale: 0, rotation: -30, duration: 0.6, ease: 'elastic.out(1, 0.4)' }, '<')
      tl.to(q('.g'), { y: -10, duration: 0.2, yoyo: true, repeat: 3, ease: 'power2.out' })
    },
  },
  teme: {
    dibujo: () => (
      <>
        <Paisaje cielo="#1b2a5c" />
        <Aldea className="edif noche" />
        <div className="luz" style={{ left: 66, top: 22 }} />
        <svg className="anillo" viewBox="0 0 60 60" style={{ left: 60, top: 18 }}>
          <circle cx="30" cy="30" r="26" className="anillo-fondo" />
          <circle cx="30" cy="30" r="26" className="anillo-tiempo" />
        </svg>
        <P src={IMG.guardian()} x={84.5} y={44} className="g" />
        <P src={IMG.despues()} x={140} y={62} className="d" />
      </>
    ),
    animar: (tl, q) => {
      gsap.set(q('.g'), { scale: 2, transformOrigin: '50% 100%' })
      gsap.set(q('.d'), { scale: 2.6, transformOrigin: '50% 100%' })
      const largo = 2 * Math.PI * 26
      gsap.set(q('.anillo-tiempo'), { strokeDasharray: largo, strokeDashoffset: largo })
      tl.from(q('.anillo'), { scale: 0, duration: 0.5, ease: 'back.out(2)', transformOrigin: '50% 50%' })
      tl.to(q('.anillo-tiempo'), { strokeDashoffset: 0, duration: 2.6, ease: 'none' })
      tl.to(q('.d'), { x: 34, scale: 1.2, autoAlpha: 0, duration: 2.4, ease: 'power1.in' }, '<')
      tl.to(q('.cielo'), { backgroundColor: '#bfeaff', duration: 2.6, ease: 'none' }, '<')
      tl.to(q('.luz'), { scale: 4, autoAlpha: 0.9, duration: 2.6, ease: 'power1.in' }, '<')
      tl.to(q('.edif'), { filter: 'brightness(1)', duration: 2.6 }, '<')
      tl.to(q('.g'), { y: -10, duration: 0.22, yoyo: true, repeat: 3, ease: 'power2.out' })
    },
  },
  completo: {
    dibujo: () => (
      <>
        <Paisaje />
        <P src={IMG.sol()} x={84} y={6} />
        <Aldea nivel={5} />
        <Fogata x={101} y={80} />
        <P src={IMG.guardian()} x={86} y={72} className="g" />
        <P src={IMG.corona()} x={88} y={67} className="corona" />
      </>
    ),
    animar: (tl, q, mundo) => {
      parpadeoFuego(q)
      tl.from(q('.edif'), { y: -14, autoAlpha: 0, duration: 0.5, stagger: 0.12, ease: 'bounce.out' })
      tl.from(q('.corona'), { y: -40, duration: 0.7, ease: 'bounce.out' })
      for (const [x, y] of [
        [30, 18],
        [140, 14],
        [86, 24],
        [55, 10],
        [120, 28],
      ])
        tl.add(() => chispas(mundo, x, y, 22, 60), '+=0.25')
      tl.to(q('.g, .corona'), { y: -8, duration: 0.2, yoyo: true, repeat: 5, ease: 'power2.out' }, '<')
    },
  },
}

// ---------- libro ----------

function Escenario({ escena, sellado, nivel, repeticion }: { escena: IdEscena; sellado: boolean; nivel: number; repeticion: number }) {
  const caja = useRef<HTMLDivElement>(null)
  const mundo = useRef<HTMLDivElement>(null)
  const [k, setK] = useState(1)

  useLayoutEffect(() => {
    const el = caja.current!
    const medir = () => setK(el.clientWidth / ANCHO)
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useGSAP(
    () => {
      if (sellado) return
      const q = gsap.utils.selector(mundo)
      const tl = gsap.timeline({ delay: 0.15 })
      ESCENAS[escena].animar(tl, q, mundo.current!)
      if (reducido()) tl.progress(1)
    },
    { scope: mundo, dependencies: [escena, sellado, repeticion], revertOnUpdate: true },
  )

  return (
    <div ref={caja} className={`escenario ${sellado ? 'sellado' : ''}`}>
      <div ref={mundo} key={`${escena}-${repeticion}`} className="mundo" style={{ transform: `scale(${k})` }}>
        {ESCENAS[escena].dibujo()}
      </div>
      {sellado && (
        <div className="sello-capitulo">
          <Icono n="candado" size={40} />
          <b>Nivel {nivel}</b>
        </div>
      )}
    </div>
  )
}

export function Libro({ cerrar }: { cerrar: () => void }) {
  const xp = useJuego((s) => s.jugador.xp)
  const d = useJuego((s) => s.despues)
  const nivel = nivelDeXp(xp)
  const [pagina, setPagina] = useState(0)
  const [repeticion, setRepeticion] = useState(0)
  const dir = useRef(1)
  const raiz = useRef<HTMLDivElement>(null)
  const toque = useRef<number | null>(null)
  const cap = CRONICA[pagina]
  const sellado = nivel < cap.nivel

  const ir = (n: number) => {
    if (n < 0 || n >= CRONICA.length) return
    dir.current = n > pagina ? 1 : -1
    setPagina(n)
  }

  useGSAP(() => gsap.from('.libro-hoja', { y: 60, autoAlpha: 0, duration: 0.5, ease: 'back.out(1.6)' }), { scope: raiz })
  useGSAP(
    () => {
      gsap.from('.escenario', { x: 50 * dir.current, autoAlpha: 0, duration: 0.35, ease: 'power2.out' })
      const partes = SplitText.create('.libro-texto', { type: 'words' })
      gsap.from(partes.words, { y: 14, autoAlpha: 0, duration: 0.4, stagger: 0.06, delay: 0.25, ease: 'back.out(2)' })
      gsap.from('.libro-titulo', { scale: 0.7, autoAlpha: 0, duration: 0.4, ease: 'back.out(2.5)' })
    },
    { scope: raiz, dependencies: [pagina], revertOnUpdate: true },
  )

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') ir(pagina + 1)
      if (e.key === 'ArrowLeft') ir(pagina - 1)
      if (e.key === 'Escape') cerrar()
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })

  return (
    <div ref={raiz} className="libro" role="dialog" aria-label="Crónica del Reino del Ahora">
      <div className="libro-fondo" onClick={cerrar} />
      <div
        className="libro-hoja"
        onPointerDown={(e) => (toque.current = e.clientX)}
        onPointerUp={(e) => {
          if (toque.current === null) return
          const dx = e.clientX - toque.current
          toque.current = null
          if (Math.abs(dx) > 40) ir(pagina + (dx < 0 ? 1 : -1))
        }}
      >
        <div className="libro-cabeza">
          <span className="libro-cap">
            <Icono n="cronica" size={18} /> Capítulo {pagina + 1}
          </span>
          <button className="cerrar" onClick={cerrar} aria-label="Cerrar">
            <Icono n="cerrar" size={22} weight="bold" />
          </button>
        </div>

        <Escenario escena={cap.escena} sellado={sellado} nivel={cap.nivel} repeticion={repeticion} />

        {sellado ? (
          <div key={`s${pagina}`} className="libro-pie">
            <h2 className="libro-titulo">
              <Icono n="candado" size={22} /> Capítulo sellado
            </h2>
            <p className="libro-texto">Sube al nivel {cap.nivel} para verlo.</p>
          </div>
        ) : (
          <div key={pagina} className="libro-pie">
            <h2 className="libro-titulo">{cap.titulo}</h2>
            <p className="libro-texto">{cap.texto}</p>
          </div>
        )}

        <div className="libro-nav">
          <button className="btn btn-mini" disabled={pagina === 0} onClick={() => ir(pagina - 1)} aria-label="Capítulo anterior">
            <Icono n="izq" size={18} weight="bold" />
          </button>
          <div className="puntos">
            {CRONICA.map((c, i) => (
              <button key={c.escena} className={`punto-pagina ${i === pagina ? 'activo' : ''} ${nivel < c.nivel ? 'bloqueado' : ''}`} onClick={() => ir(i)} aria-label={`Capítulo ${i + 1}`} />
            ))}
          </div>
          {!sellado && (
            <button className="btn btn-mini" onClick={() => setRepeticion((r) => r + 1)} aria-label="Ver de nuevo">
              <Icono n="recargar" size={18} weight="bold" />
            </button>
          )}
          <button className="btn btn-mini" disabled={pagina === CRONICA.length - 1} onClick={() => ir(pagina + 1)} aria-label="Capítulo siguiente">
            <Icono n="der" size={18} weight="bold" />
          </button>
        </div>

        <div className="marcador">
          <span className="marcador-lado">
            <Sprite n="despues" size={26} /> <b>{d.avances}</b>
          </span>
          <div className="terrenos-mini" aria-label={`El Después cubre ${d.sombra} de ${TERRENOS} terrenos`}>
            {Array.from({ length: TERRENOS }, (_, t) => (
              <i key={t} className={ORDEN_TERRENOS.slice(0, d.sombra).includes(t) ? 'oscuro' : ''} />
            ))}
          </div>
          <span className="marcador-lado">
            <b>{d.retrocesos}</b> <Icono n="sol" size={22} color="var(--oro)" />
          </span>
        </div>
      </div>
    </div>
  )
}
