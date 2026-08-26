import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Acciones que no son del día a día (editar, ajustar, borrar) detrás de un
 * botón, para que no queden al lado de las que se usan a cada rato.
 */
export function MenuAcciones({ children, etiqueta = 'Más acciones' }: { children: ReactNode; etiqueta?: string }) {
  const [abierto, setAbierto] = useState(false)
  const contenedor = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    function afuera(e: MouseEvent) {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false)
    }
    function escape(e: KeyboardEvent) {
      if (e.key === 'Escape') setAbierto(false)
    }
    document.addEventListener('mousedown', afuera)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', afuera)
      document.removeEventListener('keydown', escape)
    }
  }, [abierto])

  return (
    <div className="menu-acciones" ref={contenedor}>
      <button
        className="secundario icono"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label={etiqueta}
        title={etiqueta}
      >
        ⋯
      </button>
      {abierto && (
        <div className="menu-panel" onClick={() => setAbierto(false)}>
          {children}
        </div>
      )}
    </div>
  )
}
