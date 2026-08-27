import { useEffect, useState, type FormEvent } from 'react'
import { configDe, guardarNegocio } from '../data/negocios'

import { ListaEditable } from './ListaEditable'
import { Miembros } from './Miembros'
import { Modal } from './Modal'
import type { ConfigNegocio, Negocio } from '../types'

interface Props {
  negocio: Negocio
  usuario: string
  /** Solo el dueño (rol admin) y el super admin pueden guardar cambios. */
  puedeEditar: boolean
  onVolver: () => void
  /** Deja en manos de quien nos usa la salida por otro camino (el ⚙ del encabezado). */
  registrarSalida?: (intentarSalir: () => void) => void
}

export function Configuracion({ negocio, usuario, puedeEditar, onVolver, registrarSalida }: Props) {
  const [nombre, setNombre] = useState(negocio.nombre)
  const [rubro, setRubro] = useState(negocio.rubro ?? '')
  const [config, setConfig] = useState<ConfigNegocio>(() => configDe(negocio))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [confirmandoSalida, setConfirmandoSalida] = useState(false)

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

  // Lo que hay en el formulario contra lo último guardado en el negocio.
  const guardado = configDe(negocio)
  const hayCambios =
    nombre.trim() !== negocio.nombre ||
    rubro.trim() !== (negocio.rubro ?? '') ||
    JSON.stringify(config) !== JSON.stringify(guardado)

  function intentarSalir() {
    if (hayCambios && puedeEditar) setConfirmandoSalida(true)
    else onVolver()
  }

  // El ⚙ del encabezado también saca de esta pantalla: que pase por el aviso.
  useEffect(() => {
    registrarSalida?.(intentarSalir)
  })

  async function guardarYSalir() {
    const ok = await guardarCambios()
    if (ok) onVolver()
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    await guardarCambios()
  }

  /** Devuelve si pudo guardar, para saber si conviene salir después. */
  async function guardarCambios() {
    if (!nombre.trim()) {
      setError('El negocio necesita un nombre')
      setConfirmandoSalida(false)
      return false
    }
    setError('')
    setAviso('')
    setGuardando(true)
    try {
      await guardarNegocio(negocio.id, {
        nombre: nombre.trim(),
        rubro: rubro.trim(),
        config: {
          ...config,
          minimoDefecto: Number.isFinite(config.minimoDefecto) ? config.minimoDefecto : 0,
        },
      })
      setAviso('Configuración guardada')
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar')
      setConfirmandoSalida(false)
      return false
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="config">
      <div className="config-encabezado">
        <h2>Configuración</h2>
        <button className="secundario" onClick={intentarSalir}>Volver al stock</button>
      </div>

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
        <p className="dato">Los productos nuevos arrancan con este mínimo.</p>

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
          titulo="Proveedores"
          ayuda="A quiénes les comprás. Se eligen al cargar un producto."
          valores={config.proveedores}
          onCambiar={(v) => campo('proveedores', v)}
          soloLectura={!puedeEditar}
          placeholder="nombre del proveedor"
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

      {confirmandoSalida && (
        <Modal onCerrar={() => setConfirmandoSalida(false)}>
          <div className="form">
            <h3>Tenés cambios sin guardar</h3>
            <p className="dato">
              Si salís ahora, la configuración del negocio queda como estaba.
            </p>
            <div className="acciones">
              <button onClick={guardarYSalir} disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar y salir'}
              </button>
              <button className="secundario peligro" onClick={onVolver}>Descartar cambios</button>
              <button className="secundario" onClick={() => setConfirmandoSalida(false)}>
                Seguir editando
              </button>
            </div>
          </div>
        </Modal>
      )}

      <div className="panel">
        <h3>Miembros y accesos</h3>
        <Miembros negocioId={negocio.id} usuario={usuario} puedeEditar={puedeEditar} />
      </div>
    </section>
  )
}
