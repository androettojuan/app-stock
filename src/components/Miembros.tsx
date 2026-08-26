import { useEffect, useState, type FormEvent } from 'react'
import { agregarMiembro, escucharMiembros, quitarMiembro } from '../data/admin'
import type { Miembro, Rol } from '../types'

interface Props {
  negocioId: string
  /** Email de quien está usando la app: no puede sacarse a sí mismo. */
  usuario: string
  /** El operador ve quiénes son los miembros, pero no los cambia. */
  puedeEditar?: boolean
}

export function Miembros({ negocioId, usuario, puedeEditar = true }: Props) {
  const [miembros, setMiembros] = useState<Miembro[]>([])
  const [email, setEmail] = useState('')
  const [rol, setRol] = useState<Rol>('operador')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(
    () => escucharMiembros(negocioId, setMiembros, () => setError('No se pudieron leer los miembros')),
    [negocioId],
  )

  async function agregar(e: FormEvent) {
    e.preventDefault()
    const limpio = email.trim().toLowerCase()
    if (!limpio.includes('@')) return setError('Poné el email de la cuenta de Google')
    // Volver a guardarse a sí mismo con otro rol es la forma fácil de quedarse
    // sin dueño en el negocio.
    if (limpio === usuario) return setError('Ya sos miembro de este negocio')
    setError('')
    setGuardando(true)
    try {
      await agregarMiembro(negocioId, { email: limpio, rol })
      setEmail('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo agregar')
    } finally {
      setGuardando(false)
    }
  }

  async function quitar(m: Miembro) {
    if (!confirm(`¿Sacar a ${m.email} de este negocio?`)) return
    try {
      await quitarMiembro(negocioId, m.email)
    } catch {
      setError('No se pudo sacar al miembro')
    }
  }

  return (
    <section>
      {puedeEditar && (
      <form className="barra" onSubmit={agregar}>
        <input
          type="email"
          placeholder="email de la cuenta de Google"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <select value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
          <option value="operador">operador</option>
          <option value="admin">admin</option>
        </select>
        <button type="submit" disabled={guardando}>Agregar</button>
      </form>
      )}

      {error && <p className="error">{error}</p>}

      <p className="dato">
        Quien figure acá entra con su cuenta de Google y ve este negocio. El rol
        «admin» además configura el negocio y maneja los accesos.
      </p>

      <table className="tabla-tarjetas">
        <thead>
          <tr>
            <th>Email</th>
            <th>Rol</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {miembros.map((m) => (
            <tr key={m.email}>
              <td className="celda-principal">
                <strong>{m.email}</strong>
                {m.email === usuario && <span className="tag">vos</span>}
              </td>
              <td data-label="Rol">{m.rol}</td>
              <td className="celda-acciones">
                <div className="acciones-fila">
                {puedeEditar && (
                  <button
                    className="secundario"
                    onClick={() => quitar(m)}
                    disabled={m.email === usuario}
                    title={m.email === usuario ? 'No podés sacarte a vos mismo' : undefined}
                  >
                    Sacar
                  </button>
                )}
                </div>
              </td>
            </tr>
          ))}
          {miembros.length === 0 && (
            <tr><td colSpan={3} className="vacio-fila">Todavía no hay miembros</td></tr>
          )}
        </tbody>
      </table>
    </section>
  )
}
