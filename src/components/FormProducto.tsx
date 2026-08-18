import { useState, type FormEvent } from 'react'
import type { Producto, ProductoNuevo } from '../types'

interface Props {
  producto?: Producto
  onGuardar: (datos: ProductoNuevo) => Promise<void>
  onCancelar: () => void
}

const vacio: ProductoNuevo = {
  nombre: '',
  sku: '',
  categoria: '',
  unidad: 'u',
  stock: 0,
  minimo: 0,
  costo: 0,
  precio: 0,
  activo: true,
}

export function FormProducto({ producto, onGuardar, onCancelar }: Props) {
  const [datos, setDatos] = useState<ProductoNuevo>(() =>
    producto ? { ...producto } : { ...vacio },
  )
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  function campo<K extends keyof ProductoNuevo>(k: K, v: ProductoNuevo[K]) {
    setDatos((d) => ({ ...d, [k]: v }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!datos.nombre.trim()) return setError('Poné un nombre')
    setError('')
    setGuardando(true)
    try {
      await onGuardar({ ...datos, nombre: datos.nombre.trim() })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar')
      setGuardando(false)
    }
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <h3>{producto ? 'Editar producto' : 'Nuevo producto'}</h3>
      <label>
        Nombre
        <input value={datos.nombre} onChange={(e) => campo('nombre', e.target.value)} autoFocus />
      </label>
      <div className="fila">
        <label>
          SKU
          <input value={datos.sku ?? ''} onChange={(e) => campo('sku', e.target.value)} />
        </label>
        <label>
          Categoría
          <input value={datos.categoria ?? ''} onChange={(e) => campo('categoria', e.target.value)} />
        </label>
        <label>
          Unidad
          <input value={datos.unidad} onChange={(e) => campo('unidad', e.target.value)} />
        </label>
      </div>
      <div className="fila">
        {!producto && (
          <label>
            Stock inicial
            <input
              type="number"
              step="any"
              value={datos.stock}
              onChange={(e) => campo('stock', Number(e.target.value))}
            />
          </label>
        )}
        <label>
          Mínimo
          <input
            type="number"
            step="any"
            value={datos.minimo}
            onChange={(e) => campo('minimo', Number(e.target.value))}
          />
        </label>
        <label>
          Costo
          <input
            type="number"
            step="any"
            value={datos.costo}
            onChange={(e) => campo('costo', Number(e.target.value))}
          />
        </label>
        <label>
          Precio
          <input
            type="number"
            step="any"
            value={datos.precio}
            onChange={(e) => campo('precio', Number(e.target.value))}
          />
        </label>
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={datos.activo}
          onChange={(e) => campo('activo', e.target.checked)}
        />
        Activo
      </label>
      {error && <p className="error">{error}</p>}
      <div className="acciones">
        <button type="submit" disabled={guardando}>Guardar</button>
        <button type="button" className="secundario" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  )
}
