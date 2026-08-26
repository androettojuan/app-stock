import { useEffect, useRef, useState, type ReactNode } from 'react'

interface Props {
  email: string
  children: ReactNode
}

/**
 * Acciones del encabezado. En la computadora van en fila; en el teléfono no
 * entran, así que se pliegan detrás de un botón y se abren como panel.
 */
export function MenuUsuario({ email, children }: Props) {
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
    <div className="menu-usuario" ref={contenedor}>
      <button
        className="secundario icono solo-movil"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label="Menú"
      >
        ☰
      </button>
      {/* Elegir una opción cierra el menú: son todas acciones de una sola vez. */}
      <div
        className={`header-acciones ${abierto ? 'abierto' : ''}`}
        onClick={() => setAbierto(false)}
      >
        <span className="dato email">{email}</span>
        {children}
      </div>
    </div>
  )
}
