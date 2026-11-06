// Pixel art dibujado por código: cada sprite es un <canvas> pequeño que Phaser
// escala sin suavizado. Nada de archivos externos.
import type { IdEdificio } from './edificios'

const O = '#3c3c3c' // contorno
const PIEDRA = '#e8edf3'
const PIEDRA_SOMBRA = '#d3dbe6'
const PIEDRA_JUNTA = '#c3ccd8'
const GRIS = '#b5b5b5'
const GRIS_OSCURO = '#8a8a8a'
const MADERA = '#9a6331'
const MADERA_OSCURA = '#7a4a1f'
const MADERA_CLARA = '#e0a96d'
const TABLA = '#c98a4b'
const VIDRIO = '#4b6584'
const LUZ = '#ffd84d'
const ORO = '#ffc800'

interface Pintor {
  r: (x: number, y: number, w: number, h: number, c: string) => void
  px: (x: number, y: number, c: string) => void
  /** rectángulo con contorno de 1 px */
  caja: (x: number, y: number, w: number, h: number, relleno: string, borde?: string) => void
  img: (c: HTMLCanvasElement, x: number, y: number) => void
}

function lienzo(w: number, h: number, dibujar: (p: Pintor) => void): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  const r = (x: number, y: number, ww: number, hh: number, color: string) => {
    ctx.fillStyle = color
    ctx.fillRect(x, y, ww, hh)
  }
  dibujar({
    r,
    px: (x, y, color) => r(x, y, 1, 1, color),
    caja: (x, y, ww, hh, relleno, borde = O) => {
      r(x, y, ww, hh, borde)
      r(x + 1, y + 1, ww - 2, hh - 2, relleno)
    },
    img: (img, x, y) => ctx.drawImage(img, x, y),
  })
  return c
}

/** Sprite a partir de filas de caracteres; '.' es transparente. */
function mapa(filas: string[], paleta: Record<string, string>): HTMLCanvasElement {
  return lienzo(filas[0].length, filas.length, (p) =>
    filas.forEach((fila, y) => [...fila].forEach((ch, x) => ch !== '.' && p.px(x, y, paleta[ch]))),
  )
}

/** Techo en forma de trapecio/triángulo con tejas alternas. */
function techo(p: Pintor, y0: number, filas: number, ancho: number, arriba: number, color: string, teja: string, sombra?: string) {
  for (let k = 0; k < filas; k++) {
    const margen = Math.round((arriba * (filas - 1 - k)) / (filas - 1))
    const x = margen
    const w = ancho - margen * 2
    p.r(x, y0 + k, w, 1, O)
    if (k === filas - 1 || w <= 2) continue
    p.r(x + 1, y0 + k, w - 2, 1, k % 3 === 2 ? teja : color)
    if (sombra) p.r(Math.floor(ancho / 2), y0 + k, Math.ceil(w / 2) - 1, 1, k % 3 === 2 ? teja : sombra)
  }
}

/** Ventana con arco: esquinas superiores del color de la pared. */
function ventanaArco(p: Pintor, x: number, y: number, w: number, h: number, vidrio: string, pared: string) {
  p.caja(x, y, w, h, vidrio)
  p.px(x, y, pared)
  p.px(x + w - 1, y, pared)
  p.px(x + 1, y, O)
  p.px(x + w - 2, y, O)
}

export interface Plano {
  w: number
  h: number
  /** x de la puerta, relativa al edificio */
  puerta: number
  /** chimenea (para humo), relativa */
  chimenea?: [number, number]
  /** fila del borde inferior del techo (adorno dorado de nivel 4) */
  alero: number
  dibujar: (p: Pintor) => void
  /** ventanas que se encienden de noche */
  luces: (p: Pintor) => void
}

