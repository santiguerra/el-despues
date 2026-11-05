import type { ReactNode } from 'react'

export function Modal({ titulo, color, cerrar, children }: { titulo: string; color?: string; cerrar: () => void; children: ReactNode }) {
  return (
    <div className="fondo-modal" onClick={cerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={titulo}>
        <div className="modal-cabeza" style={color ? { borderColor: color } : undefined}>
          {color && <span className="cuadro" style={{ background: color }} />}
          <h2>{titulo}</h2>
          <button className="cerrar" onClick={cerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="modal-cuerpo">{children}</div>
      </div>
    </div>
  )
}
