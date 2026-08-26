import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import type { ConfigNegocio, Producto, ProductoNuevo } from '../types'
import { useEsMovil } from '../hooks/useEsMovil'

/** Qué hacer con la foto al guardar: dejarla como está, cambiarla o sacarla. */
export type CambioFoto = { archivo?: File; quitar?: boolean }

interface Props {
  producto?: Producto
  config: ConfigNegocio
  onGuardar: (datos: ProductoNuevo, foto: CambioFoto) => Promise<void>
  onCancelar: () => void
}

/** Producto en blanco, con lo que haya configurado el negocio. */
function vacio(config: ConfigNegocio): ProductoNuevo {
  return {
    nombre: '',
    sku: '',
    categoria: '',
    unidad: config.unidadDefecto,
    stock: 0,
    minimo: config.minimoDefecto,
    costo: 0,
    precio: 0,
    activo: true,
  }
}

export function FormProducto({ producto, config, onGuardar, onCancelar }: Props) {
  const [datos, setDatos] = useState<ProductoNuevo>(() =>
    producto ? { ...producto } : vacio(config),
  )
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [archivo, setArchivo] = useState<File>()
  const [quitarFoto, setQuitarFoto] = useState(false)
  const inputFoto = useRef<HTMLInputElement>(null)
  const inputCamara = useRef<HTMLInputElement>(null)
  // La cámara se ofrece en el teléfono: en la computadora `capture` no hace
  // nada y el botón terminaría abriendo el explorador de archivos igual.
  const esMovil = useEsMovil()

  // Vista previa de la foto recién elegida, que todavía no está subida. La URL
  // se crea al elegir el archivo y se libera al reemplazarla o al cerrar.
  const [previa, setPrevia] = useState<string>()
  useEffect(() => () => { if (previa) URL.revokeObjectURL(previa) }, [previa])

  const fotoActual = quitarFoto ? undefined : (previa ?? producto?.foto)

  function elegirFoto(e: ChangeEvent<HTMLInputElement>) {
    const elegido = e.target.files?.[0]
    if (!elegido) return
    if (!elegido.type.startsWith('image/')) return setError('El archivo tiene que ser una imagen')
    setError('')
    setArchivo(elegido)
    setPrevia(URL.createObjectURL(elegido))
    setQuitarFoto(false)
  }

  function quitar() {
    setArchivo(undefined)
    setPrevia(undefined)
    setQuitarFoto(true)
    for (const input of [inputFoto, inputCamara]) {
      if (input.current) input.current.value = ''
    }
  }

  function campo<K extends keyof ProductoNuevo>(k: K, v: ProductoNuevo[K]) {
    setDatos((d) => ({ ...d, [k]: v }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!datos.nombre.trim()) return setError('Poné un nombre')
    setError('')
    setGuardando(true)
    try {
      await onGuardar({ ...datos, nombre: datos.nombre.trim() }, { archivo, quitar: quitarFoto })
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

      <div className="campo-foto">
        {fotoActual
          ? <img className="foto-previa" src={fotoActual} alt={datos.nombre || 'Foto del producto'} />
          : <div className="foto-previa vacia" aria-hidden="true">Sin foto</div>}
        <div className="campo-foto-acciones">
          {esMovil && (
            <>
              <input
                ref={inputCamara}
                type="file"
                accept="image/*"
                capture="environment"
                id="camara-producto"
                className="oculto"
                onChange={elegirFoto}
              />
              <label className="boton-archivo" htmlFor="camara-producto">
                Sacar foto
              </label>
            </>
          )}
          <input
            ref={inputFoto}
            type="file"
            accept="image/*"
            id="foto-producto"
            className="oculto"
            onChange={elegirFoto}
          />
          <label className={`boton-archivo ${esMovil ? 'secundario' : ''}`} htmlFor="foto-producto">
            {esMovil
              ? (fotoActual ? 'Elegir otra de la galería' : 'Elegir de la galería')
              : (fotoActual ? 'Cambiar foto' : 'Elegir foto')}
          </label>
          {fotoActual && (
            <button type="button" className="secundario" onClick={quitar}>Quitar foto</button>
          )}
          <span className="dato">Se achica sola antes de subirla.</span>
        </div>
      </div>
      <div className="fila">
        <label>
          SKU
          <input value={datos.sku ?? ''} onChange={(e) => campo('sku', e.target.value)} />
        </label>
        <label>
          Categoría
          <input
            value={datos.categoria ?? ''}
            onChange={(e) => campo('categoria', e.target.value)}
            list="categorias-negocio"
          />
          <datalist id="categorias-negocio">
            {config.categorias.map((c) => <option key={c} value={c} />)}
          </datalist>
        </label>
        <label>
          Unidad
          <input
            value={datos.unidad}
            onChange={(e) => campo('unidad', e.target.value)}
            list="unidades-negocio"
          />
          <datalist id="unidades-negocio">
            {config.unidades.map((u) => <option key={u} value={u} />)}
          </datalist>
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
