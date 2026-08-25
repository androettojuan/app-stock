import type { Movimiento } from '../types'

export function Movimientos({ movimientos }: { movimientos: Movimiento[] }) {
  if (movimientos.length === 0) {
    return <p className="dato">Todavía no hay movimientos registrados.</p>
  }

  return (
    <table className="tabla-tarjetas">
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
            <td data-label="Fecha">{m.fecha}</td>
            <td className="celda-principal" data-label="Producto">{m.nombre}</td>
            <td data-label="Tipo"><span className={`tag ${m.tipo}`}>{m.tipo}</span></td>
            <td
              className={`num ${m.cantidad < 0 || m.tipo === 'salida' ? 'negativo' : ''}`}
              data-label="Cantidad"
            >
              {m.tipo === 'salida' ? `-${m.cantidad}` : m.cantidad}
            </td>
            <td data-label="Motivo">{m.motivo ?? ''}</td>
            <td data-label="Usuario">{m.usuario}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
