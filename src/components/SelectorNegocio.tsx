import type { Negocio } from '../types'

interface Props {
  negocios: Negocio[]
  onElegir: (negocio: Negocio) => void
}

export function SelectorNegocio({ negocios, onElegir }: Props) {
  if (negocios.length === 0) {
    return (
      <div className="vacio">
        <h2>Sin negocios asignados</h2>
        <p>Pedile al administrador que te agregue como miembro de un negocio.</p>
      </div>
    )
  }

  return (
    <div className="selector">
      <h2>Elegí el negocio</h2>
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
