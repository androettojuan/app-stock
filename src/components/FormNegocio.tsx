import { useState, type FormEvent } from 'react'
import type { Negocio } from '../types'

interface Props {
  negocio?: Negocio
  onGuardar: (datos: { nombre: string; rubro?: string }) => Promise<void>
  onCancelar: () => void
}

export function FormNegocio({ negocio, onGuardar, onCancelar }: Props) {
  const [nombre, setNombre] = useState(negocio?.nombre ?? '')
  const [rubro, setRubro] = useState(negocio?.rubro ?? '')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return setError('Poné un nombre')
    setError('')
    setGuardando(true)
    try {
      await onGuardar({ nombre: nombre.trim(), rubro: rubro.trim() })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar')
      setGuardando(false)
    }
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <h3>{negocio ? 'Editar negocio' : 'Nuevo negocio'}</h3>
      <label>
        Nombre
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
      </label>
      <label>
        Rubro
        <input
          value={rubro}
          onChange={(e) => setRubro(e.target.value)}
          placeholder="opcional: kiosco, ferretería…"
        />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="acciones">
        <button type="submit" disabled={guardando}>Guardar</button>
        <button type="button" className="secundario" onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  )
}
