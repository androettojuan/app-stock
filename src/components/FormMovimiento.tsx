import { useState, type FormEvent } from 'react'
import type { Producto, TipoMovimiento } from '../types'
import type { AltaMovimiento } from '../data/movimientos'

interface Props {
  producto: Producto
  /** Código de moneda del negocio, para mostrar el costo con su símbolo. */
  moneda: string
  usuario: string
  onRegistrar: (mov: AltaMovimiento) => Promise<void>
  onCancelar: () => void
}

export function FormMovimiento({ producto, moneda, usuario, onRegistrar, onCancelar }: Props) {
  const [tipo, setTipo] = useState<TipoMovimiento>('entrada')
  const [cantidad, setCantidad] = useState(0)
  const [costo, setCosto] = useState(producto.costo)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (tipo !== 'ajuste' && cantidad <= 0) return setError('La cantidad tiene que ser mayor a cero')
    setError('')
    setGuardando(true)
    try {
      await onRegistrar({
        productoId: producto.id,
        nombre: producto.nombre,
        tipo,
        cantidad,
        ...(tipo === 'entrada' ? { costo } : {}),
        ...(motivo.trim() ? { motivo: motivo.trim() } : {}),
        usuario,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar')
      setGuardando(false)
    }
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <h3>Movimiento — {producto.nombre}</h3>
      <p className="dato">Stock actual: <strong>{producto.stock} {producto.unidad}</strong></p>
      <div className="tabs">
        {(['entrada', 'salida', 'ajuste'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={tipo === t ? 'activo' : ''}
            onClick={() => setTipo(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <label>
        {tipo === 'ajuste' ? 'Stock real contado' : 'Cantidad'}
        <input
          type="number"
          step="any"
          value={cantidad}
          onChange={(e) => setCantidad(Number(e.target.value))}
          autoFocus
        />
      </label>
      {tipo === 'entrada' && (
        <label>
          Costo unitario ({moneda})
          <input type="number" step="any" value={costo} onChange={(e) => setCosto(Number(e.target.value))} />
        </label>
      )}
      <label>
        Motivo
        <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="opcional" />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="acciones">
        <button type="submit" disabled={guardando}>Registrar</button>
        <button type="button" className="secundario" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  )
}
