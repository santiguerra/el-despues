import Phaser from 'phaser'
import type { Bloque, Cosmeticos, Dia } from '../types'
import { reloj, useJuego, type Juego } from '../store'
import { esFinde, fechaLocal, hhmmAMin, minutosDelDia } from '../logic/tiempo'
import { ORDEN_TERRENOS, TERRENOS } from '../logic/despues'
import { cosmetico } from '../logic/cosmeticos'
import * as arte from './arte'
import { PLANOS } from './arte'
import {
  ORDEN_EDIFICIOS,
  cambios,
  edificioDe,
  instantanea,
  nivelesDe,
  nocheDe,
  vidaRana,
  type EventoAldea,
  type IdEdificio,
  type Instantanea,
} from './edificios'
import { sonar } from './sonido'

/** Mundo en pixeles "de juego"; el canvas se escala sin suavizado. */
export const ANCHO = 180
export const ALTO = 108

const SUELO_Y = 62
const BASE = 70 // pie de los edificios
const PLAZA_Y = 85
const CAMINO_Y = 98
const PLAZA_X = 90
const FOGATA = { x: 101, y: 80 }
const SALIDA_X = ANCHO + 10
const RANA_X = 150
const PELEA_X = RANA_X - 14
const ANCHO_TERRENO = ANCHO / TERRENOS

const POS_X: Record<IdEdificio, number> = { torre: 4, forja: 30, campamento: 76, taller: 108, taberna: 144 }
const puerta = (id: IdEdificio) => ({ x: POS_X[id] + PLANOS[id].puerta, y: BASE + 1 })
const terrenoDeX = (x: number) => Math.min(TERRENOS - 1, Math.max(0, Math.floor(x / ANCHO_TERRENO)))
const centroTerreno = (t: number) => Math.round(t * ANCHO_TERRENO + ANCHO_TERRENO / 2)

const CIELO_DIA = 0xbfeaff
const CIELO_TARDE = 0xffc3a1
const CIELO_NOCHE = 0x1b2a5c
const TINTE_NOCHE = 0x5a6aa8
const TINTE_SOMBRA = 0x6a5a8a
const FUEGO_BASE = [0xffc800, 0xff9600, 0xff4b4b]

export interface Control {
  alTocar: (id: IdEdificio) => void
  /** mientras haya un modal abierto, las animaciones esperan */
  pausado: () => boolean
}

type Lugar = 'plaza' | 'fuera' | 'carpa'
type Paso = EventoAldea | { tipo: 'nivel'; edificio: IdEdificio; nivel: number } | { tipo: 'sombra'; delta: 1 | -1 }

function mezclar(a: number, b: number, t: number) {
  const c = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t)
  return (c(16) << 16) | (c(8) << 8) | c(0)
}

const hex = (c: string) => parseInt(c.slice(1), 16)

/** Aleatorio con semilla: el pasto y las estrellas no cambian entre visitas. */
function semilla(n: number) {
  return () => ((n = (n * 1664525 + 1013904223) % 4294967296) / 4294967296)
}


export class EscenaAldea extends Phaser.Scene {
  private ctrl!: Control
  private guardian!: Phaser.GameObjects.Sprite
  private saco!: Phaser.GameObjects.Image
  private sombrero!: Phaser.GameObjects.Image
  private mascota!: Phaser.GameObjects.Sprite
  private bandera!: Phaser.GameObjects.Image
  private cielo!: Phaser.GameObjects.Rectangle
  private sol!: Phaser.GameObjects.Image
  private luna!: Phaser.GameObjects.Image
  private rana!: Phaser.GameObjects.Image
  private barraRana!: Phaser.GameObjects.Graphics
  private despues!: Phaser.GameObjects.Image
  private edificios = {} as Record<IdEdificio, Phaser.GameObjects.Image>
  private luces = {} as Record<IdEdificio, Phaser.GameObjects.Image>
  private terrenos: Phaser.GameObjects.Image[] = []
  private estrellas: Phaser.GameObjects.Image[] = []
  private nubes: Phaser.GameObjects.Image[] = []
  private tintables: (Phaser.GameObjects.Image | Phaser.GameObjects.Sprite)[] = []

  private fuego!: Phaser.GameObjects.Particles.ParticleEmitter
  private humo!: Phaser.GameObjects.Particles.ParticleEmitter
  private destellos!: Phaser.GameObjects.Particles.ParticleEmitter
  private monedas!: Phaser.GameObjects.Particles.ParticleEmitter
  private polvo!: Phaser.GameObjects.Particles.ParticleEmitter
  private suenos!: Phaser.GameObjects.Particles.ParticleEmitter
  private niebla!: Phaser.GameObjects.Particles.ParticleEmitter

  private cola: Paso[] = []
  private ocupado = false
  private lugar: Lugar = 'plaza'
  private fueraDe: IdEdificio | null = null
  private peleando = false
  private combate: Phaser.Time.TimerEvent | null = null
  private fecha = ''
  private antes: Instantanea = new Map()
  /** lo que se ve vs. lo último que se sabe del store (la diferencia se anima) */
  private niveles = {} as Record<IdEdificio, number>
  private nivelesSabidos = {} as Record<IdEdificio, number>
  private sombra = 0
  private sombraSabida = 0
  private cosmeticosVistos = ''
  private animCaminar = 'caminar-base'
  private texQuieto = 'g-base-quieto'
  private tinte = 0xffffff
  private ultimoMinuto = -1
  private proximoPaseo = 0
  private rapido = 1
  private quitar: (() => void) | null = null

