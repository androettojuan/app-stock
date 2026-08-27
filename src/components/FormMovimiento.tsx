import { useState, type FormEvent } from 'react'
import type { Producto } from '../types'
import type { AltaMovimiento } from '../data/movimientos'

interface Props {
  producto: Producto
  /** El tipo lo elige el botón de la lista. El ajuste se hace desde la ficha. */
  tipo: 'entrada' | 'salida'
  usuario: string
  onRegistrar: (mov: AltaMovimiento) => Promise<void>
  onCancelar: () => void
}

const TITULOS = {
  entrada: 'Entrada',
  salida: 'Retiro',
}

export function FormMovimiento({ producto, tipo, usuario, onRegistrar, onCancelar }: Props) {
  const [cantidad, setCantidad] = useState(0)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const stock = producto.stock ?? 0
  // Se avisa mientras escribe, sin esperar a que intente registrar.
  const excede = tipo === 'salida' && cantidad > stock

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (cantidad <= 0) return setError('La cantidad tiene que ser mayor a cero')
    if (tipo === 'salida' && cantidad > stock) return setError(`No hay tanto stock: quedan ${stock}`)
    setError('')
    setGuardando(true)
    try {
      await onRegistrar({
        productoId: producto.id,
        nombre: producto.nombre,
        tipo,
        cantidad,
        // El costo no se pregunta acá: se guarda el que tiene el producto, y si
        // hace falta cambiarlo se hace en su ficha.
        ...(tipo === 'entrada' && producto.costo ? { costo: producto.costo } : {}),
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
      <h3>{TITULOS[tipo]} — {producto.nombre}</h3>
      <p className="dato">Stock actual: <strong>{stock}</strong></p>
      <label>
        Cantidad
        <input
          type="number"
          step="any"
          min={0}
          value={cantidad}
          onChange={(e) => setCantidad(Number(e.target.value))}
          autoFocus
        />
      </label>
      {excede ? (
        <p className="error">No hay tanto stock: quedan {stock}.</p>
      ) : cantidad > 0 ? (
        <p className="dato">
          Queda en <strong>{tipo === 'entrada' ? stock + cantidad : stock - cantidad}</strong>.
        </p>
      ) : null}
      <label>
        Motivo
        <input
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder={tipo === 'salida' ? 'venta, rotura…' : 'opcional'}
        />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="acciones">
        <button type="submit" disabled={guardando || excede}>
          {guardando ? 'Registrando…' : 'Registrar'}
        </button>
        <button type="button" className="secundario" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  )
}