export const PLANOS: Record<IdEdificio, Plano> = {
  torre: {
    w: 22,
    h: 56,
    puerta: 11,
    alero: 19,
    dibujar: (p) => {
      // banderín
      p.r(11, 0, 1, 7, O)
      p.r(12, 0, 4, 1, '#58cc02')
      p.r(12, 1, 3, 1, '#58cc02')
      p.r(12, 2, 2, 1, '#58a700')
      // techo cónico
      for (let i = 0; i < 14; i++) {
        const mitad = 1 + Math.round((i * 10) / 13)
        p.r(11 - mitad, 6 + i, mitad * 2, 1, O)
        if (i === 13 || mitad < 2) continue
        p.r(12 - mitad, 6 + i, mitad - 1, 1, i % 4 === 3 ? '#1899d6' : '#1cb0f6')
        p.r(11, 6 + i, mitad - 1, 1, '#1899d6')
      }
      // cuerpo de piedra
      p.caja(2, 20, 18, 36, PIEDRA)
      p.r(15, 21, 4, 34, PIEDRA_SOMBRA)
      for (let y = 25; y < 54; y += 5) {
        p.r(3, y, 16, 1, PIEDRA_JUNTA)
        p.px(y % 10 === 0 ? 7 : 12, y - 2, PIEDRA_JUNTA)
      }
      ventanaArco(p, 8, 24, 6, 8, VIDRIO, PIEDRA)
      ventanaArco(p, 8, 35, 6, 8, VIDRIO, PIEDRA)
      p.r(10, 25, 1, 6, O)
      p.r(10, 36, 1, 6, O)
      // puerta con arco
      ventanaArco(p, 7, 46, 8, 10, MADERA, PIEDRA)
      p.r(10, 47, 1, 9, MADERA_OSCURA)
      p.px(13, 51, ORO)
    },
    luces: (p) => {
      p.r(9, 25, 1, 6, LUZ)
      p.r(11, 25, 2, 6, LUZ)
      p.r(9, 36, 1, 6, LUZ)
      p.r(11, 36, 2, 6, LUZ)
    },
  },
  forja: {
    w: 34,
    h: 32,
    puerta: 10,
    chimenea: [27, 0],
    alero: 15,
    dibujar: (p) => {
      p.caja(24, 2, 6, 12, GRIS)
      p.caja(23, 0, 8, 3, GRIS_OSCURO)
      techo(p, 6, 10, 34, 5, '#e8743b', '#c4561f', '#d9652c')
      p.caja(2, 15, 30, 17, '#f4e1c1')
      p.r(3, 27, 28, 4, GRIS)
      for (let x = 5; x < 30; x += 6) p.px(x, 28 + (x % 2), GRIS_OSCURO)
      p.r(16, 16, 1, 11, MADERA)
      // puerta
      p.caja(6, 20, 8, 12, MADERA)
      p.r(9, 21, 1, 10, MADERA_OSCURA)
      p.px(12, 26, ORO)
      // horno siempre encendido
      p.caja(19, 18, 10, 7, '#ff9600')
      p.r(21, 20, 6, 3, ORO)
      p.r(23, 21, 2, 1, '#fff4cc')
    },
    luces: (p) => {
      p.r(20, 19, 8, 5, '#ffb000')
      p.r(21, 20, 6, 3, LUZ)
    },
  },
  campamento: {
    w: 28,
    h: 20,
    puerta: 14,
    alero: 19,
    dibujar: (p) => {
      p.r(14, 0, 1, 3, O)
      for (let i = 0; i < 18; i++) {
        const mitad = 1 + Math.round((i * 13) / 17)
        p.r(14 - mitad, 2 + i, mitad * 2, 1, O)
        if (i === 17 || mitad < 2) continue
        p.r(15 - mitad, 2 + i, mitad - 1, 1, i % 5 === 4 ? '#89e219' : '#58cc02')
        p.r(14, 2 + i, mitad - 1, 1, '#58a700')
      }
      // entrada
      for (let j = 0; j < 9; j++) {
        const m = Math.round((j * 4) / 8)
        p.r(14 - m, 10 + j, m * 2 + 1, 1, '#2f2f2f')
      }
      p.r(13, 19, 3, 1, O)
    },
    luces: (p) => {
      for (let j = 3; j < 9; j++) {
        const m = Math.round((j * 4) / 8)
        p.r(14 - m, 10 + j, m * 2 + 1, 1, '#ff9f43')
      }
    },
  },
  taller: {
    w: 34,
    h: 32,
    puerta: 10,
    alero: 15,
    dibujar: (p) => {
      techo(p, 4, 12, 34, 7, '#b07cc6', '#8a55a3', '#9e68b6')
      // engranaje
      p.img(mapa(['..O.O..', '.OOOOO.', 'OOGGGOO', '.OGOGO.', 'OOGGGOO', '.OOOOO.', '..O.O..'], { O, G: '#d0d0d0' }), 14, 6)
      p.caja(2, 15, 30, 17, MADERA_CLARA)
      for (let x = 6; x < 31; x += 4) p.r(x, 16, 1, 15, TABLA)
      // portón con travesaño en X
      p.caja(4, 20, 12, 12, MADERA)
      for (let i = 0; i < 10; i++) {
        p.px(5 + i, 21 + i, MADERA_OSCURA)
        p.px(14 - i, 21 + i, MADERA_OSCURA)
      }
      p.caja(20, 19, 9, 7, VIDRIO)
      p.r(24, 20, 1, 5, O)
      p.r(21, 22, 7, 1, O)
    },
    luces: (p) => {
      p.r(21, 20, 3, 2, LUZ)
      p.r(25, 20, 3, 2, LUZ)
      p.r(21, 23, 3, 2, LUZ)
      p.r(25, 23, 3, 2, LUZ)
    },
  },
  taberna: {
    w: 36,
    h: 36,
    puerta: 17,
    chimenea: [7, 0],
    alero: 15,
    dibujar: (p) => {
      p.caja(5, 0, 5, 10, GRIS)
      techo(p, 4, 12, 36, 6, '#ff8fab', '#e0607f', '#f27597')
      p.caja(2, 15, 32, 21, '#fff1d6')
      p.r(3, 25, 30, 1, MADERA)
      p.r(17, 16, 1, 9, MADERA)
      p.caja(6, 17, 7, 6, VIDRIO)
      p.caja(23, 17, 7, 6, VIDRIO)
      p.caja(4, 27, 7, 6, VIDRIO)
      ventanaArco(p, 13, 26, 9, 10, MADERA, '#fff1d6')
      p.r(17, 27, 1, 9, MADERA_OSCURA)
      p.px(20, 31, ORO)
      // letrero con jarra
      p.r(28, 25, 7, 1, O)
      p.caja(29, 26, 6, 6, ORO)
      p.r(30, 27, 4, 1, '#ffffff')
    },
    luces: (p) => {
      p.r(7, 18, 5, 4, LUZ)
      p.r(24, 18, 5, 4, LUZ)
      p.r(5, 28, 5, 4, LUZ)
    },
  },
}

