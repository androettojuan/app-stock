import { useState, type FormEvent } from 'react'
import { formatearImporte } from '../formato'
import type { Producto } from '../types'

interface Props {
  producto: Producto
  /** Lo que acaba de entrar, que es el motivo por el que preguntamos. */
  cantidad: number
  onGuardar: (datos: { costo: number; precio: number }) => Promise<void>
  onCancelar: () => void
}

/**
 * Se ofrece después de una entrada grande: es cuando suele cambiar el costo de
 * reposición y conviene revisar el precio de venta.
 */
export function FormPrecios({ producto, cantidad, onGuardar, onCancelar }: Props) {
  const [costo, setCosto] = useState(producto.costo ?? 0)
  const [precio, setPrecio] = useState(producto.precio ?? 0)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const margen = costo > 0 && precio > 0 ? Math.round(((precio - costo) / costo) * 100) : null

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setGuardando(true)
    try {
      await onGuardar({ costo, precio })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar')
      setGuardando(false)
    }
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <h3>¿Actualizamos los precios?</h3>
      <p className="dato">
        Entraron {cantidad} de <strong>{producto.nombre}</strong>. Si esta compra
        vino a otro precio, es el momento de corregirlo.
      </p>
      <div className="fila">
        <label>
          Costo
          <input
            type="number"
            step="any"
            value={costo}
            onChange={(e) => setCosto(Number(e.target.value))}
            autoFocus
          />
        </label>
        <label>
          Precio de venta
          <input
            type="number"
            step="any"
            value={precio}
            onChange={(e) => setPrecio(Number(e.target.value))}
          />
        </label>
      </div>
      <p className="dato">
        {margen === null
          ? 'Cargá costo y precio para ver el margen.'
          : <>Margen: <strong>{margen}%</strong> · ganás {formatearImporte(precio - costo)} por unidad.</>}
      </p>
      {error && <p className="error">{error}</p>}
      <div className="acciones">
        <button type="submit" disabled={guardando}>Guardar precios</button>
        <button type="button" className="secundario" onClick={onCancelar}>Ahora no</button>
      </div>
    </form>
  )
}
