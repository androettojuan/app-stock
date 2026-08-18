import type { Movimiento } from '../types'

export function Movimientos({ movimientos }: { movimientos: Movimiento[] }) {
  if (movimientos.length === 0) {
    return <p className="dato">Todavía no hay movimientos registrados.</p>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Producto</th>
          <th>Tipo</th>
          <th className="num">Cantidad</th>
          <th>Motivo</th>
          <th>Usuario</th>
        </tr>
      </thead>
      <tbody>
        {movimientos.map((m) => (
          <tr key={m.id}>
            <td>{m.fecha}</td>
            <td>{m.nombre}</td>
            <td><span className={`tag ${m.tipo}`}>{m.tipo}</span></td>
            <td className={`num ${m.cantidad < 0 || m.tipo === 'salida' ? 'negativo' : ''}`}>
              {m.tipo === 'salida' ? `-${m.cantidad}` : m.cantidad}
            </td>
            <td>{m.motivo ?? ''}</td>
            <td>{m.usuario}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