/** Fase 2: cada nivel agrega un adorno (arbustos, farol, alero dorado, estrella). */
function adornos(p: Pintor, id: IdEdificio, nivel: number) {
  const { w, h, puerta, alero } = PLANOS[id]
  if (nivel >= 2 && id !== 'campamento') {
    for (const x of [1, w - 5]) {
      p.r(x, h - 3, 4, 3, '#58a700')
      p.r(x + 1, h - 4, 2, 1, '#58a700')
      p.px(x + 1, h - 3, '#ff4b4b')
      p.px(x + 2, h - 2, ORO)
    }
  }
  if (nivel >= 3) {
    const x = Math.min(w - 2, puerta + 6)
    p.r(x, h - 9, 1, 9, O)
    p.caja(x - 1, h - 12, 3, 3, ORO)
  }
  if (nivel >= 4) {
    if (id === 'campamento') p.r(4, alero - 6, w - 8, 1, ORO)
    else p.r(1, alero, w - 2, 1, ORO)
  }
  if (nivel >= 5) {
    const cx = id === 'torre' ? 14 : Math.floor(w / 2)
    const y = id === 'torre' ? 0 : id === 'campamento' ? 0 : 1
    if (id === 'torre') {
      p.r(12, 0, 4, 1, ORO)
      p.r(12, 1, 3, 1, ORO)
      p.r(12, 2, 2, 1, '#e0a800')
    } else {
      p.px(cx, y, ORO)
      p.r(cx - 1, y + 1, 3, 1, ORO)
      p.px(cx, y + 2, ORO)
    }
  }
}

