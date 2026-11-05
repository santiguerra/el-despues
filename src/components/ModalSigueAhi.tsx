import { useJuego } from '../store'
import { VENTANA_SIGUE_AHI, tiemposClase } from '../logic/reglas'
import { fechaLocal, fmtReloj, minutosDelDia } from '../logic/tiempo'

/** Aparece a mitad de cualquier clase con check-in hasta que respondas (10 min). */
export function ModalSigueAhi({ ahora }: { ahora: number }) {
  const fecha = fechaLocal(ahora)
  const dia = useJuego((s) => s.dias[fecha])
  const sigoAqui = useJuego((s) => s.sigoAqui)
  const min = minutosDelDia(ahora)
  const clase = dia?.bloques.find((b) => {
    if (b.tipo !== 'clase' || b.estado !== 'activo' || b.sigueAhi) return false
    const { mitad } = tiemposClase(b)
    return min >= mitad && min < mitad + VENTANA_SIGUE_AHI
  })
  if (!clase) return null
  const quedan = (tiemposClase(clase).mitad + VENTANA_SIGUE_AHI - min) * 60000

  return (
    <div className="fondo-modal alerta-modal">
      <div className="modal modal-chico">
        <h2>¿Sigues ahí?</h2>
        <p>
          Mitad de <b>{clase.titulo}</b>. El Después espera que te salgas.
        </p>
        <button className="btn btn-grande btn-oro" onClick={() => sigoAqui(fecha, clase.id)}>
          👀 Sigo aquí
        </button>
        <small>Responde en {fmtReloj(quedan)} (+5 XP)</small>
      </div>
    </div>
  )
}
