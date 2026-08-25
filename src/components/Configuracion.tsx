import { useEffect, useState, type FormEvent } from 'react'
import { configDe, guardarNegocio } from '../data/negocios'
import { MONEDAS, formatearImporte } from '../formato'
import { ListaEditable } from './ListaEditable'
import { Miembros } from './Miembros'
import type { ConfigNegocio, Negocio } from '../types'

interface Props {
  negocio: Negocio
  usuario: string
  /** Solo el dueño (rol admin) y el super admin pueden guardar cambios. */
  puedeEditar: boolean
}

export function Configuracion({ negocio, usuario, puedeEditar }: Props) {
  const [nombre, setNombre] = useState(negocio.nombre)
  const [rubro, setRubro] = useState(negocio.rubro ?? '')
  const [config, setConfig] = useState<ConfigNegocio>(() => configDe(negocio))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')

  // Al pasar a otro negocio el formulario arranca con los datos de ese negocio.
  // Depende del id y no del objeto a propósito: el negocio se escucha en vivo y
  // resincronizar en cada snapshot pisaría lo que se está escribiendo.
  const id = negocio.id
  useEffect(() => {
    setNombre(negocio.nombre)
    setRubro(negocio.rubro ?? '')
    setConfig(configDe(negocio))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function campo<K extends keyof ConfigNegocio>(k: K, v: ConfigNegocio[K]) {
    setConfig((c) => ({ ...c, [k]: v }))
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return setError('El negocio necesita un nombre')
    setError('')
    setAviso('')
    setGuardando(true)
    try {
      await guardarNegocio(negocio.id, {
        nombre: nombre.trim(),
        rubro: rubro.trim(),
        config: {
          ...config,
          unidadDefecto: config.unidadDefecto.trim() || 'u',
          minimoDefecto: Number.isFinite(config.minimoDefecto) ? config.minimoDefecto : 0,
        },
      })
      setAviso('Configuración guardada')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="config">
      {!puedeEditar && (
        <p className="dato">
          Estás viendo la configuración del negocio. Para cambiarla hace falta ser el dueño.
        </p>
      )}

      <form className="form panel" onSubmit={guardar}>
        <h3>Datos del negocio</h3>
        <div className="fila">
          <label>
            Nombre
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={!puedeEditar} />
          </label>
          <label>
            Rubro
            <input
              value={rubro}
              onChange={(e) => setRubro(e.target.value)}
              placeholder="kiosco, ferretería…"
              disabled={!puedeEditar}
            />
          </label>
        </div>

        <h3>Valores por defecto</h3>
        <div className="fila">
          <label>
            Moneda
            <select
              value={config.moneda}
              onChange={(e) => campo('moneda', e.target.value)}
              disabled={!puedeEditar}
            >
              {MONEDAS.map((m) => (
                <option key={m.codigo} value={m.codigo}>{m.nombre} ({m.codigo})</option>
              ))}
            </select>
          </label>
          <label>
            Unidad por defecto
            <input
              value={config.unidadDefecto}
              onChange={(e) => campo('unidadDefecto', e.target.value)}
              disabled={!puedeEditar}
            />
          </label>
          <label>
            Mínimo por defecto
            <input
              type="number"
              step="any"
              value={config.minimoDefecto}
              onChange={(e) => campo('minimoDefecto', Number(e.target.value))}
              disabled={!puedeEditar}
            />
          </label>
        </div>
        <p className="dato">
          Así se van a ver los importes: <strong>{formatearImporte(1234.5, config.moneda)}</strong>.
          Los productos nuevos arrancan con unidad «{config.unidadDefecto || 'u'}» y mínimo{' '}
          {config.minimoDefecto}.
        </p>

        <h3>Listas para cargar productos</h3>
        <ListaEditable
          titulo="Categorías"
          ayuda="Aparecen como sugerencia al cargar un producto."
          valores={config.categorias}
          onCambiar={(v) => campo('categorias', v)}
          soloLectura={!puedeEditar}
          placeholder="bebidas, limpieza…"
        />
        <ListaEditable
          titulo="Unidades"
          ayuda="Cómo se mide cada producto: unidades, kilos, litros…"
          valores={config.unidades}
          onCambiar={(v) => campo('unidades', v)}
          soloLectura={!puedeEditar}
          placeholder="kg, l, caja…"
        />

        {error && <p className="error">{error}</p>}
        {aviso && <p className="aviso">{aviso}</p>}
        {puedeEditar && (
          <div className="acciones">
            <button type="submit" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        )}
      </form>

      <div className="panel">
        <h3>Miembros y accesos</h3>
        <Miembros negocioId={negocio.id} usuario={usuario} puedeEditar={puedeEditar} />
      </div>
    </section>
  )
}