export const texturaEdificio = (id: IdEdificio, nivel = 1) =>
  lienzo(PLANOS[id].w, PLANOS[id].h, (p) => {
    PLANOS[id].dibujar(p)
    adornos(p, id, nivel)
  })

export const texturaLuces = (id: IdEdificio, nivel = 1) =>
  lienzo(PLANOS[id].w, PLANOS[id].h, (p) => {
    PLANOS[id].luces(p)
    if (nivel >= 3) {
      const x = Math.min(PLANOS[id].w - 2, PLANOS[id].puerta + 6)
      p.r(x - 1, PLANOS[id].h - 12, 3, 3, LUZ)
    }
  })

// ---------- guardián ----------

const paletaGuardian = (capa: [string, string] = ['#58cc02', '#58a700']) => ({
  o: O,
  g: capa[0],
  G: capa[1],
  s: '#ffcf99',
  e: O,
  y: capa[0] === ORO ? '#ff4b4b' : ORO,
  b: MADERA_OSCURA,
})
const CUERPO = [
  '....ooo....',
  '...ogggo...',
  '..ogggggo..',
  '.oggsssggo.',
  '.ogsesesgo.',
  '.ogsssssgo.',
  '.oggsssggo.',
  'ogGgggggGgo',
  'ogGggyggGgo',
  'ogGgggggGgo',
  '.oGgggggGo.',
]

/** Cuadros del guardián con la capa elegida (Fase 4). */
export const guardian = (capa?: [string, string]) => ({
  quieto: mapa([...CUERPO, '..obbobbo..', '..ooo.ooo..'], paletaGuardian(capa)),
  pasoA: mapa([...CUERPO, '.obbo.obbo.', '.ooo...ooo.'], paletaGuardian(capa)),
  pasoB: mapa([...CUERPO, '...obbbo...', '...ooooo...'], paletaGuardian(capa)),
})

// ---------- cosméticos (Fase 4) ----------

export const sombreros: Record<string, () => HTMLCanvasElement> = {
  'sombrero-sabio': () =>
    mapa(['...o...', '..obo..', '..obo..', '.obybo.', 'obbbbbo', 'ooooooo'], { o: O, b: '#3d5afe', y: ORO }),
  corona: () => mapa(['o.o.o.o', 'oyoyoyo', 'oyyryyo', 'ooooooo'], { o: O, y: ORO, r: '#ff4b4b' }),
}

const GATO = ['.......O.O', 'O......OfO', 'O.OOOOOfkO', '.OfffffffO']
const CUBITO = ['oooooooo', 'orrwwbbo', 'orrwwbbo', 'oyyggnno', 'oyyggnno', 'obbrrwwo', 'obbrrwwo', 'oooooooo']
const PALETA_CUBITO = { o: O, r: '#ff4b4b', w: '#ffffff', b: '#1cb0f6', y: ORO, g: '#58cc02', n: '#ff9600' }

export const mascotas: Record<string, () => [HTMLCanvasElement, HTMLCanvasElement]> = {
  'mascota-gato': () => [
    mapa([...GATO, '..OfO.OfO.', '..OO...OO.'], { O, f: '#ff9600', k: '#3c3c3c' }),
    mapa([...GATO, '.OfO...OfO', '.OO.....OO'], { O, f: '#ff9600', k: '#3c3c3c' }),
  ],
  'mascota-cubito': () => [
    mapa([...CUBITO, '.o....o.', 'oo....oo'], PALETA_CUBITO),
    mapa([...CUBITO, '..o..o..', '.oo..oo.'], PALETA_CUBITO),
  ],
}

// ---------- La Rana, jefe diario (Fase 2) ----------

export const rana = () =>
  mapa(
    [
      '..ooo....ooo..',
      '.owwwo..owwwo.',
      '.owkwoooowkwo.',
      'oggggggggggggo',
      'ogGggggggggGgo',
      'ogggoooooogggo',
      'oggggggggggggo',
      '.oggyyyyyyggo.',
      'ooggoyyyyoggoo',
      'oooo.oooo.oooo',
    ],
    { o: O, w: '#ffffff', k: '#3c3c3c', g: '#3fae49', G: '#2e8b3a', y: '#d7ffb8' },
  )