  constructor() {
    super('aldea')
  }

  init(ctrl: Control) {
    this.ctrl = ctrl
    this.rapido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 4 : 1
  }

  create() {
    const s = useJuego.getState()
    this.crearTexturas()

    // cielo, astros y nubes (detrás de todo)
    this.cielo = this.add.rectangle(0, 0, ANCHO, SUELO_Y + 4, CIELO_DIA).setOrigin(0).setDepth(0)
    const azar = semilla(7)
    for (let i = 0; i < 28; i++) {
      const e = this.add.image(Math.floor(azar() * ANCHO), Math.floor(azar() * 46), 'px').setDepth(1).setAlpha(0)
      if (azar() > 0.8) e.setScale(2)
      this.estrellas.push(e)
    }
    this.sol = this.add.image(0, 0, 'sol').setDepth(1)
    this.luna = this.add.image(0, 0, 'luna').setDepth(1)
    this.nubes = [this.add.image(30, 10, 'nube').setDepth(2), this.add.image(130, 22, 'nube').setDepth(2).setFlipX(true)]
    this.nubes.forEach((n, i) =>
      this.tweens.add({ targets: n, x: { from: -16, to: ANCHO + 16 }, duration: (110 + i * 50) * 1000, repeat: -1, delay: -i * 40000 }),
    )

    // paisaje
    this.tintables.push(this.add.image(0, SUELO_Y - 22, 'colinas').setOrigin(0).setDepth(3))
    this.tintables.push(this.add.image(0, SUELO_Y, 'suelo').setOrigin(0).setDepth(3))
    for (let t = 0; t < TERRENOS; t++)
      this.terrenos.push(this.add.image(t * ANCHO_TERRENO, SUELO_Y, 'terreno').setOrigin(0).setDepth(4).setAlpha(0))
    this.tintables.push(this.add.image(FOGATA.x, FOGATA.y, 'fogata').setOrigin(0.5, 1).setDepth(8))

    this.niveles = nivelesDe(s.dias)
    this.nivelesSabidos = { ...this.niveles }
    for (const id of ORDEN_EDIFICIOS) {
      const img = this.add.image(POS_X[id], BASE, this.texEdificio(id, this.niveles[id])).setOrigin(0, 1).setDepth(5)
      img.setInteractive({ useHandCursor: true })
      img.on('pointerup', (p: Phaser.Input.Pointer) => p.getDistance() < 8 && this.tocar(id, img))
      this.edificios[id] = img
      this.luces[id] = this.add.image(POS_X[id], BASE, `luz-${id}-${this.niveles[id]}`).setOrigin(0, 1).setDepth(6).setAlpha(0)
    }

    this.bandera = this.add.image(0, 0, 'bandera-base').setOrigin(0, 1).setDepth(7).setVisible(false)
    this.tweens.add({ targets: this.bandera, scaleX: 0.8, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    // La Rana espera en el camino (Fase 2)
    this.rana = this.add.image(RANA_X, CAMINO_Y + 1, 'rana').setOrigin(0.5, 1).setDepth(10).setVisible(false)
    this.tweens.add({ targets: this.rana, y: CAMINO_Y - 2, duration: 220, yoyo: true, repeat: -1, repeatDelay: 1600, ease: 'Quad.easeOut' })
    this.barraRana = this.add.graphics().setDepth(13)

    // El Después (Fase 3)
    this.despues = this.add.image(0, CAMINO_Y + 1, 'despues').setOrigin(0.5, 1).setDepth(9).setAlpha(0)
    this.tweens.add({ targets: this.despues, scaleY: 1.08, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    this.guardian = this.add.sprite(PLAZA_X, PLAZA_Y, this.texQuieto).setOrigin(0.5, 1).setDepth(10)
    this.guardian.setInteractive({ useHandCursor: true })
    this.guardian.on('pointerup', (p: Phaser.Input.Pointer) => p.getDistance() < 8 && this.saludar())
    this.saco = this.add.image(0, 0, 'saco').setOrigin(0.5, 1).setDepth(11).setVisible(false)
    this.sombrero = this.add.image(0, 0, 'px').setOrigin(0.5, 1).setDepth(11).setVisible(false)
    this.mascota = this.add.sprite(PLAZA_X - 10, PLAZA_Y, 'px').setOrigin(0.5, 1).setDepth(10).setVisible(false)
    this.tintables.push(this.guardian, this.saco, this.sombrero, this.mascota, this.bandera, this.rana)

    this.crearParticulas()

    this.fecha = fechaLocal(reloj(s.ajustes))
    this.antes = instantanea(s.dias[this.fecha]?.bloques ?? [])
    this.sombra = this.sombraSabida = s.despues.sombra
    this.aplicarCosmeticos(s.cosmeticos)
    this.ponerSombra()
    this.reconciliar()
    this.actualizarCielo(true)

    this.quitar = useJuego.subscribe((estado) => this.alCambiar(estado))
    const soltar = () => {
      this.quitar?.()
      this.quitar = null
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, soltar)
    this.events.once(Phaser.Scenes.Events.DESTROY, soltar)
  }

  update(tiempo: number) {
    this.actualizarCielo()
    const g = this.guardian
    const paso = g.anims.isPlaying ? Math.round(Math.sin(tiempo / 90)) : 0
    if (this.saco.visible) this.saco.setPosition(g.x, g.y - 12 + paso)
    this.sombrero.setPosition(g.x, g.y - 10).setFlipX(g.flipX).setAlpha(g.alpha).setVisible(g.visible && this.sombrero.texture.key !== 'px')
    this.moverMascota()
    this.dibujarBarraRana()

    if (this.ocupado) return
    if (this.cola.length) {
      if (!this.ctrl.pausado()) void this.procesar(this.cola.shift()!)
      return
    }
    if (this.lugar === 'plaza' && tiempo > this.proximoPaseo) {
      this.proximoPaseo = tiempo + 3500 + Math.random() * 5000
      void this.tarea(() => this.caminar(PLAZA_X - 5 + Math.round(Math.random() * 10), PLAZA_Y + Math.round(Math.random() * 2) - 1, 14))
    }
  }

  // ---------- estado del juego → aldea ----------

  private alCambiar(s: Juego) {
    const firma = JSON.stringify(s.cosmeticos.equipados)
    if (firma !== this.cosmeticosVistos) this.aplicarCosmeticos(s.cosmeticos)

    const fecha = fechaLocal(reloj(s.ajustes))
    const bloques = s.dias[fecha]?.bloques ?? []
    if (fecha !== this.fecha) {
      this.fecha = fecha
      this.antes = instantanea(bloques)
      this.cola = []
      if (!this.ocupado) this.reconciliar()
      return
    }
    const pasos: Paso[] = cambios(this.antes, bloques)
    this.antes = instantanea(bloques)

    // La Rana aparece en el camino en cuanto existe; si se descarta sin pelear, se va sin animación.
    const rana = bloques.find((b) => b.esRana)
    if (!rana) this.rana.setVisible(false)
    else if (rana.estado === 'pendiente') this.rana.setVisible(true).setX(RANA_X)
    else if (rana.estado !== 'activo' && !this.peleando && !pasos.some((p) => 'id' in p && p.id === rana.id)) this.rana.setVisible(false)

    const niveles = nivelesDe(s.dias)
    for (const id of ORDEN_EDIFICIOS) {
      if (niveles[id] > this.nivelesSabidos[id]) pasos.push({ tipo: 'nivel', edificio: id, nivel: niveles[id] })
      else if (niveles[id] < this.nivelesSabidos[id]) this.ponerNivel(id, niveles[id]) // se borró historial: sin fiesta
    }
    this.nivelesSabidos = niveles

    const delta = s.despues.sombra - this.sombraSabida
    for (let i = 0; i < Math.abs(delta); i++) pasos.push({ tipo: 'sombra', delta: delta > 0 ? 1 : -1 })
    this.sombraSabida = s.despues.sombra

    this.cola.push(...pasos)
  }

  private dia(): Dia | undefined {
    return useJuego.getState().dias[this.fecha]
  }

  private ranaDeHoy(): Bloque | undefined {
    return this.dia()?.bloques.find((b) => b.esRana)
  }

  private debeDormir(min: number) {
    const s = useJuego.getState()
    const dia = this.dia()
    if (nocheDe(min) < 0.9 || dia?.bloques.some((b) => b.estado === 'activo')) return false
    const despertar = hhmmAMin(esFinde(this.fecha) ? s.ajustes.despertarFinde : s.ajustes.despertarSemana)
    return Boolean(dia?.acoste) || min >= 23 * 60 || min < despertar
  }

  /** Coloca todo donde debe estar, sin animar (al abrir o al cambiar de día). */
  private reconciliar() {
    const activo = this.dia()?.bloques.find((b) => b.estado === 'activo')
    const rana = this.ranaDeHoy()
    this.rana.setVisible(Boolean(rana && (rana.estado === 'pendiente' || rana.estado === 'activo'))).setX(RANA_X)
    this.saco.setVisible(false)
    this.guardian.setAlpha(1)
    this.terminarCombate()
    if (activo) {
      this.lugar = 'fuera'
      this.fueraDe = edificioDe(activo)
      this.mostrarBandera(this.fueraDe)
      this.suenos.stop()
      if (activo.esRana) {
        this.guardian.setVisible(true).setPosition(PELEA_X, CAMINO_Y).setFlipX(false)
        this.empezarCombate()
      } else this.guardian.setVisible(false)
    } else if (this.debeDormir(this.minuto())) {
      this.lugar = 'carpa'
      this.fueraDe = null
      this.guardian.setVisible(false)
      this.ocultarBandera()
      this.suenos.start()
    } else {
      this.lugar = 'plaza'
      this.fueraDe = null
      this.guardian.setVisible(true).setPosition(PLAZA_X, PLAZA_Y)
      this.ocultarBandera()
      this.suenos.stop()
    }
  }

  private async procesar(paso: Paso) {
    await this.tarea(async () => {
      switch (paso.tipo) {
        case 'nivel':
          return this.subirNivel(paso.edificio, paso.nivel)
        case 'sombra':
          return paso.delta > 0 ? this.avanzaSombra() : this.retrocedeSombra()
        case 'inicio':
          return paso.id === this.ranaDeHoy()?.id ? this.salir(paso.edificio, true) : this.salir(paso.edificio)
        case 'completado':
          if (this.peleando) return this.vencerRana()
          return this.lugar === 'fuera' ? this.regresar(true) : this.botinRapido(paso.edificio)
        default:
          if (this.peleando) return this.ranaEscapa()
          if (this.lugar === 'fuera') return this.regresar(false, paso.tipo === 'fallido')
      }
    })
  }

  private async tarea(fn: () => Promise<void> | void) {
    this.ocupado = true
    try {
      await fn()
    } finally {
      this.ocupado = false
    }
  }

  // ---------- expediciones ----------

  private async salir(id: IdEdificio, contraLaRana = false) {
    await this.alistar()
    const p = puerta(id)
    await this.ruta([
      [p.x, PLAZA_Y],
      [p.x, p.y],
    ])
    await this.fundido(0)
    await this.esperar(450)
    sonar('salida')
    this.destellos.explode(10, p.x, p.y - 8)
    this.mostrarBandera(id)
    this.lugar = 'fuera'
    this.fueraDe = id
    if (id === 'campamento' && !contraLaRana) {
      this.guardian.setVisible(false).setAlpha(1)
      return
    }
    await this.fundido(1)
    if (contraLaRana) {
      await this.ruta([
        [p.x, CAMINO_Y],
        [PELEA_X, CAMINO_Y],
      ])
      this.guardian.setFlipX(false)
      this.empezarCombate()
      return
    }
    await this.ruta([
      [p.x, CAMINO_Y],
      [SALIDA_X, CAMINO_Y],
    ])
    this.guardian.setVisible(false)
  }

  /** Vuelve a su edificio y luego a la plaza. desdeAqui: ya está visible en el camino (pelea). */
  private async regresar(conBotin: boolean, triste = false, desdeAqui = false) {
    const id = this.fueraDe ?? 'campamento'
    const p = puerta(id)
    const vel = triste ? 14 : 30
    this.saco.setVisible(conBotin)
    if (desdeAqui) {
      await this.ruta([[p.x, CAMINO_Y], [p.x, p.y]], vel)
    } else if (id === 'campamento') {
      this.guardian.setPosition(p.x, p.y).setAlpha(0).setVisible(true)
      await this.fundido(1)
    } else {
      this.guardian.setPosition(SALIDA_X, CAMINO_Y).setAlpha(1).setVisible(true)
      await this.ruta([[p.x, CAMINO_Y], [p.x, p.y]], vel)
    }
    if (conBotin) {
      this.saco.setVisible(false)
      sonar('botin')
      this.monedas.explode(14, p.x, p.y - 14)
      this.destellos.explode(12, p.x, p.y - 10)
      this.tweens.add({ targets: this.edificios[id], scaleY: 1.06, duration: 120, yoyo: true })
      await this.esperar(700)
    } else {
      sonar(triste ? 'fallo' : 'toque')
      this.polvo.explode(10, p.x, p.y - 4)
      await this.esperar(500)
    }
    this.ocultarBandera()
    this.fueraDe = null
    this.lugar = 'plaza'
    await this.ruta([[p.x, PLAZA_Y], [PLAZA_X, PLAZA_Y]], triste ? vel : 26)
  }

  /** Bloques que se completan sin estar "en curso" (eventos con "Asistí"). */
  private async botinRapido(id: IdEdificio) {
    await this.alistar()
    const p = puerta(id)
    await this.ruta([[p.x, PLAZA_Y], [p.x, p.y]])
    sonar('botin')
    this.monedas.explode(12, p.x, p.y - 14)
    this.destellos.explode(10, p.x, p.y - 10)
    await this.esperar(600)
    await this.ruta([[p.x, PLAZA_Y], [PLAZA_X, PLAZA_Y]])
  }

  /** Antes de una animación el guardián debe estar en la plaza. */
  private async alistar() {
    this.saco.setVisible(false)
    this.terminarCombate()
    if (this.lugar === 'carpa') {
      this.suenos.stop()
      const p = puerta('campamento')
      this.guardian.setPosition(p.x, p.y).setAlpha(0).setVisible(true)
      await this.fundido(1)
    } else if (this.lugar === 'fuera') {
      this.ocultarBandera()
      this.guardian.setPosition(PLAZA_X, PLAZA_Y).setAlpha(1).setVisible(true)
    }
    this.lugar = 'plaza'
    this.fueraDe = null
  }

  private async irADormir() {
    const p = puerta('campamento')
    await this.ruta([[p.x, PLAZA_Y], [p.x, p.y]])
    await this.fundido(0)
    this.guardian.setVisible(false).setAlpha(1)
    this.lugar = 'carpa'
    this.suenos.start()
  }

  private async despertarse() {
    await this.alistar()
    await this.caminar(PLAZA_X, PLAZA_Y)
  }

  // ---------- La Rana (Fase 2) ----------

  private empezarCombate() {
    this.peleando = true
    this.combate?.remove()
    this.combate = this.time.addEvent({
      delay: 1300 / this.rapido,
      loop: true,
      callback: () => {
        if (!this.guardian.visible) return
        this.tweens.add({ targets: this.guardian, x: PELEA_X + 3, duration: 90, yoyo: true })
        this.destellos.explode(3, PELEA_X + 7, CAMINO_Y - 7)
        this.rana.setTintFill(0xffffff)
        this.time.delayedCall(80, () => this.rana.clearTint().setTint(this.tinte))
      },
    })
  }

  private terminarCombate() {
    this.peleando = false
    this.combate?.remove()
    this.combate = null
  }

  private async vencerRana() {
    this.terminarCombate()
    for (let i = 0; i < 3; i++) {
      this.rana.setTintFill(0xffffff)
      await this.esperar(90)
      this.rana.clearTint().setTint(this.tinte)
      await this.esperar(90)
    }
    sonar('victoria')
    this.rana.setVisible(false)
    // botín doble: dos lluvias de monedas
    this.monedas.explode(16, RANA_X, CAMINO_Y - 6)
    this.destellos.explode(16, RANA_X, CAMINO_Y - 6)
    await this.esperar(350)
    this.monedas.explode(16, RANA_X, CAMINO_Y - 6)
    await this.esperar(700)
    await this.regresar(true, false, true)
  }

  private async ranaEscapa() {
    this.terminarCombate()
    sonar('risa')
    for (let i = 0; i < 4; i++) {
      await new Promise<void>((listo) =>
        this.tweens.add({ targets: this.rana, x: this.rana.x + 12, duration: 180 / this.rapido, ease: 'Quad.easeOut', onComplete: () => listo() }),
      )
    }
    this.rana.setVisible(false).setX(RANA_X)
    await this.regresar(false, true, true)
  }

  private dibujarBarraRana() {
    const g = this.barraRana
    g.clear()
    const b = this.ranaDeHoy()
    if (!this.rana.visible || !b) return
    const vida = vidaRana(b, reloj(useJuego.getState().ajustes))
    const x = Math.round(this.rana.x - 8)
    const y = CAMINO_Y - 16
    g.fillStyle(0x3c3c3c).fillRect(x, y, 16, 3)
    g.fillStyle(vida > 0.5 ? 0x58cc02 : vida > 0.25 ? 0xffc800 : 0xff4b4b).fillRect(x + 1, y + 1, Math.round(14 * vida), 1)
  }

  // ---------- niveles (Fase 2) ----------

  private texEdificio(id: IdEdificio, nivel: number) {
    const clave = `ed-${id}-${nivel}`
    if (!this.textures.exists(clave)) {
      this.textures.addCanvas(clave, arte.texturaEdificio(id, nivel))
      this.textures.addCanvas(`luz-${id}-${nivel}`, arte.texturaLuces(id, nivel))
    }
    return clave
  }

  private ponerNivel(id: IdEdificio, nivel: number) {
    this.niveles[id] = nivel
    this.edificios[id].setTexture(this.texEdificio(id, nivel))
    this.luces[id].setTexture(`luz-${id}-${nivel}`)
  }

  private async subirNivel(id: IdEdificio, nivel: number) {
    const img = this.edificios[id]
    const cx = POS_X[id] + PLANOS[id].w / 2
    const cy = BASE - PLANOS[id].h / 2
    sonar('nivel')
    this.destellos.explode(24, cx, cy)
    await new Promise<void>((listo) => this.tweens.add({ targets: img, scaleY: 0.85, duration: 140, onComplete: () => listo() }))
    this.ponerNivel(id, nivel)
    await new Promise<void>((listo) => this.tweens.add({ targets: img, scaleY: 1, duration: 260, ease: 'Back.easeOut', onComplete: () => listo() }))
    this.destellos.explode(16, cx, cy - 6)
    await this.esperar(600)
  }

  // ---------- El Después (Fase 3) ----------

  private oscuro(t: number) {
    return ORDEN_TERRENOS.slice(0, this.sombra).includes(t)
  }

  /** Pinta la sombra sin animar. */
  private ponerSombra() {
    this.terrenos.forEach((img, t) => img.setAlpha(this.oscuro(t) ? 0.72 : 0))
    if (this.sombra > 0) this.despues.setAlpha(0.95).setX(centroTerreno(ORDEN_TERRENOS[this.sombra - 1]))
    else this.despues.setAlpha(0)
    if (this.sombra > 0) this.niebla.start()
    else this.niebla.stop()
    this.aplicarTintes()
  }

  private async avanzaSombra() {
    if (this.sombra >= TERRENOS) return
    const t = ORDEN_TERRENOS[this.sombra]
    this.sombra++
    sonar('sombra')
    const x = centroTerreno(t)
    if (this.despues.alpha < 0.5) this.despues.setX(x)
    this.tweens.add({ targets: this.despues, x, alpha: 0.95, duration: 700 / this.rapido })
    await new Promise<void>((listo) => this.tweens.add({ targets: this.terrenos[t], alpha: 0.72, duration: 900 / this.rapido, onComplete: () => listo() }))
    this.niebla.start()
    this.aplicarTintes()
    await this.esperar(300)
  }

  private async retrocedeSombra() {
    if (this.sombra <= 0) return
    this.sombra--
    const t = ORDEN_TERRENOS[this.sombra]
    sonar('luz')
    this.destellos.explode(18, centroTerreno(t), 88)
    await new Promise<void>((listo) => this.tweens.add({ targets: this.terrenos[t], alpha: 0, duration: 800 / this.rapido, onComplete: () => listo() }))
    if (this.sombra > 0) this.tweens.add({ targets: this.despues, x: centroTerreno(ORDEN_TERRENOS[this.sombra - 1]), duration: 600 / this.rapido })
    else {
      this.tweens.add({ targets: this.despues, alpha: 0, duration: 600 / this.rapido })
      this.niebla.stop()
    }
    this.aplicarTintes()
    await this.esperar(300)
  }

  // ---------- cosméticos (Fase 4) ----------

  private aplicarCosmeticos(c: Cosmeticos) {
    const eq = c.equipados
    this.cosmeticosVistos = JSON.stringify(eq)

    const capa = cosmetico(eq.capa)
    const clave = capa?.id ?? 'base'
    if (!this.textures.exists(`g-${clave}-quieto`)) {
      const cuadros = arte.guardian(capa?.colores)
      this.textures.addCanvas(`g-${clave}-quieto`, cuadros.quieto)
      this.textures.addCanvas(`g-${clave}-a`, cuadros.pasoA)
      this.textures.addCanvas(`g-${clave}-b`, cuadros.pasoB)
      this.anims.create({
        key: `caminar-${clave}`,
        frames: [{ key: `g-${clave}-a` }, { key: `g-${clave}-quieto` }, { key: `g-${clave}-b` }, { key: `g-${clave}-quieto` }],
        frameRate: 8,
        repeat: -1,
      })
    }
    this.animCaminar = `caminar-${clave}`
    this.texQuieto = `g-${clave}-quieto`
    if (this.guardian) {
      if (this.guardian.anims.isPlaying) this.guardian.play(this.animCaminar)
      else this.guardian.setTexture(this.texQuieto)
    }

    const sombrero = eq.sombrero && arte.sombreros[eq.sombrero] ? eq.sombrero : null
    if (sombrero && !this.textures.exists(sombrero)) this.textures.addCanvas(sombrero, arte.sombreros[sombrero]())
    this.sombrero?.setTexture(sombrero ?? 'px')

    const mascota = eq.mascota && arte.mascotas[eq.mascota] ? eq.mascota : null
    if (mascota && !this.textures.exists(`${mascota}-0`)) {
      const [a, b] = arte.mascotas[mascota]()
      this.textures.addCanvas(`${mascota}-0`, a)
      this.textures.addCanvas(`${mascota}-1`, b)
      this.anims.create({ key: `andar-${mascota}`, frames: [{ key: `${mascota}-0` }, { key: `${mascota}-1` }], frameRate: 8, repeat: -1 })
    }
    if (this.mascota) {
      this.mascota.setData('id', mascota)
      if (mascota) this.mascota.setTexture(`${mascota}-0`)
      this.mascota.setVisible(Boolean(mascota))
    }

    const est = cosmetico(eq.estandarte)
    const claveBandera = `bandera-${est?.id ?? 'base'}`
    if (!this.textures.exists(claveBandera)) this.textures.addCanvas(claveBandera, arte.bandera(est?.colores))
    this.bandera?.setTexture(claveBandera)

    const fuego = cosmetico(eq.fogata)
    if (this.fuego) {
      this.fuego.destroy()
      this.crearFuego(fuego?.colores ? [hex(fuego.colores[0]), hex(fuego.colores[1]), mezclar(hex(fuego.colores[0]), 0xffffff, 0.4)] : FUEGO_BASE)
    }
  }

  /** La mascota sigue al guardián; si él está fuera, espera junto al fuego. */
  private moverMascota() {
    const m = this.mascota
    if (!m.getData('id')) return
    const g = this.guardian
    const conEl = g.visible && g.alpha > 0.5 && this.lugar !== 'carpa'
    const tx = conEl ? g.x + (g.flipX ? 9 : -9) : FOGATA.x - 16
    const ty = conEl ? g.y : PLAZA_Y + 1
    const dx = tx - m.x
    const dy = ty - m.y
    const lejos = Math.hypot(dx, dy) > 0.6
    if (lejos) {
      m.x += dx * 0.06 * this.rapido
      m.y += dy * 0.06 * this.rapido
      if (Math.abs(dx) > 0.5) m.setFlipX(dx < 0)
      if (!m.anims.isPlaying) m.play(`andar-${m.getData('id')}`)
    } else if (m.anims.isPlaying) {
      m.stop()
      m.setTexture(`${m.getData('id')}-0`)
    }
    m.setVisible(this.lugar !== 'carpa' || !conEl)
  }

  // ---------- movimiento ----------

  private caminar(x: number, y: number, vel = 28): Promise<void> {
    const g = this.guardian
    const d = Math.hypot(x - g.x, y - g.y)
    if (d < 0.5) return Promise.resolve()
    if (Math.abs(x - g.x) > 0.5) g.setFlipX(x < g.x)
    g.play(this.animCaminar, true)
    return new Promise((listo) =>
      this.tweens.add({
        targets: g,
        x,
        y,
        duration: ((d / vel) * 1000) / this.rapido,
        onComplete: () => {
          g.stop()
          g.setTexture(this.texQuieto)
          listo()
        },
      }),
    )
  }

  private async ruta(puntos: [number, number][], vel?: number) {
    for (const [x, y] of puntos) await this.caminar(x, y, vel)
  }

  private fundido(alpha: number) {
    return new Promise<void>((listo) => this.tweens.add({ targets: this.guardian, alpha, duration: 260 / this.rapido, onComplete: () => listo() }))
  }

  private esperar(ms: number) {
    return new Promise<void>((listo) => this.time.delayedCall(ms / this.rapido, listo))
  }

  private mostrarBandera(id: IdEdificio) {
    const plano = PLANOS[id]
    this.bandera.setPosition(POS_X[id] + Math.floor(plano.w / 2), BASE - plano.h - 1).setVisible(true)
    this.humo.stop()
    if (plano.chimenea) {
      this.humo.setPosition(POS_X[id] + plano.chimenea[0], BASE - plano.h)
      this.humo.start()
    }
  }

  private ocultarBandera() {
    this.bandera.setVisible(false)
    this.humo.stop()
  }

  private tocar(id: IdEdificio, img: Phaser.GameObjects.Image) {
    sonar('toque')
    this.tweens.add({ targets: img, scaleY: 0.94, duration: 70, yoyo: true })
    this.ctrl.alTocar(id)
  }

  private saludar() {
    sonar('toque')
    if (!this.ocupado && !this.peleando)
      this.tweens.add({ targets: this.guardian, y: this.guardian.y - 4, duration: 120, yoyo: true, ease: 'Quad.easeOut' })
    this.ctrl.alTocar(this.fueraDe ?? 'campamento')
  }

  // ---------- cielo y luz ----------

  private minuto() {
    return minutosDelDia(reloj(useJuego.getState().ajustes))
  }

  private aplicarTintes() {
    for (const t of this.tintables) t.setTint(this.tinte)
    for (const id of ORDEN_EDIFICIOS) {
      const enSombra = this.oscuro(terrenoDeX(puerta(id).x))
      this.edificios[id].setTint(enSombra ? mezclar(this.tinte, TINTE_SOMBRA, 0.55) : this.tinte)
    }
  }

  private actualizarCielo(forzar = false) {
    const ahora = reloj(useJuego.getState().ajustes)
    const min = minutosDelDia(ahora)
    const entero = Math.floor(min)
    if (!forzar && entero === this.ultimoMinuto) return
    this.ultimoMinuto = entero

    // cambio de día sin tocar el store (pasó la medianoche)
    if (fechaLocal(ahora) !== this.fecha && !this.ocupado) this.alCambiar(useJuego.getState())

    const n = nocheDe(min)
    this.cielo.setFillStyle(n < 0.5 ? mezclar(CIELO_DIA, CIELO_TARDE, n * 2) : mezclar(CIELO_TARDE, CIELO_NOCHE, (n - 0.5) * 2))
    this.tinte = mezclar(0xffffff, TINTE_NOCHE, n * 0.9)
    this.aplicarTintes()
    for (const id of ORDEN_EDIFICIOS) this.luces[id].setAlpha(n)
    this.estrellas.forEach((e, i) => e.setAlpha(Math.max(0, n * 1.4 - 0.4) * (i % 3 === 0 ? 0.6 : 1)))
    this.nubes.forEach((c) => c.setAlpha(1 - n * 0.75))

    const arco = (desde: number) => {
      const f = ((min - desde + 1440) % 1440) / 720
      return { x: 8 + 164 * f, y: 46 - 36 * Math.sin(Math.PI * Math.min(1, f)), visible: f <= 1 }
    }
    const s = arco(6 * 60)
    const l = arco(18 * 60)
    this.sol.setPosition(Math.round(s.x), Math.round(s.y)).setVisible(s.visible).setAlpha(1 - n)
    this.luna.setPosition(Math.round(l.x), Math.round(l.y)).setVisible(l.visible).setAlpha(n)

    if (this.ocupado || this.cola.length) return
    const dormir = this.debeDormir(min)
    if (this.lugar === 'plaza' && dormir) void this.tarea(() => this.irADormir())
    else if (this.lugar === 'carpa' && !dormir) void this.tarea(() => this.despertarse())
    else if (this.lugar === 'fuera' && !this.dia()?.bloques.some((b) => b.estado === 'activo')) this.reconciliar()
  }

  // ---------- recursos ----------

  private crearTexturas() {
    const agregar = (clave: string, c: HTMLCanvasElement) => {
      if (!this.textures.exists(clave)) this.textures.addCanvas(clave, c)
    }
    agregar('saco', arte.saco())
    agregar('moneda', arte.moneda())
    agregar('zeta', arte.zeta())
    agregar('px', arte.pixel())
    agregar('fogata', arte.fogata())
    agregar('sol', arte.sol())
    agregar('luna', arte.luna())
    agregar('nube', arte.nube())
    agregar('rana', arte.rana())
    agregar('despues', arte.despues())
    agregar('terreno', arte.sombraTerreno(ANCHO_TERRENO, ALTO - SUELO_Y))
    agregar('bandera-base', arte.bandera())
    agregar('colinas', arte.colinas(ANCHO))
    agregar('suelo', this.suelo())
  }

  /** Pasto, camino de expediciones, senderos a cada puerta y la plaza. */
  private suelo() {
    const c = document.createElement('canvas')
    c.width = ANCHO
    c.height = ALTO - SUELO_Y
    const g = c.getContext('2d')!
    const r = (x: number, y: number, w: number, h: number, color: string) => {
      g.fillStyle = color
      g.fillRect(x, y - SUELO_Y, w, h)
    }
    r(0, SUELO_Y, ANCHO, ALTO - SUELO_Y, '#89e219')
    const azar = semilla(42)
    for (let i = 0; i < 70; i++) r(Math.floor(azar() * ANCHO), SUELO_Y + 2 + Math.floor(azar() * (ALTO - SUELO_Y)), 1, 2, '#58cc02')
    const tierra = '#e9c890'
    const borde = '#d4a76a'
    for (const id of ORDEN_EDIFICIOS) r(puerta(id).x - 2, BASE, 5, CAMINO_Y - 5 - BASE, tierra)
    for (let dy = -3; dy <= 3; dy++) {
      const w = Math.round(22 * Math.sqrt(1 - (dy / 4) ** 2))
      r(FOGATA.x - 6 - w, PLAZA_Y - 2 + dy, w * 2, 1, tierra)
    }
    r(0, CAMINO_Y - 5, ANCHO, 8, tierra)
    r(0, CAMINO_Y - 5, ANCHO, 1, borde)
    r(0, CAMINO_Y + 3, ANCHO, 1, borde)
    for (let x = 3; x < ANCHO; x += 9) r(x, CAMINO_Y - 1 + (x % 2), 2, 1, borde)
    return c
  }

  private crearFuego(tintes: number[]) {
    this.fuego = this.add
      .particles(FOGATA.x, FOGATA.y - 3, 'px', {
        emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-2, -1, 5, 2) } as Phaser.Types.GameObjects.Particles.EmitZoneData,
        speedY: { min: -16, max: -6 },
        speedX: { min: -3, max: 3 },
        lifespan: { min: 350, max: 750 },
        frequency: 55,
        scale: { start: 2, end: 0 },
        tint: tintes,
        alpha: { start: 1, end: 0.4 },
      })
      .setDepth(9)
  }

  private crearParticulas() {
    const fuego = cosmetico(useJuego.getState().cosmeticos.equipados.fogata)
    this.crearFuego(fuego?.colores ? [hex(fuego.colores[0]), hex(fuego.colores[1]), mezclar(hex(fuego.colores[0]), 0xffffff, 0.4)] : FUEGO_BASE)

    this.humo = this.add
      .particles(0, 0, 'px', {
        speedY: { min: -10, max: -5 },
        speedX: { min: 1, max: 4 },
        lifespan: 1800,
        frequency: 260,
        scale: { start: 2, end: 4 },
        tint: [0xdddddd, 0xbbbbbb],
        alpha: { start: 0.8, end: 0 },
        emitting: false,
      })
      .setDepth(4)

    this.destellos = this.add
      .particles(0, 0, 'px', {
        speed: { min: 12, max: 34 },
        lifespan: 600,
        scale: { start: 2, end: 0 },
        tint: [0xffffff, 0xffc800, 0xd7ffb8],
        emitting: false,
      })
      .setDepth(12)

    this.monedas = this.add
      .particles(0, 0, 'moneda', {
        speed: { min: 28, max: 58 },
        angle: { min: 230, max: 310 },
        gravityY: 140,
        lifespan: 1000,
        alpha: { start: 1, end: 0.2 },
        emitting: false,
      })
      .setDepth(12)

    this.polvo = this.add
      .particles(0, 0, 'px', {
        speed: { min: 4, max: 14 },
        angle: { min: 180, max: 360 },
        lifespan: 900,
        scale: { start: 3, end: 0 },
        tint: [0x9a9a9a, 0x777777],
        alpha: { start: 0.9, end: 0 },
        emitting: false,
      })
      .setDepth(12)

    const carpa = puerta('campamento')
    this.suenos = this.add
      .particles(carpa.x + 3, carpa.y - 14, 'zeta', {
        speedY: { min: -7, max: -4 },
        speedX: { min: 2, max: 5 },
        lifespan: 2400,
        frequency: 1100,
        alpha: { start: 1, end: 0 },
        emitting: false,
      })
      .setDepth(12)

    // niebla que sube de los terrenos oscurecidos
    const zona = {
      getRandomPoint: (p: Phaser.Types.Math.Vector2Like) => {
        const t = ORDEN_TERRENOS[Math.floor(Math.random() * Math.max(1, this.sombra))]
        p.x = t * ANCHO_TERRENO + Math.random() * ANCHO_TERRENO
        p.y = SUELO_Y + 8 + Math.random() * (ALTO - SUELO_Y - 8)
        return p
      },
    }
    this.niebla = this.add
      .particles(0, 0, 'px', {
        emitZone: { type: 'random', source: zona } as unknown as Phaser.Types.GameObjects.Particles.EmitZoneData,
        speedY: { min: -6, max: -2 },
        lifespan: 1600,
        frequency: 140,
        scale: { start: 2, end: 0 },
        tint: [0x5a3a80, 0x2a1840],
        alpha: { start: 0.8, end: 0 },
        emitting: false,
      })
      .setDepth(5)
  }
}
