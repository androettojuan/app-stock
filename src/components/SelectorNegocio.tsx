import type { Negocio } from '../types'

interface Props {
  negocios: Negocio[]
  onElegir: (negocio: Negocio) => void
  /** Solo el super admin puede dar de alta negocios. */
  puedeCrear?: boolean
  onCrear?: () => void
}

export function SelectorNegocio({ negocios, onElegir, puedeCrear, onCrear }: Props) {
  if (negocios.length === 0) {
    return (
      <div className="vacio">
        <h2>Sin negocios asignados</h2>
        {puedeCrear ? (
          <>
            <p>Creá el primero para empezar a cargar productos.</p>
            <button onClick={onCrear}>Agregar negocio</button>
          </>
        ) : (
          <p>Pedile al administrador que te agregue como miembro de un negocio.</p>
        )}
      </div>
    )
  }

  return (
    <div className="selector">
      <div className="selector-titulo">
        <h2>Elegí el negocio</h2>
        {puedeCrear && <button onClick={onCrear}>Agregar negocio</button>}
      </div>
      <ul>
        {negocios.map((n) => (
          <li key={n.id}>
            <button onClick={() => onElegir(n)}>
              <strong>{n.nombre}</strong>
              {n.rubro && <span>{n.rubro}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