// ---------- El Después (Fase 3) ----------

/** Una sombra sin forma con ojos que brillan. */
export const despues = () =>
  lienzo(16, 18, (p) => {
    for (let y = 0; y < 18; y++) {
      const mitad = y < 8 ? Math.round(3 + Math.sqrt(y * 6)) : 8
      for (let x = 8 - mitad; x < 8 + mitad; x++) {
        if (y >= 14 && (x + y) % 3 === 0) continue
        if (y === 17 && x % 2 === 1) continue
        const borde = x === 8 - mitad || x === 7 + mitad || y === 0
        p.px(x, y, borde ? '#120a1f' : '#2a1840')
      }
    }
    p.r(4, 6, 2, 2, LUZ)
    p.r(10, 6, 2, 2, LUZ)
    p.px(5, 7, '#ff9600')
    p.px(10, 7, '#ff9600')
    p.r(6, 11, 4, 1, '#5a3a80')
  })

/** Terreno oscurecido: niebla morada con borde irregular. */
export const sombraTerreno = (w: number, h: number) =>
  lienzo(w, h, (p) => {
    for (let x = 0; x < w; x++) {
      const alto = 3 + ((x * 7) % 5)
      p.r(x, alto, 1, h - alto, '#2a1840')
      if (x % 4 === 1) p.px(x, alto + 6 + (x % 3) * 9, '#4a2a70')
    }
  })


export const saco = () =>
  mapa(['..oo..', '.oyyo.', 'obbbbo', 'obbybo', 'obbbbo', '.oooo.'], { o: O, y: ORO, b: '#c98a4b' })

export const moneda = () => mapa(['.y.', 'yYy', '.y.'], { y: ORO, Y: '#fff4cc' })

export const bandera = (colores: [string, string] = ['#58cc02', '#d7ffb8']) =>
  mapa(['oggggg', 'ogwggg', 'ogggg.', 'oggg..', 'o.....', 'o.....', 'o.....', 'o.....'], { o: O, g: colores[0], w: colores[1] })

export const zeta = () => mapa(['wwww', '..w.', '.w..', 'wwww'], { w: '#ffffff' })

export const pixel = () => lienzo(1, 1, (p) => p.px(0, 0, '#ffffff'))

export const fogata = () =>
  mapa(['..o.....o..', '.obo...obo.', 'oobbbobbboo', '.ggoooooog.'], { o: O, b: MADERA, g: GRIS })

export const sol = () =>
  mapa(['..yyy..', '.yYYYy.', 'yYYYYYy', 'yYYYYYy', 'yYYYYYy', '.yYYYy.', '..yyy..'], { y: '#ffb000', Y: ORO })

export const luna = () =>
  mapa(['..www..', '.wwwww.', 'wwwccww', 'wwwwwww', 'wcwwwww', '.wwwww.', '..www..'], { w: '#fff4cc', c: '#e6d9a8' })

export const nube = () =>
  mapa(['...wwww.....', '.wwwwwwww...', 'wwwwwwwwwww.', '.wwwwwwwwwww'], { w: '#ffffff' })

/** Colinas del fondo (dos capas). */
export function colinas(ancho: number): HTMLCanvasElement {
  return lienzo(ancho, 26, (p) => {
    for (let x = 0; x < ancho; x++) {
      const lejos = Math.round(8 + 5 * Math.sin(x / 13) + 3 * Math.sin(x / 5.3))
      p.r(x, lejos, 1, 26 - lejos, '#c8f5a0')
      const cerca = Math.round(15 + 4 * Math.sin(x / 9 + 2) + 2 * Math.sin(x / 3.7))
      p.r(x, cerca, 1, 26 - cerca, '#a5ed6e')
    }
  })
}

/** Llama de la fogata para las escenas de la crónica. */
export const llama = () =>
  mapa(['..y..', '.yYy.', '.yYy.', 'yYwYy', 'yYwYy', '.yyy.'], { y: '#ff9600', Y: ORO, w: '#fff4cc' })
