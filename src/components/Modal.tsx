import { useEffect, type ReactNode } from 'react'

export function Modal({ children, onCerrar }: { children: ReactNode; onCerrar: () => void }) {
  // Escape cierra cualquier diálogo, no solo los que tienen botón "Cancelar".
  useEffect(() => {
    function alTeclear(e: KeyboardEvent) {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [onCerrar])

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  )
}
