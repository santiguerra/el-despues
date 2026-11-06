import { useMemo } from 'react'
import { useJuego } from '../store'
import { COSMETICOS, RANURAS, type Cosmetico } from '../logic/cosmeticos'
import * as arte from '../aldea/arte'
import { Icono } from '../ui/Icono'

/** Dibujo pequeño de cada cosmético, generado con el mismo pixel art de la aldea. */
function vistaPrevia(c: Cosmetico): string {
  let lienzo: HTMLCanvasElement
  if (c.ranura === 'capa') lienzo = arte.guardian(c.colores).quieto
  else if (c.ranura === 'sombrero') lienzo = arte.sombreros[c.id]()
  else if (c.ranura === 'mascota') lienzo = arte.mascotas[c.id]()[0]
  else if (c.ranura === 'estandarte') lienzo = arte.bandera(c.colores)
  else {
    lienzo = document.createElement('canvas')
    lienzo.width = 5
    lienzo.height = 6
    const g = lienzo.getContext('2d')!
    const [a, b] = c.colores!
    g.fillStyle = a
    g.fillRect(1, 1, 3, 4)
    g.fillRect(2, 0, 1, 1)
    g.fillStyle = b
    g.fillRect(2, 3, 1, 2)
    g.fillStyle = '#7a4a1f'
    g.fillRect(0, 5, 5, 1)
  }
  return lienzo.toDataURL()
}

export function TiendaCosmeticos() {
  const monedas = useJuego((s) => s.jugador.monedas)
  const { comprados, equipados } = useJuego((s) => s.cosmeticos)
  const comprar = useJuego((s) => s.comprarCosmetico)
  const equipar = useJuego((s) => s.equipar)
  const imagenes = useMemo(() => Object.fromEntries(COSMETICOS.map((c) => [c.id, vistaPrevia(c)])), [])

  return (
    <section className="cosmeticos">
      <h2>Cosméticos de la aldea</h2>
      <p className="nota">Se ven en la aldea de la pestaña Hoy. Uno por ranura; toca "Usar" para cambiarlo.</p>
      <div className="rejilla-cosmeticos">
        {COSMETICOS.map((c) => {
          const tiene = comprados.includes(c.id)
          const puesto = equipados[c.ranura] === c.id
          return (
            <div key={c.id} className={`tarjeta cosmetico ${puesto ? 'puesto' : ''}`}>
              <img src={imagenes[c.id]} alt="" className="vista-pixel" />
              <small className="rotulo">{RANURAS[c.ranura]}</small>
              <b>{c.nombre}</b>
              {tiene ? (
                <button className={`btn btn-mini ${puesto ? 'btn-azul' : ''}`} onClick={() => equipar(c.id)}>
                  {puesto ? (
                    <>
                      <Icono n="check" size={16} weight="bold" /> Puesto
                    </>
                  ) : (
                    'Usar'
                  )}
                </button>
              ) : (
                <button className="btn btn-mini btn-oro" disabled={monedas < c.costo} onClick={() => comprar(c.id)}>
                  <Icono n="moneda" size={16} /> {c.costo}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
